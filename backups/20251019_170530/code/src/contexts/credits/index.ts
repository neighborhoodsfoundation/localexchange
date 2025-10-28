/**
 * Credits Context Exports
 * 
 * Central export file for all credits-related functionality,
 * including types, services, context, and hooks.
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export * from './credits.types';

// ============================================================================
// SERVICES
// ============================================================================

export {
  createAccount,
  getAccountBalance,
  transferCreditsBetweenAccounts,
  processPayment,
  releaseEscrowFunds,
  refundEscrowFunds,
  getTransactionHistory,
  getAccountStatement,
  calculateTradeFees,
  validateTransaction,
  CREDITS_CONFIG
} from './creditsService';

export {
  createTransaction,
  transferCredits
} from './transactionService';

export {
  createEscrowAccount,
  releaseEscrow,
  refundEscrow,
  ESCROW_CONFIG
} from './escrowService';

export {
  calculateFees,
  calculateBulkFees,
  calculateNetAmount,
  calculateGrossAmount,
  validateFeeStructure,
  getFeeStructureDisplay,
  getFeeBreakdownDisplay,
  compareFeeStructures,
  roundToCents,
  dollarsToCents,
  centsToDollars,
  formatAmount,
  DEFAULT_FEE_STRUCTURE
} from './feeCalculationService';

// ============================================================================
// REACT CONTEXT AND HOOKS
// ============================================================================

export {
  CreditsProvider,
  useCredits,
  CreditsContext
} from './CreditsContext';

export {
  useCreateAccount,
  useAccountBalance,
  useAccountSelection,
  useTransferCredits,
  useTransactionHistory,
  useAccountStatement,
  usePaymentProcessing,
  useFeeCalculation,
  useEscrowManagement,
  useEscrowAccount,
  useCreditsError,
  useCreditsLoading,
  useCreditsConfig
} from './creditsHooks';

// ============================================================================
// CONFIGURATION EXPORTS
// ============================================================================

// All configuration constants are already exported individually above
