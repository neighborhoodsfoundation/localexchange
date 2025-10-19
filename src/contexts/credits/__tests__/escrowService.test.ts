/**
 * Escrow Service Tests
 * 
 * Comprehensive unit tests for escrow functionality,
 * including account creation, release conditions, and refunds.
 */

import {
  createEscrowAccount,
  releaseEscrow,
  refundEscrow,
  ESCROW_CONFIG
} from '../escrowService';
import { EscrowStatus, EscrowConditionType } from '../credits.types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the database operations
jest.mock('../escrowService', () => {
  const actual = jest.requireActual('../escrowService');
  return {
    ...actual,
    // Mock database operations
    getEscrowAccount: jest.fn(),
    storeEscrowAccount: jest.fn(),
    getReleaseConditions: jest.fn(),
    updateReleaseCondition: jest.fn(),
    refundEscrowAccount: jest.fn()
  };
});

// Mock the transaction service
jest.mock('../transactionService', () => ({
  createTransaction: jest.fn()
}));

// Mock the fee calculation service
jest.mock('../feeCalculationService', () => ({
  calculateFees: jest.fn(),
  DEFAULT_FEE_STRUCTURE: {
    baseFeeCents: 199,
    percentageFeeBasisPoints: 375,
    minimumTradeAmount: 100,
    maximumFeeCents: 5000
  }
}));

// ============================================================================
// ESCROW ACCOUNT CREATION TESTS
// ============================================================================

describe('Escrow Account Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEscrowAccount', () => {
    it('should create escrow account successfully', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.FUNDED,
        releaseConditions: [
          {
            id: 'condition_1',
            escrowId: 'escrow_123',
            conditionType: EscrowConditionType.BUYER_CONFIRMATION,
            isMet: false,
            createdAt: new Date()
          },
          {
            id: 'condition_2',
            escrowId: 'escrow_123',
            conditionType: EscrowConditionType.SELLER_CONFIRMATION,
            isMet: false,
            createdAt: new Date()
          },
          {
            id: 'condition_3',
            escrowId: 'escrow_123',
            conditionType: EscrowConditionType.TIME_ELAPSED,
            isMet: false,
            metadata: { autoReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
            createdAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        id: 'txn_123',
        transactionType: 'TRADE_PAYMENT',
        status: 'COMPLETED',
        amount: 5000,
        fromAccountId: 'buyer_acc',
        toAccountId: 'escrow_123',
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockFeeCalculation = {
        baseFee: 199,
        percentageFee: 375,
        tradeAmount: 5000,
        calculatedFee: 199,
        breakdown: {
          baseFeeAmount: 199,
          percentageFeeAmount: 0,
          totalFee: 199
        }
      };

      // Mock dependencies
      const { createTransaction } = require('../transactionService');
      const { calculateFees } = require('../feeCalculationService');
      const { storeEscrowAccount } = require('../escrowService');

      createTransaction
        .mockResolvedValueOnce({ success: true, transaction: mockTransaction })
        .mockResolvedValueOnce({ success: true, transaction: { ...mockTransaction, id: 'txn_fee_123' } });
      
      calculateFees.mockReturnValue(mockFeeCalculation);
      storeEscrowAccount.mockResolvedValue(undefined);

      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 5000,
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await createEscrowAccount(request);

      expect(result.success).toBe(true);
      expect(result.escrowAccount).toBeDefined();
      expect(result.escrowAccount?.tradeId).toBe('trade_123');
      expect(result.escrowAccount?.amount).toBe(5000);
      expect(result.escrowAccount?.status).toBe(EscrowStatus.FUNDED);
      expect(result.escrowAccount?.releaseConditions).toHaveLength(3);
      expect(result.transaction).toBeDefined();
      expect(result.feeCalculation).toBeDefined();
    });

    it('should fail if trade amount below minimum', async () => {
      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 50, // $0.50 - below $1.00 minimum
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await createEscrowAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Escrow amount must be at least');
    });

    it('should fail if trade amount above maximum', async () => {
      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 2000000, // $20,000 - above $10,000 maximum
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await createEscrowAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Escrow amount cannot exceed');
    });

    it('should fail if trade ID missing', async () => {
      const request = {
        tradeId: '',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 5000,
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await createEscrowAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Trade ID is required');
    });

    it('should fail if payment transaction fails', async () => {
      const { createTransaction } = require('../transactionService');
      const { calculateFees } = require('../feeCalculationService');

      createTransaction.mockResolvedValue({ success: false, error: 'Insufficient funds' });
      calculateFees.mockReturnValue({
        baseFee: 199,
        percentageFee: 375,
        tradeAmount: 5000,
        calculatedFee: 199,
        breakdown: { baseFeeAmount: 199, percentageFeeAmount: 0, totalFee: 199 }
      });

      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 5000,
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await createEscrowAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });
  });
});

// ============================================================================
// ESCROW RELEASE TESTS
// ============================================================================

describe('Escrow Release', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('releaseEscrow', () => {
    it('should release escrow successfully', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.FUNDED,
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReleaseTransaction = {
        id: 'txn_release_123',
        transactionType: 'ESCROW_RELEASE',
        status: 'COMPLETED',
        amount: 5000,
        fromAccountId: 'escrow_123',
        toAccountId: 'seller_acc',
        description: 'Escrow Release: Trade completed',
        idempotencyKey: 'release_escrow_123_1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock dependencies
      const { getEscrowAccount, storeEscrowAccount, getReleaseConditions, updateReleaseCondition } = require('../escrowService');
      const { createTransaction } = require('../transactionService');

      getEscrowAccount.mockResolvedValue(mockEscrowAccount);
      getReleaseConditions.mockResolvedValue([]);
      updateReleaseCondition.mockResolvedValue(undefined);
      storeEscrowAccount.mockResolvedValue(undefined);
      createTransaction.mockResolvedValue({ success: true, transaction: mockReleaseTransaction });

      const request = {
        escrowId: 'escrow_123',
        releaseType: 'MANUAL' as const,
        releasedBy: 'seller_acc',
        reason: 'Trade completed'
      };

      const result = await releaseEscrow(request);

      expect(result.success).toBe(true);
      expect(result.escrowAccount).toBeDefined();
      expect(result.escrowAccount?.status).toBe(EscrowStatus.RELEASED);
      expect(result.escrowAccount?.releasedAt).toBeDefined();
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions?.[0].id).toBe('txn_release_123');
    });

    it('should fail if escrow account not found', async () => {
      const { getEscrowAccount } = require('../escrowService');
      getEscrowAccount.mockResolvedValue(null);

      const request = {
        escrowId: 'nonexistent',
        releaseType: 'MANUAL' as const,
        releasedBy: 'seller_acc',
        reason: 'Trade completed'
      };

      const result = await releaseEscrow(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Escrow account not found');
    });

    it('should fail if escrow not funded', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.PENDING, // Not funded
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getEscrowAccount } = require('../escrowService');
      getEscrowAccount.mockResolvedValue(mockEscrowAccount);

      const request = {
        escrowId: 'escrow_123',
        releaseType: 'MANUAL' as const,
        releasedBy: 'seller_acc',
        reason: 'Trade completed'
      };

      const result = await releaseEscrow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Escrow account is not funded');
    });

    it('should fail if escrow already released', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.RELEASED, // Already released
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        releasedAt: new Date()
      };

      const { getEscrowAccount } = require('../escrowService');
      getEscrowAccount.mockResolvedValue(mockEscrowAccount);

      const request = {
        escrowId: 'escrow_123',
        releaseType: 'MANUAL' as const,
        releasedBy: 'seller_acc',
        reason: 'Trade completed'
      };

      const result = await releaseEscrow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Escrow has already been released');
    });
  });
});

// ============================================================================
// ESCROW REFUND TESTS
// ============================================================================

describe('Escrow Refund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refundEscrow', () => {
    it('should refund escrow successfully', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.FUNDED,
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockRefundTransaction = {
        id: 'txn_refund_123',
        transactionType: 'ESCROW_REFUND',
        status: 'COMPLETED',
        amount: 5000,
        fromAccountId: 'escrow_123',
        toAccountId: 'buyer_acc',
        description: 'Escrow Refund: Trade cancelled',
        idempotencyKey: 'refund_escrow_123_1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock dependencies
      const { getEscrowAccount, storeEscrowAccount } = require('../escrowService');
      const { createTransaction } = require('../transactionService');

      getEscrowAccount.mockResolvedValue(mockEscrowAccount);
      storeEscrowAccount.mockResolvedValue(undefined);
      createTransaction.mockResolvedValue({ success: true, transaction: mockRefundTransaction });

      const request = {
        escrowId: 'escrow_123',
        refundType: 'FULL' as const,
        refundedBy: 'buyer_acc',
        reason: 'Trade cancelled'
      };

      const result = await refundEscrow(request);

      expect(result.success).toBe(true);
      expect(result.escrowAccount).toBeDefined();
      expect(result.escrowAccount?.status).toBe(EscrowStatus.REFUNDED);
      expect(result.escrowAccount?.refundedAt).toBeDefined();
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions?.[0].id).toBe('txn_refund_123');
    });

    it('should process partial refund', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.FUNDED,
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockRefundTransaction = {
        id: 'txn_refund_123',
        transactionType: 'ESCROW_REFUND',
        status: 'COMPLETED',
        amount: 3000, // Partial refund
        fromAccountId: 'escrow_123',
        toAccountId: 'buyer_acc',
        description: 'Escrow Refund: Partial refund',
        idempotencyKey: 'refund_escrow_123_1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock dependencies
      const { getEscrowAccount, storeEscrowAccount } = require('../escrowService');
      const { createTransaction } = require('../transactionService');

      getEscrowAccount.mockResolvedValue(mockEscrowAccount);
      storeEscrowAccount.mockResolvedValue(undefined);
      createTransaction.mockResolvedValue({ success: true, transaction: mockRefundTransaction });

      const request = {
        escrowId: 'escrow_123',
        refundType: 'PARTIAL' as const,
        refundAmount: 3000,
        refundedBy: 'buyer_acc',
        reason: 'Partial refund'
      };

      const result = await refundEscrow(request);

      expect(result.success).toBe(true);
      expect(result.escrowAccount).toBeDefined();
      expect(result.escrowAccount?.status).toBe(EscrowStatus.REFUNDED);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions?.[0].amount).toBe(3000);
    });

    it('should fail if refund amount exceeds escrow amount', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.FUNDED,
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getEscrowAccount } = require('../escrowService');
      getEscrowAccount.mockResolvedValue(mockEscrowAccount);

      const request = {
        escrowId: 'escrow_123',
        refundType: 'PARTIAL' as const,
        refundAmount: 6000, // More than escrow amount
        refundedBy: 'buyer_acc',
        reason: 'Partial refund'
      };

      const result = await refundEscrow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Refund amount cannot exceed escrow amount');
    });

    it('should fail if escrow not in refundable state', async () => {
      const mockEscrowAccount = {
        id: 'escrow_123',
        tradeId: 'trade_123',
        buyerAccountId: 'buyer_acc',
        sellerAccountId: 'seller_acc',
        amount: 5000,
        platformFee: 199,
        status: EscrowStatus.RELEASED, // Already released
        releaseConditions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        releasedAt: new Date()
      };

      const { getEscrowAccount } = require('../escrowService');
      getEscrowAccount.mockResolvedValue(mockEscrowAccount);

      const request = {
        escrowId: 'escrow_123',
        refundType: 'FULL' as const,
        refundedBy: 'buyer_acc',
        reason: 'Trade cancelled'
      };

      const result = await refundEscrow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot refund released escrow');
    });
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Escrow Configuration', () => {
  it('should have correct default configuration', () => {
    expect(ESCROW_CONFIG.autoReleaseDays).toBe(7);
    expect(ESCROW_CONFIG.disputeHoldDays).toBe(14);
    expect(ESCROW_CONFIG.minimumEscrowAmount).toBe(100); // $1.00
    expect(ESCROW_CONFIG.maximumEscrowAmount).toBe(1000000); // $10,000.00
    expect(ESCROW_CONFIG.checkIntervalHours).toBe(1);
  });
});
