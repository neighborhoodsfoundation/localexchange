/**
 * Escrow Service
 * 
 * Handles escrow account management, release conditions,
 * and trade security for the LocalEx platform.
 */

import {
  EscrowAccount,
  EscrowStatus,
  EscrowReleaseCondition,
  EscrowConditionType,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
  ReleaseEscrowRequest,
  ReleaseEscrowResponse,
  RefundEscrowRequest,
  RefundEscrowResponse,
  TransactionType
} from './credits.types';
import { createTransaction } from './transactionService';
import { calculateFees, DEFAULT_FEE_STRUCTURE } from './feeCalculationService';

// ============================================================================
// ESCROW CONFIGURATION
// ============================================================================

export const ESCROW_CONFIG = {
  autoReleaseDays: 7, // Automatic release after 7 days
  disputeHoldDays: 14, // Hold for 14 days during disputes
  minimumEscrowAmount: 100, // $1.00 minimum
  maximumEscrowAmount: 1000000, // $10,000.00 maximum
  checkIntervalHours: 1 // Check release conditions every hour
};

// ============================================================================
// ESCROW ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Create and fund an escrow account for a trade
 */
export const createEscrowAccount = async (request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> => {
  try {
    // Validate escrow request
    const validationErrors = validateEscrowRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors[0] || 'Validation failed'
      };
    }

    // Calculate fees
    const feeCalculation = calculateFees(request.amount, DEFAULT_FEE_STRUCTURE);

    // Create escrow account
    const escrowAccount: EscrowAccount = {
      id: generateEscrowId(),
      tradeId: request.tradeId,
      buyerAccountId: request.buyerId,
      sellerAccountId: request.sellerId,
      amount: request.amount,
      platformFee: feeCalculation.calculatedFee,
      status: EscrowStatus.PENDING,
      releaseConditions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create release conditions
    const releaseConditions = createReleaseConditions(escrowAccount.id);
    escrowAccount.releaseConditions = releaseConditions;

    // Process payment transaction
    const paymentTransaction = await createTransaction({
      transactionType: TransactionType.TRADE_PAYMENT,
      amount: request.amount,
      fromAccountId: request.buyerId,
      toAccountId: escrowAccount.id, // Escrow account ID
      description: `Trade Payment: ${request.description}`,
      referenceId: request.tradeId,
      idempotencyKey: request.idempotencyKey,
      metadata: {
        tradeId: request.tradeId,
        escrowId: escrowAccount.id,
        platformFee: feeCalculation.calculatedFee
      }
    });

    if (!paymentTransaction.success) {
      return {
        success: false,
        error: paymentTransaction.error || 'Payment transaction failed'
      };
    }

    // Process fee collection
    const feeTransaction = await createTransaction({
      transactionType: TransactionType.FEE_COLLECTION,
      amount: feeCalculation.calculatedFee,
      fromAccountId: request.buyerId,
      toAccountId: 'platform_fees_account', // Platform fees account
      description: `Platform Fee: ${feeCalculation.breakdown.totalFee} cents`,
      referenceId: request.tradeId,
      idempotencyKey: `${request.idempotencyKey}_fee`,
      metadata: {
        tradeId: request.tradeId,
        escrowId: escrowAccount.id,
        feeBreakdown: feeCalculation.breakdown
      }
    });

    if (!feeTransaction.success) {
      // If fee collection fails, we should refund the payment
      await refundEscrowAccount(escrowAccount.id, 'Fee collection failed');
      return {
        success: false,
        error: `Payment processed but fee collection failed: ${feeTransaction.error || 'Unknown error'}`
      };
    }

    // Update escrow status to funded
    escrowAccount.status = EscrowStatus.FUNDED;
    escrowAccount.updatedAt = new Date();

    // Store escrow account
    await storeEscrowAccount(escrowAccount);

    return {
      success: true,
      escrowAccount,
      transaction: paymentTransaction.transaction!,
      feeCalculation
    };

  } catch (error) {
    console.error('Error creating escrow account:', error);
    return {
      success: false,
      error: 'Failed to create escrow account'
    };
  }
};

/**
 * Release escrow funds to seller
 */
export const releaseEscrow = async (request: ReleaseEscrowRequest): Promise<ReleaseEscrowResponse> => {
  try {
    // Get escrow account
    const escrowAccount = await getEscrowAccount(request.escrowId);
    if (!escrowAccount) {
      return {
        success: false,
        error: 'Escrow account not found'
      };
    }

    // Validate release request
    const validationErrors = validateReleaseRequest(escrowAccount, request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors[0] || 'Validation failed'
      };
    }

    // Check if all release conditions are met
    const conditionsMet = await checkReleaseConditions(escrowAccount.id);
    if (!conditionsMet && request.releaseType !== 'MANUAL') {
      return {
        success: false,
        error: 'Release conditions not met'
      };
    }

    // Process escrow release transaction
    const releaseTransaction = await createTransaction({
      transactionType: TransactionType.ESCROW_RELEASE,
      amount: escrowAccount.amount,
      fromAccountId: escrowAccount.id,
      toAccountId: escrowAccount.sellerAccountId,
      description: `Escrow Release: ${request.reason || 'Trade completed'}`,
      referenceId: escrowAccount.tradeId,
      idempotencyKey: `release_${escrowAccount.id}_${Date.now()}`,
      metadata: {
        escrowId: escrowAccount.id,
        tradeId: escrowAccount.tradeId,
        releaseType: request.releaseType,
        releasedBy: request.releasedBy,
        reason: request.reason
      }
    });

    if (!releaseTransaction.success) {
      return {
        success: false,
        error: releaseTransaction.error || 'Release transaction failed'
      };
    }

    // Update escrow status
    escrowAccount.status = EscrowStatus.RELEASED;
    escrowAccount.releasedAt = new Date();
    escrowAccount.updatedAt = new Date();

    // Update release conditions
    await updateReleaseConditions(escrowAccount.id, request.releaseType, request.releasedBy);

    // Store updated escrow account
    await storeEscrowAccount(escrowAccount);

    return {
      success: true,
      escrowAccount,
      transactions: [releaseTransaction.transaction!]
    };

  } catch (error) {
    console.error('Error releasing escrow:', error);
    return {
      success: false,
      error: 'Failed to release escrow'
    };
  }
};

/**
 * Refund escrow funds to buyer
 */
export const refundEscrow = async (request: RefundEscrowRequest): Promise<RefundEscrowResponse> => {
  try {
    // Get escrow account
    const escrowAccount = await getEscrowAccount(request.escrowId);
    if (!escrowAccount) {
      return {
        success: false,
        error: 'Escrow account not found'
      };
    }

    // Validate refund request
    const validationErrors = validateRefundRequest(escrowAccount, request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors[0] || 'Validation failed'
      };
    }

    // Calculate refund amount
    const refundAmount = request.refundType === 'FULL' 
      ? escrowAccount.amount 
      : request.refundAmount || escrowAccount.amount;

    if (refundAmount > escrowAccount.amount) {
      return {
        success: false,
        error: 'Refund amount cannot exceed escrow amount'
      };
    }

    // Process escrow refund transaction
    const refundTransaction = await createTransaction({
      transactionType: TransactionType.ESCROW_REFUND,
      amount: refundAmount,
      fromAccountId: escrowAccount.id,
      toAccountId: escrowAccount.buyerAccountId,
      description: `Escrow Refund: ${request.reason}`,
      referenceId: escrowAccount.tradeId,
      idempotencyKey: `refund_${escrowAccount.id}_${Date.now()}`,
      metadata: {
        escrowId: escrowAccount.id,
        tradeId: escrowAccount.tradeId,
        refundType: request.refundType,
        refundAmount,
        refundedBy: request.refundedBy,
        reason: request.reason
      }
    });

    if (!refundTransaction.success) {
      return {
        success: false,
        error: refundTransaction.error || 'Refund transaction failed'
      };
    }

    // Update escrow status
    escrowAccount.status = EscrowStatus.REFUNDED;
    escrowAccount.refundedAt = new Date();
    escrowAccount.updatedAt = new Date();

    // Store updated escrow account
    await storeEscrowAccount(escrowAccount);

    return {
      success: true,
      escrowAccount,
      transactions: [refundTransaction.transaction!]
    };

  } catch (error) {
    console.error('Error refunding escrow:', error);
    return {
      success: false,
      error: 'Failed to refund escrow'
    };
  }
};

// ============================================================================
// RELEASE CONDITIONS MANAGEMENT
// ============================================================================

/**
 * Create release conditions for an escrow account
 */
const createReleaseConditions = (escrowId: string): EscrowReleaseCondition[] => {
  const now = new Date();
  const autoReleaseDate = new Date(now.getTime() + (ESCROW_CONFIG.autoReleaseDays * 24 * 60 * 60 * 1000));

  return [
    {
      id: generateConditionId(),
      escrowId,
      conditionType: EscrowConditionType.BUYER_CONFIRMATION,
      isMet: false,
      createdAt: now
    },
    {
      id: generateConditionId(),
      escrowId,
      conditionType: EscrowConditionType.SELLER_CONFIRMATION,
      isMet: false,
      createdAt: now
    },
    {
      id: generateConditionId(),
      escrowId,
      conditionType: EscrowConditionType.TIME_ELAPSED,
      isMet: false,
      metadata: { autoReleaseDate: autoReleaseDate.toISOString() },
      createdAt: now
    }
  ];
};

/**
 * Check if all release conditions are met
 */
const checkReleaseConditions = async (escrowId: string): Promise<boolean> => {
  const conditions = await getReleaseConditions(escrowId);
  
  // Check if all non-time-based conditions are met
  const nonTimeConditions = conditions.filter(c => c.conditionType !== EscrowConditionType.TIME_ELAPSED);
  const allNonTimeMet = nonTimeConditions.every(c => c.isMet);
  
  // Check if time condition is met
  const timeCondition = conditions.find(c => c.conditionType === EscrowConditionType.TIME_ELAPSED);
  const timeMet = timeCondition ? await checkTimeCondition(timeCondition) : false;
  
  return allNonTimeMet || timeMet;
};

/**
 * Check if time-based release condition is met
 */
const checkTimeCondition = async (condition: EscrowReleaseCondition): Promise<boolean> => {
  if (condition.isMet) return true;
  
  const autoReleaseDate = new Date(condition.metadata?.['autoReleaseDate'] || 0);
  const now = new Date();
  
  if (now >= autoReleaseDate) {
    // Mark condition as met
    condition.isMet = true;
    condition.metAt = now;
    await updateReleaseCondition(condition);
    return true;
  }
  
  return false;
};

/**
 * Update release conditions based on user action
 */
const updateReleaseConditions = async (escrowId: string, _releaseType: string, releasedBy: string): Promise<void> => {
  const conditions = await getReleaseConditions(escrowId);
  
  for (const condition of conditions) {
    if (condition.conditionType === EscrowConditionType.BUYER_CONFIRMATION && releasedBy.includes('buyer')) {
      condition.isMet = true;
      condition.metAt = new Date();
      await updateReleaseCondition(condition);
    } else if (condition.conditionType === EscrowConditionType.SELLER_CONFIRMATION && releasedBy.includes('seller')) {
      condition.isMet = true;
      condition.metAt = new Date();
      await updateReleaseCondition(condition);
    }
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate escrow request
 */
const validateEscrowRequest = (request: ProcessPaymentRequest): string[] => {
  const errors: string[] = [];

  if (request.amount < ESCROW_CONFIG.minimumEscrowAmount) {
    errors.push(`Escrow amount must be at least $${ESCROW_CONFIG.minimumEscrowAmount / 100}`);
  }

  if (request.amount > ESCROW_CONFIG.maximumEscrowAmount) {
    errors.push(`Escrow amount cannot exceed $${ESCROW_CONFIG.maximumEscrowAmount / 100}`);
  }

  if (!request.tradeId || request.tradeId.trim() === '') {
    errors.push('Trade ID is required');
  }

  if (!request.buyerId || request.buyerId.trim() === '') {
    errors.push('Buyer ID is required');
  }

  if (!request.sellerId || request.sellerId.trim() === '') {
    errors.push('Seller ID is required');
  }

  return errors;
};

/**
 * Validate release request
 */
const validateReleaseRequest = (escrowAccount: EscrowAccount, _request: ReleaseEscrowRequest): string[] => {
  const errors: string[] = [];

  if (escrowAccount.status !== EscrowStatus.FUNDED) {
    errors.push('Escrow account is not funded');
  }

  if (escrowAccount.status === EscrowStatus.RELEASED) {
    errors.push('Escrow has already been released');
  }

  if (escrowAccount.status === EscrowStatus.REFUNDED) {
    errors.push('Escrow has already been refunded');
  }

  return errors;
};

/**
 * Validate refund request
 */
const validateRefundRequest = (escrowAccount: EscrowAccount, request: RefundEscrowRequest): string[] => {
  const errors: string[] = [];

  if (escrowAccount.status !== EscrowStatus.FUNDED && escrowAccount.status !== EscrowStatus.DISPUTED) {
    errors.push('Escrow account is not in a refundable state');
  }

  if (escrowAccount.status === EscrowStatus.RELEASED) {
    errors.push('Cannot refund released escrow');
  }

  if (escrowAccount.status === EscrowStatus.REFUNDED) {
    errors.push('Escrow has already been refunded');
  }

  if (request.refundType === 'PARTIAL' && (!request.refundAmount || request.refundAmount <= 0)) {
    errors.push('Partial refund amount must be specified and positive');
  }

  return errors;
};

// ============================================================================
// DATABASE OPERATIONS (MOCK IMPLEMENTATIONS)
// ============================================================================

/**
 * Get escrow account by ID
 */
const getEscrowAccount = async (_escrowId: string): Promise<EscrowAccount | null> => {
  // TODO: Implement database query
  // SELECT * FROM escrow_accounts WHERE id = $1
  return null;
};

/**
 * Store escrow account
 */
const storeEscrowAccount = async (_escrowAccount: EscrowAccount): Promise<void> => {
  // TODO: Implement database insert/update
  // INSERT INTO escrow_accounts (...) ON CONFLICT (id) DO UPDATE SET ...
};

/**
 * Get release conditions for escrow
 */
const getReleaseConditions = async (_escrowId: string): Promise<EscrowReleaseCondition[]> => {
  // TODO: Implement database query
  // SELECT * FROM escrow_release_conditions WHERE escrow_id = $1
  return [];
};

/**
 * Update release condition
 */
const updateReleaseCondition = async (_condition: EscrowReleaseCondition): Promise<void> => {
  // TODO: Implement database update
  // UPDATE escrow_release_conditions SET ... WHERE id = $1
};

/**
 * Refund escrow account (internal helper)
 */
const refundEscrowAccount = async (_escrowId: string, _reason: string): Promise<void> => {
  // TODO: Implement automatic refund logic
  console.log(`Refunding escrow ${_escrowId}: ${_reason}`);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique escrow ID
 */
const generateEscrowId = (): string => {
  return `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique condition ID
 */
const generateConditionId = (): string => {
  return `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// EXPORTS
// ============================================================================

// All functions and constants are already exported individually above
