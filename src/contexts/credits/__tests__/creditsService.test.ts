/**
 * Credits Service Tests
 * 
 * Comprehensive unit tests for the credits service,
 * including account management, transactions, and escrow operations.
 */

import {
  createAccount,
  getAccountBalance,
  transferCreditsBetweenAccounts,
  processPayment,
  calculateTradeFees,
  validateTransaction,
  CREDITS_CONFIG
} from '../creditsService';
import { AccountType } from '../credits.types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the database operations
jest.mock('../creditsService', () => {
  const actual = jest.requireActual('../creditsService');
  return {
    ...actual,
    // Mock database operations
    getAccount: jest.fn(),
    getAccountByUserAndType: jest.fn(),
    storeAccount: jest.fn(),
    deleteAccount: jest.fn(),
    getEscrowAmountForAccount: jest.fn(),
    checkDailyLimits: jest.fn(),
    updateDailyLimits: jest.fn(),
    queryTransactions: jest.fn(),
    countTransactions: jest.fn(),
    getLedgerEntriesForPeriod: jest.fn(),
    getAccountBalanceAtDate: jest.fn()
  };
});

// ============================================================================
// ACCOUNT MANAGEMENT TESTS
// ============================================================================

describe('Account Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create a user wallet account successfully', async () => {
      const mockAccount = {
        id: 'acc_123',
        userId: 'user_123',
        accountType: AccountType.USER_WALLET,
        balance: 0,
        availableBalance: 0,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock database operations
      const { getAccountByUserAndType, storeAccount } = require('../creditsService');
      getAccountByUserAndType.mockResolvedValue(null);
      storeAccount.mockResolvedValue(undefined);

      const request = {
        userId: 'user_123',
        accountType: AccountType.USER_WALLET
      };

      const result = await createAccount(request);

      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.userId).toBe('user_123');
      expect(result.account?.accountType).toBe(AccountType.USER_WALLET);
    });

    it('should fail if user already has an account of this type', async () => {
      const mockExistingAccount = {
        id: 'acc_123',
        userId: 'user_123',
        accountType: AccountType.USER_WALLET,
        balance: 1000,
        availableBalance: 1000,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getAccountByUserAndType } = require('../creditsService');
      getAccountByUserAndType.mockResolvedValue(mockExistingAccount);

      const request = {
        userId: 'user_123',
        accountType: AccountType.USER_WALLET
      };

      const result = await createAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already has an account of this type');
    });

    it('should validate request parameters', async () => {
      const request = {
        userId: '',
        accountType: 'INVALID_TYPE' as any
      };

      const result = await createAccount(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance successfully', async () => {
      const mockAccount = {
        id: 'acc_123',
        userId: 'user_123',
        accountType: AccountType.USER_WALLET,
        balance: 5000,
        availableBalance: 4500,
        frozenBalance: 500,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getAccount, getEscrowAmountForAccount } = require('../creditsService');
      getAccount.mockResolvedValue(mockAccount);
      getEscrowAmountForAccount.mockResolvedValue(1000);

      const request = {
        accountId: 'acc_123',
        includeEscrow: true
      };

      const result = await getAccountBalance(request);

      expect(result.success).toBe(true);
      expect(result.balance).toBeDefined();
      expect(result.balance?.total).toBe(5000);
      expect(result.balance?.available).toBe(4500);
      expect(result.balance?.frozen).toBe(500);
      expect(result.balance?.inEscrow).toBe(1000);
    });

    it('should fail if account not found', async () => {
      const { getAccount } = require('../creditsService');
      getAccount.mockResolvedValue(null);

      const request = {
        accountId: 'nonexistent',
        includeEscrow: false
      };

      const result = await getAccountBalance(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });
  });
});

// ============================================================================
// TRANSACTION TESTS
// ============================================================================

describe('Transaction Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transferCreditsBetweenAccounts', () => {
    it('should transfer credits successfully', async () => {
      const mockFromAccount = {
        id: 'acc_from',
        userId: 'user_123',
        accountType: AccountType.USER_WALLET,
        balance: 5000,
        availableBalance: 5000,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockToAccount = {
        id: 'acc_to',
        userId: 'user_456',
        accountType: AccountType.USER_WALLET,
        balance: 1000,
        availableBalance: 1000,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getAccount, checkDailyLimits, updateDailyLimits } = require('../creditsService');
      getAccount.mockResolvedValueOnce(mockFromAccount).mockResolvedValueOnce(mockToAccount);
      checkDailyLimits.mockResolvedValue({ allowed: true });
      updateDailyLimits.mockResolvedValue(undefined);

      // Mock the transferCredits function from transactionService
      const { transferCredits } = require('../transactionService');
      transferCredits.mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn_123',
          transactionType: 'TRADE_PAYMENT',
          status: 'COMPLETED',
          amount: 1000,
          fromAccountId: 'acc_from',
          toAccountId: 'acc_to',
          description: 'Test transfer',
          idempotencyKey: 'test_key',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        fromAccountId: 'acc_from',
        toAccountId: 'acc_to',
        amount: 1000,
        description: 'Test transfer',
        idempotencyKey: 'test_key'
      };

      const result = await transferCreditsBetweenAccounts(request);

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.amount).toBe(1000);
    });

    it('should fail if insufficient funds', async () => {
      const mockFromAccount = {
        id: 'acc_from',
        userId: 'user_123',
        accountType: AccountType.USER_WALLET,
        balance: 500,
        availableBalance: 500,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getAccount } = require('../creditsService');
      getAccount.mockResolvedValueOnce(mockFromAccount);

      const { transferCredits } = require('../transactionService');
      transferCredits.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      const request = {
        fromAccountId: 'acc_from',
        toAccountId: 'acc_to',
        amount: 1000,
        description: 'Test transfer',
        idempotencyKey: 'test_key'
      };

      const result = await transferCreditsBetweenAccounts(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should validate transfer request', async () => {
      const request = {
        fromAccountId: 'acc_from',
        toAccountId: 'acc_from', // Same account
        amount: 1000,
        description: 'Test transfer',
        idempotencyKey: 'test_key'
      };

      const result = await transferCreditsBetweenAccounts(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source and destination accounts cannot be the same');
    });
  });
});

// ============================================================================
// PAYMENT PROCESSING TESTS
// ============================================================================

describe('Payment Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const mockBuyerAccount = {
        id: 'buyer_acc',
        userId: 'buyer_123',
        accountType: AccountType.USER_WALLET,
        balance: 10000,
        availableBalance: 10000,
        frozenBalance: 0,
        currency: 'USD' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { getAccountBalance } = require('../creditsService');
      getAccountBalance.mockResolvedValue({
        success: true,
        balance: {
          total: 10000,
          available: 10000,
          frozen: 0,
          inEscrow: 0
        }
      });

      // Mock the createEscrowAccount function from escrowService
      const { createEscrowAccount } = require('../escrowService');
      createEscrowAccount.mockResolvedValue({
        success: true,
        escrowAccount: {
          id: 'escrow_123',
          tradeId: 'trade_123',
          buyerAccountId: 'buyer_acc',
          sellerAccountId: 'seller_acc',
          amount: 5000,
          platformFee: 199,
          status: 'FUNDED',
          releaseConditions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        transaction: {
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
        },
        feeCalculation: {
          baseFee: 199,
          percentageFee: 375,
          tradeAmount: 5000,
          calculatedFee: 199,
          breakdown: {
            baseFeeAmount: 199,
            percentageFeeAmount: 0,
            totalFee: 199
          }
        }
      });

      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 5000,
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await processPayment(request);

      expect(result.success).toBe(true);
      expect(result.escrowAccount).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.feeCalculation).toBeDefined();
    });

    it('should fail if insufficient funds', async () => {
      const { getAccountBalance } = require('../creditsService');
      getAccountBalance.mockResolvedValue({
        success: true,
        balance: {
          total: 1000,
          available: 1000,
          frozen: 0,
          inEscrow: 0
        }
      });

      const request = {
        tradeId: 'trade_123',
        buyerId: 'buyer_acc',
        sellerId: 'seller_acc',
        amount: 5000,
        description: 'Trade Payment',
        idempotencyKey: 'payment_trade_123_1234567890'
      };

      const result = await processPayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds for payment and fees');
    });
  });
});

// ============================================================================
// FEE CALCULATION TESTS
// ============================================================================

describe('Fee Calculation', () => {
  describe('calculateTradeFees', () => {
    it('should calculate fees correctly for $100 trade', () => {
      const tradeAmount = 10000; // $100.00 in cents
      const result = calculateTradeFees(tradeAmount);

      expect(result.tradeAmount).toBe(10000);
      expect(result.baseFee).toBe(199); // $1.99
      expect(result.percentageFee).toBe(375); // 3.75%
      expect(result.calculatedFee).toBe(199 + 375); // $1.99 + $3.75 = $5.74
      expect(result.breakdown.baseFeeAmount).toBe(199);
      expect(result.breakdown.percentageFeeAmount).toBe(375);
      expect(result.breakdown.totalFee).toBe(574);
    });

    it('should calculate fees correctly for $10 trade', () => {
      const tradeAmount = 1000; // $10.00 in cents
      const result = calculateTradeFees(tradeAmount);

      expect(result.tradeAmount).toBe(1000);
      expect(result.baseFee).toBe(199); // $1.99
      expect(result.percentageFee).toBe(375); // 3.75%
      expect(result.calculatedFee).toBe(199 + 37); // $1.99 + $0.37 = $2.36
      expect(result.breakdown.baseFeeAmount).toBe(199);
      expect(result.breakdown.percentageFeeAmount).toBe(37);
      expect(result.breakdown.totalFee).toBe(236);
    });

    it('should apply maximum fee cap', () => {
      const tradeAmount = 1000000; // $10,000.00 in cents
      const result = calculateTradeFees(tradeAmount);

      expect(result.tradeAmount).toBe(1000000);
      expect(result.calculatedFee).toBe(5000); // Capped at $50.00
    });
  });

  describe('validateTransaction', () => {
    it('should validate valid transaction', () => {
      const request = {
        amount: 1000,
        fromAccountId: 'acc_123'
      };

      const errors = validateTransaction(request);

      expect(errors).toHaveLength(0);
    });

    it('should reject negative amount', () => {
      const request = {
        amount: -100,
        fromAccountId: 'acc_123'
      };

      const errors = validateTransaction(request);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Amount must be positive');
    });

    it('should reject amount exceeding limit', () => {
      const request = {
        amount: 2000000, // $20,000 - exceeds $10,000 limit
        fromAccountId: 'acc_123'
      };

      const errors = validateTransaction(request);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Amount exceeds maximum transaction limit');
    });
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Configuration', () => {
  it('should have correct default configuration', () => {
    expect(CREDITS_CONFIG.feeStructure.baseFeeCents).toBe(199); // $1.99
    expect(CREDITS_CONFIG.feeStructure.percentageFeeBasisPoints).toBe(375); // 3.75%
    expect(CREDITS_CONFIG.feeStructure.minimumTradeAmount).toBe(100); // $1.00
    expect(CREDITS_CONFIG.limits.maxTransactionAmount).toBe(1000000); // $10,000
    expect(CREDITS_CONFIG.escrowSettings.autoReleaseDays).toBe(7);
    expect(CREDITS_CONFIG.security.requireIdempotencyKey).toBe(true);
  });
});
