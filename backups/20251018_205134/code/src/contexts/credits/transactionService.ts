/**
 * Transaction Service
 * 
 * Handles all transaction processing with double-entry ledger system,
 * including idempotency, validation, and audit trails.
 */

import { 
  Transaction, 
  LedgerEntry, 
  CreditsAccount,
  TransactionType, 
  TransactionStatus,
  LedgerEntryType,
  CreateTransactionRequest,
  CreateTransactionResponse,
  TransferCreditsRequest,
  TransferCreditsResponse
} from './credits.types';

// ============================================================================
// TRANSACTION PROCESSING
// ============================================================================

/**
 * Create a new transaction with double-entry ledger
 */
export const createTransaction = async (request: CreateTransactionRequest): Promise<CreateTransactionResponse> => {
  try {
    // Validate transaction request
    const validationErrors = validateTransactionRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors[0] || 'Validation failed'
      };
    }

    // Check for idempotency
    const existingTransaction = await checkIdempotency(request.idempotencyKey);
    if (existingTransaction) {
      return {
        success: true,
        transaction: existingTransaction
      };
    }

    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      transactionType: request.transactionType,
      status: TransactionStatus.PENDING,
      amount: request.amount,
      fromAccountId: request.fromAccountId || '',
      toAccountId: request.toAccountId || '',
      description: request.description,
      referenceId: request.referenceId || '',
      idempotencyKey: request.idempotencyKey,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Process transaction based on type
    const result = await processTransactionByType(transaction);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Transaction processing failed'
      };
    }

    // Update transaction status
    transaction.status = TransactionStatus.COMPLETED;
    transaction.processedAt = new Date();
    transaction.updatedAt = new Date();

    // Store transaction and ledger entries
    await storeTransaction(transaction);
    if (result.ledgerEntries) {
      await storeLedgerEntries(result.ledgerEntries);
    }

    return {
      success: true,
      transaction
    };

  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: 'Failed to create transaction'
    };
  }
};

/**
 * Transfer credits between accounts
 */
export const transferCredits = async (request: TransferCreditsRequest): Promise<TransferCreditsResponse> => {
  try {
    // Validate transfer request
    const validationErrors = validateTransferRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors[0] || 'Validation failed'
      };
    }

    // Check account balances
    const fromAccount = await getAccount(request.fromAccountId);
    if (!fromAccount) {
      return {
        success: false,
        error: 'Source account not found'
      };
    }

    if (fromAccount.availableBalance < request.amount) {
      return {
        success: false,
        error: 'Insufficient funds'
      };
    }

    // Check destination account
    const toAccount = await getAccount(request.toAccountId);
    if (!toAccount) {
      return {
        success: false,
        error: 'Destination account not found'
      };
    }

    // Create transfer transaction
    const transferRequest: CreateTransactionRequest = {
      transactionType: TransactionType.TRADE_PAYMENT,
      amount: request.amount,
      fromAccountId: request.fromAccountId,
      toAccountId: request.toAccountId,
      description: request.description,
      idempotencyKey: request.idempotencyKey,
      metadata: request.metadata || {}
    };

    const result = await createTransaction(transferRequest);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Transfer failed'
      };
    }

    return {
      success: true,
      transaction: result.transaction!
    };

  } catch (error) {
    console.error('Error transferring credits:', error);
    return {
      success: false,
      error: 'Failed to transfer credits'
    };
  }
};

// ============================================================================
// TRANSACTION PROCESSING BY TYPE
// ============================================================================

/**
 * Process transaction based on its type
 */
const processTransactionByType = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  switch (transaction.transactionType) {
    case TransactionType.USER_DEPOSIT:
      return await processUserDeposit(transaction);
    
    case TransactionType.USER_WITHDRAWAL:
      return await processUserWithdrawal(transaction);
    
    case TransactionType.TRADE_PAYMENT:
      return await processTradePayment(transaction);
    
    case TransactionType.ESCROW_HOLD:
      return await processEscrowHold(transaction);
    
    case TransactionType.ESCROW_RELEASE:
      return await processEscrowRelease(transaction);
    
    case TransactionType.ESCROW_REFUND:
      return await processEscrowRefund(transaction);
    
    case TransactionType.FEE_COLLECTION:
      return await processFeeCollection(transaction);
    
    case TransactionType.DISPUTE_HOLD:
      return await processDisputeHold(transaction);
    
    case TransactionType.DISPUTE_RELEASE:
      return await processDisputeRelease(transaction);
    
    case TransactionType.SYSTEM_ADJUSTMENT:
      return await processSystemAdjustment(transaction);
    
    default:
      return {
        success: false,
        error: 'Unknown transaction type'
      };
  }
};

/**
 * Process user deposit (external payment -> user wallet)
 */
const processUserDeposit = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.toAccountId) {
    return { success: false, error: 'Destination account required for deposit' };
  }

  const toAccount = await getAccount(transaction.toAccountId);
  if (!toAccount) {
    return { success: false, error: 'Destination account not found' };
  }

  const newBalance = toAccount.balance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: transaction.amount,
      balanceAfter: newBalance,
      description: `Deposit: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    }
  ];

  // Update account balance
  await updateAccountBalance(transaction.toAccountId, newBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process user withdrawal (user wallet -> external payment)
 */
const processUserWithdrawal = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId) {
    return { success: false, error: 'Source account required for withdrawal' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  if (!fromAccount) {
    return { success: false, error: 'Source account not found' };
  }

  if (fromAccount.availableBalance < transaction.amount) {
    return { success: false, error: 'Insufficient funds for withdrawal' };
  }

  const newBalance = fromAccount.balance - transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: -transaction.amount,
      balanceAfter: newBalance,
      description: `Withdrawal: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    }
  ];

  // Update account balance
  await updateAccountBalance(transaction.fromAccountId, newBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process trade payment (user wallet -> escrow)
 */
const processTradePayment = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId || !transaction.toAccountId) {
    return { success: false, error: 'Both source and destination accounts required for trade payment' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  const toAccount = await getAccount(transaction.toAccountId);

  if (!fromAccount || !toAccount) {
    return { success: false, error: 'One or both accounts not found' };
  }

  if (fromAccount.availableBalance < transaction.amount) {
    return { success: false, error: 'Insufficient funds for trade payment' };
  }

  const fromNewBalance = fromAccount.balance - transaction.amount;
  const toNewBalance = toAccount.balance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: -transaction.amount,
      balanceAfter: fromNewBalance,
      description: `Trade Payment: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    },
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: transaction.amount,
      balanceAfter: toNewBalance,
      description: `Trade Payment: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    }
  ];

  // Update account balances
  await updateAccountBalance(transaction.fromAccountId, fromNewBalance);
  await updateAccountBalance(transaction.toAccountId, toNewBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process escrow hold (escrow -> frozen balance)
 */
const processEscrowHold = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId) {
    return { success: false, error: 'Source account required for escrow hold' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  if (!fromAccount) {
    return { success: false, error: 'Source account not found' };
  }

  if (fromAccount.balance < transaction.amount) {
    return { success: false, error: 'Insufficient funds for escrow hold' };
  }

  const newAvailableBalance = fromAccount.availableBalance - transaction.amount;
  const newFrozenBalance = fromAccount.frozenBalance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: 0, // No change to total balance, just availability
      balanceAfter: fromAccount.balance,
      description: `Escrow Hold: ${transaction.description}`,
      metadata: { ...(transaction.metadata || {}), frozenAmount: transaction.amount },
      createdAt: new Date()
    }
  ];

  // Update account availability
  await updateAccountAvailability(transaction.fromAccountId, newAvailableBalance, newFrozenBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process escrow release (frozen balance -> available balance)
 */
const processEscrowRelease = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.toAccountId) {
    return { success: false, error: 'Destination account required for escrow release' };
  }

  const toAccount = await getAccount(transaction.toAccountId);
  if (!toAccount) {
    return { success: false, error: 'Destination account not found' };
  }

  const newAvailableBalance = toAccount.availableBalance + transaction.amount;
  const newFrozenBalance = toAccount.frozenBalance - transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: 0, // No change to total balance, just availability
      balanceAfter: toAccount.balance,
      description: `Escrow Release: ${transaction.description}`,
      metadata: { ...(transaction.metadata || {}), releasedAmount: transaction.amount },
      createdAt: new Date()
    }
  ];

  // Update account availability
  await updateAccountAvailability(transaction.toAccountId, newAvailableBalance, newFrozenBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process escrow refund (escrow -> user wallet)
 */
const processEscrowRefund = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId || !transaction.toAccountId) {
    return { success: false, error: 'Both source and destination accounts required for escrow refund' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  const toAccount = await getAccount(transaction.toAccountId);

  if (!fromAccount || !toAccount) {
    return { success: false, error: 'One or both accounts not found' };
  }

  if (fromAccount.balance < transaction.amount) {
    return { success: false, error: 'Insufficient funds for escrow refund' };
  }

  const fromNewBalance = fromAccount.balance - transaction.amount;
  const toNewBalance = toAccount.balance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: -transaction.amount,
      balanceAfter: fromNewBalance,
      description: `Escrow Refund: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    },
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: transaction.amount,
      balanceAfter: toNewBalance,
      description: `Escrow Refund: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    }
  ];

  // Update account balances
  await updateAccountBalance(transaction.fromAccountId, fromNewBalance);
  await updateAccountBalance(transaction.toAccountId, toNewBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process fee collection (user wallet -> platform fees)
 */
const processFeeCollection = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId || !transaction.toAccountId) {
    return { success: false, error: 'Both source and destination accounts required for fee collection' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  const toAccount = await getAccount(transaction.toAccountId);

  if (!fromAccount || !toAccount) {
    return { success: false, error: 'One or both accounts not found' };
  }

  if (fromAccount.availableBalance < transaction.amount) {
    return { success: false, error: 'Insufficient funds for fee collection' };
  }

  const fromNewBalance = fromAccount.balance - transaction.amount;
  const toNewBalance = toAccount.balance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: -transaction.amount,
      balanceAfter: fromNewBalance,
      description: `Fee Collection: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    },
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: transaction.amount,
      balanceAfter: toNewBalance,
      description: `Fee Collection: ${transaction.description}`,
      metadata: transaction.metadata || {},
      createdAt: new Date()
    }
  ];

  // Update account balances
  await updateAccountBalance(transaction.fromAccountId, fromNewBalance);
  await updateAccountBalance(transaction.toAccountId, toNewBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process dispute hold (available balance -> frozen balance)
 */
const processDisputeHold = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.fromAccountId) {
    return { success: false, error: 'Source account required for dispute hold' };
  }

  const fromAccount = await getAccount(transaction.fromAccountId);
  if (!fromAccount) {
    return { success: false, error: 'Source account not found' };
  }

  if (fromAccount.availableBalance < transaction.amount) {
    return { success: false, error: 'Insufficient available funds for dispute hold' };
  }

  const newAvailableBalance = fromAccount.availableBalance - transaction.amount;
  const newFrozenBalance = fromAccount.frozenBalance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.fromAccountId,
      entryType: LedgerEntryType.DEBIT,
      amount: 0, // No change to total balance, just availability
      balanceAfter: fromAccount.balance,
      description: `Dispute Hold: ${transaction.description}`,
      metadata: { ...(transaction.metadata || {}), frozenAmount: transaction.amount },
      createdAt: new Date()
    }
  ];

  // Update account availability
  await updateAccountAvailability(transaction.fromAccountId, newAvailableBalance, newFrozenBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process dispute release (frozen balance -> available balance)
 */
const processDisputeRelease = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.toAccountId) {
    return { success: false, error: 'Destination account required for dispute release' };
  }

  const toAccount = await getAccount(transaction.toAccountId);
  if (!toAccount) {
    return { success: false, error: 'Destination account not found' };
  }

  const newAvailableBalance = toAccount.availableBalance + transaction.amount;
  const newFrozenBalance = toAccount.frozenBalance - transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: LedgerEntryType.CREDIT,
      amount: 0, // No change to total balance, just availability
      balanceAfter: toAccount.balance,
      description: `Dispute Release: ${transaction.description}`,
      metadata: { ...(transaction.metadata || {}), releasedAmount: transaction.amount },
      createdAt: new Date()
    }
  ];

  // Update account availability
  await updateAccountAvailability(transaction.toAccountId, newAvailableBalance, newFrozenBalance);

  return { success: true, ledgerEntries };
};

/**
 * Process system adjustment (admin-only)
 */
const processSystemAdjustment = async (transaction: Transaction): Promise<{
  success: boolean;
  ledgerEntries?: LedgerEntry[];
  error?: string;
}> => {
  if (!transaction.toAccountId) {
    return { success: false, error: 'Destination account required for system adjustment' };
  }

  const toAccount = await getAccount(transaction.toAccountId);
  if (!toAccount) {
    return { success: false, error: 'Destination account not found' };
  }

  const newBalance = toAccount.balance + transaction.amount;

  const ledgerEntries: LedgerEntry[] = [
    {
      id: generateLedgerEntryId(),
      transactionId: transaction.id,
      accountId: transaction.toAccountId,
      entryType: transaction.amount > 0 ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT,
      amount: transaction.amount,
      balanceAfter: newBalance,
      description: `System Adjustment: ${transaction.description}`,
      metadata: { ...(transaction.metadata || {}), isSystemAdjustment: true },
      createdAt: new Date()
    }
  ];

  // Update account balance
  await updateAccountBalance(transaction.toAccountId, newBalance);

  return { success: true, ledgerEntries };
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate transaction request
 */
const validateTransactionRequest = (request: CreateTransactionRequest): string[] => {
  const errors: string[] = [];

  if (request.amount <= 0) {
    errors.push('Transaction amount must be positive');
  }

  if (!request.idempotencyKey || request.idempotencyKey.trim() === '') {
    errors.push('Idempotency key is required');
  }

  if (!request.description || request.description.trim() === '') {
    errors.push('Transaction description is required');
  }

  return errors;
};

/**
 * Validate transfer request
 */
const validateTransferRequest = (request: TransferCreditsRequest): string[] => {
  const errors: string[] = [];

  if (request.amount <= 0) {
    errors.push('Transfer amount must be positive');
  }

  if (!request.fromAccountId || !request.toAccountId) {
    errors.push('Both source and destination accounts are required');
  }

  if (request.fromAccountId === request.toAccountId) {
    errors.push('Source and destination accounts cannot be the same');
  }

  return errors;
};

// ============================================================================
// DATABASE OPERATIONS (MOCK IMPLEMENTATIONS)
// ============================================================================

/**
 * Check for existing transaction with idempotency key
 */
const checkIdempotency = async (_idempotencyKey: string): Promise<Transaction | null> => {
  // TODO: Implement database query
  // SELECT * FROM transactions WHERE idempotency_key = $1
  return null;
};

/**
 * Get account by ID
 */
const getAccount = async (_accountId: string): Promise<CreditsAccount | null> => {
  // TODO: Implement database query
  // SELECT * FROM accounts WHERE id = $1 AND is_active = true
  return null;
};

/**
 * Update account balance
 */
const updateAccountBalance = async (_accountId: string, _newBalance: number): Promise<void> => {
  // TODO: Implement database update
  // UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2
};

/**
 * Update account availability
 */
const updateAccountAvailability = async (_accountId: string, _availableBalance: number, _frozenBalance: number): Promise<void> => {
  // TODO: Implement database update
  // UPDATE accounts SET available_balance = $1, frozen_balance = $2, updated_at = NOW() WHERE id = $3
};

/**
 * Store transaction
 */
const storeTransaction = async (_transaction: Transaction): Promise<void> => {
  // TODO: Implement database insert
  // INSERT INTO transactions (...)
};

/**
 * Store ledger entries
 */
const storeLedgerEntries = async (_entries: LedgerEntry[]): Promise<void> => {
  // TODO: Implement database insert
  // INSERT INTO ledger_entries (...)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique transaction ID
 */
const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique ledger entry ID
 */
const generateLedgerEntryId = (): string => {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// EXPORTS
// ============================================================================

// All functions are already exported individually above
