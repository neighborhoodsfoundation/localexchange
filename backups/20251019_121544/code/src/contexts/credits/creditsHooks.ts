/**
 * creditsHooks.ts
 * 
 * Custom React hooks to easily consume the Credits Context and interact with its functionalities.
 * These hooks provide a clean API for components to access credits-related state and operations.
 */

import * as React from 'react';
const { useCallback, useState, useEffect } = React;
import { useCredits } from './CreditsContext';
import {
  CreateAccountRequest,
  GetAccountBalanceRequest,
  TransferCreditsRequest,
  TransactionHistoryRequest,
  AccountStatementRequest,
  ProcessPaymentRequest,
  ReleaseEscrowRequest,
  RefundEscrowRequest,
  CreditsAccount,
  EscrowAccount
} from './credits.types';

// ============================================================================
// ACCOUNT MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for creating a new credits account
 */
export const useCreateAccount = () => {
  const { createAccount } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = useCallback(async (request: CreateAccountRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await createAccount(request);
      if (!response.success) {
        setError(response.error || 'Failed to create account');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [createAccount]);

  return {
    createAccount: handleCreateAccount,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook for getting account balance
 */
export const useAccountBalance = () => {
  const { getAccountBalance } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetBalance = useCallback(async (request: GetAccountBalanceRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAccountBalance(request);
      if (!response.success) {
        setError(response.error || 'Failed to get account balance');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [getAccountBalance]);

  return {
    getBalance: handleGetBalance,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook for account selection and management
 */
export const useAccountSelection = () => {
  const { state, selectAccount } = useCredits();
  const [selectedAccount, setSelectedAccount] = useState<CreditsAccount | null>(null);

  useEffect(() => {
    if (state.selectedAccountId) {
      const account = state.accounts.find(acc => acc.id === state.selectedAccountId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  }, [state.selectedAccountId, state.accounts]);

  const selectAccountById = useCallback((accountId: string | null) => {
    selectAccount(accountId);
  }, [selectAccount]);

  return {
    selectedAccount,
    selectedAccountId: state.selectedAccountId,
    selectAccount: selectAccountById,
    accounts: state.accounts
  };
};

// ============================================================================
// TRANSACTION MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for transferring credits between accounts
 */
export const useTransferCredits = () => {
  const { transferCredits } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = useCallback(async (request: TransferCreditsRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await transferCredits(request);
      if (!response.success) {
        setError(response.error || 'Failed to transfer credits');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [transferCredits]);

  return {
    transferCredits: handleTransfer,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook for transaction history
 */
export const useTransactionHistory = () => {
  const { getTransactionHistory, state } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetHistory = useCallback(async (request: TransactionHistoryRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getTransactionHistory(request);
      if (!response.success) {
        setError(response.error || 'Failed to get transaction history');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [getTransactionHistory]);

  return {
    getHistory: handleGetHistory,
    transactions: state.transactions,
    transactionHistory: state.transactionHistory,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook for account statements
 */
export const useAccountStatement = () => {
  const { getAccountStatement } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetStatement = useCallback(async (request: AccountStatementRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getAccountStatement(request);
      if (!response.success) {
        setError(response.error || 'Failed to get account statement');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [getAccountStatement]);

  return {
    getStatement: handleGetStatement,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

// ============================================================================
// PAYMENT PROCESSING HOOKS
// ============================================================================

/**
 * Hook for payment processing
 */
export const usePaymentProcessing = () => {
  const { processPayment } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessPayment = useCallback(async (request: ProcessPaymentRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await processPayment(request);
      if (!response.success) {
        setError(response.error || 'Failed to process payment');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [processPayment]);

  return {
    processPayment: handleProcessPayment,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

// ============================================================================
// FEE CALCULATION HOOKS
// ============================================================================

/**
 * Hook for fee calculations
 */
export const useFeeCalculation = () => {
  const { calculateFees, validateTransaction } = useCredits();
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateFeesForAmount = useCallback(async (amount: number) => {
    setIsCalculating(true);
    try {
      const result = calculateFees(amount);
      return result;
    } finally {
      setIsCalculating(false);
    }
  }, [calculateFees]);

  const validateTransactionRequest = useCallback((request: any) => {
    return validateTransaction(request);
  }, [validateTransaction]);

  return {
    calculateFees: calculateFeesForAmount,
    validateTransaction: validateTransactionRequest,
    isCalculating
  };
};

// ============================================================================
// ESCROW MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for escrow management
 */
export const useEscrowManagement = () => {
  const { releaseEscrowFunds, refundEscrowFunds, state } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReleaseEscrow = useCallback(async (request: ReleaseEscrowRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await releaseEscrowFunds(request);
      if (!response.success) {
        setError(response.error || 'Failed to release escrow funds');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [releaseEscrowFunds]);

  const handleRefundEscrow = useCallback(async (request: RefundEscrowRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await refundEscrowFunds(request);
      if (!response.success) {
        setError(response.error || 'Failed to refund escrow funds');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [refundEscrowFunds]);

  return {
    releaseEscrow: handleReleaseEscrow,
    refundEscrow: handleRefundEscrow,
    escrowAccounts: state.escrowAccounts,
    selectedEscrowId: state.selectedEscrowId,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

/**
 * Hook for individual escrow account management
 */
export const useEscrowAccount = (escrowId: string | null) => {
  const { state } = useCredits();
  const [escrowAccount, setEscrowAccount] = useState<EscrowAccount | null>(null);

  useEffect(() => {
    if (escrowId) {
      const account = state.escrowAccounts.find(escrow => escrow.id === escrowId);
      setEscrowAccount(account || null);
    } else {
      setEscrowAccount(null);
    }
  }, [escrowId, state.escrowAccounts]);

  return {
    escrowAccount,
    isLoading: state.loading
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for credits error handling
 */
export const useCreditsError = () => {
  const { state, setError, clearError } = useCredits();
  
  return {
    error: state.error,
    setError,
    clearError,
    hasError: !!state.error
  };
};

/**
 * Hook for loading states
 */
export const useCreditsLoading = () => {
  const { state, setLoading } = useCredits();
  
  return {
    loading: state.loading,
    setLoading,
    isLoading: state.loading
  };
};

/**
 * Hook for credits configuration
 */
export const useCreditsConfig = () => {
  const { state } = useCredits();
  
  return {
    config: state.config
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

// All hooks are already exported individually above
