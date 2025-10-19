/**
 * Credits Context Types
 * 
 * Comprehensive type definitions for the LocalEx credits system,
 * including double-entry ledger, transactions, escrow, and fees.
 */

// ============================================================================
// CORE CREDITS TYPES
// ============================================================================

export interface CreditsAccount {
  id: string;
  userId: string;
  accountType: AccountType;
  balance: number; // In cents (integer for precision)
  availableBalance: number; // Available after escrow holds
  frozenBalance: number; // Frozen due to disputes or holds
  currency: 'USD'; // Only USD supported initially
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AccountType {
  USER_WALLET = 'USER_WALLET',
  ESCROW_ACCOUNT = 'ESCROW_ACCOUNT',
  PLATFORM_FEES = 'PLATFORM_FEES',
  DISPUTE_HOLD = 'DISPUTE_HOLD',
  SYSTEM_RESERVE = 'SYSTEM_RESERVE'
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number; // In cents (positive for credits, negative for debits)
  balanceAfter: number; // Account balance after this entry
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface Transaction {
  id: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  amount: number; // Total amount in cents
  fromAccountId?: string;
  toAccountId?: string;
  description: string;
  referenceId?: string; // External reference (trade ID, etc.)
  idempotencyKey: string;
  metadata?: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  USER_DEPOSIT = 'USER_DEPOSIT',
  USER_WITHDRAWAL = 'USER_WITHDRAWAL',
  TRADE_PAYMENT = 'TRADE_PAYMENT',
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  ESCROW_REFUND = 'ESCROW_REFUND',
  FEE_COLLECTION = 'FEE_COLLECTION',
  DISPUTE_HOLD = 'DISPUTE_HOLD',
  DISPUTE_RELEASE = 'DISPUTE_RELEASE',
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED'
}

// ============================================================================
// ESCROW TYPES
// ============================================================================

export interface EscrowAccount {
  id: string;
  tradeId: string;
  buyerAccountId: string;
  sellerAccountId: string;
  amount: number; // In cents
  platformFee: number; // In cents
  status: EscrowStatus;
  releaseConditions: EscrowReleaseCondition[];
  releasedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  EXPIRED = 'EXPIRED'
}

export interface EscrowReleaseCondition {
  id: string;
  escrowId: string;
  conditionType: EscrowConditionType;
  isMet: boolean;
  metAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export enum EscrowConditionType {
  BUYER_CONFIRMATION = 'BUYER_CONFIRMATION',
  SELLER_CONFIRMATION = 'SELLER_CONFIRMATION',
  TIME_ELAPSED = 'TIME_ELAPSED',
  DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE'
}

// ============================================================================
// FEE CALCULATION TYPES
// ============================================================================

export interface FeeCalculation {
  baseFee: number; // $1.99 in cents
  percentageFee: number; // 3.75% in basis points (375)
  tradeAmount: number; // Trade amount in cents
  calculatedFee: number; // Total fee in cents
  breakdown: {
    baseFeeAmount: number;
    percentageFeeAmount: number;
    totalFee: number;
  };
}

export interface FeeStructure {
  baseFeeCents: number; // $1.99 = 199 cents
  percentageFeeBasisPoints: number; // 3.75% = 375 basis points
  minimumTradeAmount: number; // Minimum trade in cents
  maximumFeeCents?: number; // Optional fee cap
}

// ============================================================================
// TRANSACTION REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateTransactionRequest {
  transactionType: TransactionType;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  description: string;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionResponse {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}

export interface ProcessPaymentRequest {
  tradeId: string;
  buyerId: string;
  sellerId: string;
  amount: number; // Trade amount in cents
  description: string;
  idempotencyKey: string;
}

export interface ProcessPaymentResponse {
  success: boolean;
  escrowAccount?: EscrowAccount;
  transaction?: Transaction;
  feeCalculation?: FeeCalculation;
  error?: string;
}

export interface ReleaseEscrowRequest {
  escrowId: string;
  releaseType: 'AUTOMATIC' | 'MANUAL' | 'DISPUTE_RESOLUTION';
  releasedBy: string; // User ID or 'SYSTEM'
  reason?: string;
}

export interface ReleaseEscrowResponse {
  success: boolean;
  escrowAccount?: EscrowAccount;
  transactions?: Transaction[];
  error?: string;
}

export interface RefundEscrowRequest {
  escrowId: string;
  refundType: 'FULL' | 'PARTIAL';
  refundAmount?: number; // For partial refunds
  refundedBy: string; // User ID or 'SYSTEM'
  reason: string;
}

export interface RefundEscrowResponse {
  success: boolean;
  escrowAccount?: EscrowAccount;
  transactions?: Transaction[];
  error?: string;
}

// ============================================================================
// ACCOUNT MANAGEMENT TYPES
// ============================================================================

export interface CreateAccountRequest {
  userId: string;
  accountType: AccountType;
  initialBalance?: number;
}

export interface CreateAccountResponse {
  success: boolean;
  account?: CreditsAccount;
  error?: string;
}

export interface GetAccountBalanceRequest {
  accountId: string;
  includeEscrow?: boolean;
}

export interface GetAccountBalanceResponse {
  success: boolean;
  balance?: {
    total: number;
    available: number;
    frozen: number;
    inEscrow: number;
  };
  error?: string;
}

export interface TransferCreditsRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface TransferCreditsResponse {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}

// ============================================================================
// REPORTING AND AUDIT TYPES
// ============================================================================

export interface TransactionHistoryRequest {
  accountId?: string;
  userId?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionHistoryResponse {
  success: boolean;
  transactions?: Transaction[];
  totalCount?: number;
  error?: string;
}

export interface AccountStatementRequest {
  accountId: string;
  startDate: Date;
  endDate: Date;
  includeMetadata?: boolean;
}

export interface AccountStatementResponse {
  success: boolean;
  statement?: {
    account: CreditsAccount;
    period: {
      start: Date;
      end: Date;
    };
    openingBalance: number;
    closingBalance: number;
    entries: LedgerEntry[];
    summary: {
      totalCredits: number;
      totalDebits: number;
      netChange: number;
    };
  };
  error?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface CreditsError {
  code: CreditsErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export enum CreditsErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_TRANSACTION_TYPE = 'INVALID_TRANSACTION_TYPE',
  IDEMPOTENCY_KEY_EXISTS = 'IDEMPOTENCY_KEY_EXISTS',
  ESCROW_NOT_FOUND = 'ESCROW_NOT_FOUND',
  ESCROW_NOT_FUNDED = 'ESCROW_NOT_FUNDED',
  ESCROW_ALREADY_RELEASED = 'ESCROW_ALREADY_RELEASED',
  ESCROW_ALREADY_REFUNDED = 'ESCROW_ALREADY_REFUNDED',
  INVALID_ESCROW_CONDITIONS = 'INVALID_ESCROW_CONDITIONS',
  FEE_CALCULATION_ERROR = 'FEE_CALCULATION_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED'
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface CreditsConfig {
  feeStructure: FeeStructure;
  escrowSettings: {
    autoReleaseDays: number;
    disputeHoldDays: number;
    minimumEscrowAmount: number;
  };
  limits: {
    maxTransactionAmount: number;
    maxDailyTransactionAmount: number;
    maxDailyTransactionCount: number;
  };
  security: {
    requireIdempotencyKey: boolean;
    maxIdempotencyKeyAge: number; // In hours
    enableAuditLogging: boolean;
  };
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface CreditsContextType {
  // Account Management
  accounts: CreditsAccount[];
  currentAccount: CreditsAccount | null;
  
  // Transaction Management
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  
  // Escrow Management
  escrowAccounts: EscrowAccount[];
  
  // Actions
  createAccount: (request: CreateAccountRequest) => Promise<CreateAccountResponse>;
  getAccountBalance: (request: GetAccountBalanceRequest) => Promise<GetAccountBalanceResponse>;
  transferCredits: (request: TransferCreditsRequest) => Promise<TransferCreditsResponse>;
  processPayment: (request: ProcessPaymentRequest) => Promise<ProcessPaymentResponse>;
  releaseEscrow: (request: ReleaseEscrowRequest) => Promise<ReleaseEscrowResponse>;
  refundEscrow: (request: RefundEscrowRequest) => Promise<RefundEscrowResponse>;
  
  // Queries
  getTransactionHistory: (request: TransactionHistoryRequest) => Promise<TransactionHistoryResponse>;
  getAccountStatement: (request: AccountStatementRequest) => Promise<AccountStatementResponse>;
  
  // Utilities
  calculateFees: (tradeAmount: number) => FeeCalculation;
  validateTransaction: (request: CreateTransactionRequest) => CreditsError[];
  
  // State
  isLoading: boolean;
  error: CreditsError | null;
}

// ============================================================================
// EXPORTS
// ============================================================================

// All types and enums are already exported individually above
