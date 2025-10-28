/**
 * CreditsContext.tsx
 * 
 * React Context Provider for global state management of credits-related data and operations.
 * This provides a centralized way to manage credits state across the application.
 */

import * as React from 'react';
const { createContext, useContext, useReducer } = React;
type ReactNode = React.ReactNode;
import {
  CreditsAccount,
  Transaction,
  EscrowAccount,
  CreateAccountRequest,
  CreateAccountResponse,
  GetAccountBalanceRequest,
  GetAccountBalanceResponse,
  TransferCreditsRequest,
  TransferCreditsResponse,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
  ReleaseEscrowRequest,
  ReleaseEscrowResponse,
  RefundEscrowRequest,
  RefundEscrowResponse,
  TransactionHistoryRequest,
  TransactionHistoryResponse,
  AccountStatementRequest,
  AccountStatementResponse,
  CreditsError,
  CreditsConfig
} from './credits.types';
import {
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

// ============================================================================
// STATE TYPES
// ============================================================================

interface CreditsState {
  // Account Management
  accounts: CreditsAccount[];
  selectedAccountId: string | null;
  
  // Transaction Management
  transactions: Transaction[];
  transactionHistory: TransactionHistoryResponse | null;
  
  // Escrow Management
  escrowAccounts: EscrowAccount[];
  selectedEscrowId: string | null;
  
  // UI State
  loading: boolean;
  error: CreditsError | null;
  
  // Configuration
  config: CreditsConfig;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

type CreditsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: CreditsError | null }
  | { type: 'SET_ACCOUNTS'; payload: CreditsAccount[] }
  | { type: 'ADD_ACCOUNT'; payload: CreditsAccount }
  | { type: 'UPDATE_ACCOUNT'; payload: CreditsAccount }
  | { type: 'SET_SELECTED_ACCOUNT'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_TRANSACTION_HISTORY'; payload: TransactionHistoryResponse | null }
  | { type: 'SET_ESCROW_ACCOUNTS'; payload: EscrowAccount[] }
  | { type: 'ADD_ESCROW_ACCOUNT'; payload: EscrowAccount }
  | { type: 'UPDATE_ESCROW_ACCOUNT'; payload: EscrowAccount }
  | { type: 'SET_SELECTED_ESCROW'; payload: string | null }
  | { type: 'SET_CONFIG'; payload: CreditsConfig };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: CreditsState = {
  accounts: [],
  selectedAccountId: null,
  transactions: [],
  transactionHistory: null,
  escrowAccounts: [],
  selectedEscrowId: null,
  loading: false,
  error: null,
  config: CREDITS_CONFIG
};

// ============================================================================
// REDUCER
// ============================================================================

const creditsReducer = (state: CreditsState, action: CreditsAction): CreditsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
      
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
      
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(acc => 
          acc.id === action.payload.id ? action.payload : acc
        )
      };
      
    case 'SET_SELECTED_ACCOUNT':
      return { ...state, selectedAccountId: action.payload };
      
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
      
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
      
    case 'SET_TRANSACTION_HISTORY':
      return { ...state, transactionHistory: action.payload };
      
    case 'SET_ESCROW_ACCOUNTS':
      return { ...state, escrowAccounts: action.payload };
      
    case 'ADD_ESCROW_ACCOUNT':
      return { ...state, escrowAccounts: [...state.escrowAccounts, action.payload] };
      
    case 'UPDATE_ESCROW_ACCOUNT':
      return {
        ...state,
        escrowAccounts: state.escrowAccounts.map(escrow => 
          escrow.id === action.payload.id ? action.payload : escrow
        )
      };
      
    case 'SET_SELECTED_ESCROW':
      return { ...state, selectedEscrowId: action.payload };
      
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
      
    default:
      return state;
  }
};

// ============================================================================
// CONTEXT
// ============================================================================

interface CreditsContextType {
  // State
  state: CreditsState;
  
  // Account Management
  createAccount: (request: CreateAccountRequest) => Promise<CreateAccountResponse>;
  getAccountBalance: (request: GetAccountBalanceRequest) => Promise<GetAccountBalanceResponse>;
  selectAccount: (accountId: string | null) => void;
  
  // Transaction Management
  transferCredits: (request: TransferCreditsRequest) => Promise<TransferCreditsResponse>;
  getTransactionHistory: (request: TransactionHistoryRequest) => Promise<TransactionHistoryResponse>;
  getAccountStatement: (request: AccountStatementRequest) => Promise<AccountStatementResponse>;
  
  // Payment Processing
  processPayment: (request: ProcessPaymentRequest) => Promise<ProcessPaymentResponse>;
  releaseEscrowFunds: (request: ReleaseEscrowRequest) => Promise<ReleaseEscrowResponse>;
  refundEscrowFunds: (request: RefundEscrowRequest) => Promise<RefundEscrowResponse>;
  
  // Utility Functions
  calculateFees: (amount: number) => any;
  validateTransaction: (request: any) => string[];
  
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: CreditsError | null) => void;
  clearError: () => void;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface CreditsProviderProps {
  children: ReactNode;
}

export const CreditsProvider: React.FC<CreditsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(creditsReducer, initialState);

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  const handleCreateAccount = async (request: CreateAccountRequest): Promise<CreateAccountResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await createAccount(request);
      
      if (response.success && response.account) {
        dispatch({ type: 'ADD_ACCOUNT', payload: response.account });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGetAccountBalance = async (request: GetAccountBalanceRequest): Promise<GetAccountBalanceResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await getAccountBalance(request);
      
      if (response.success && response.balance !== undefined) {
        // Update account balance in state if needed
        // Note: GetAccountBalanceResponse doesn't include account object
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const selectAccount = (accountId: string | null) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: accountId });
  };

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  const handleTransferCredits = async (request: TransferCreditsRequest): Promise<TransferCreditsResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await transferCreditsBetweenAccounts(request);
      
      if (response.success && response.transaction) {
        dispatch({ type: 'ADD_TRANSACTION', payload: response.transaction });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGetTransactionHistory = async (request: TransactionHistoryRequest): Promise<TransactionHistoryResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await getTransactionHistory(request);
      
      if (response.success) {
        dispatch({ type: 'SET_TRANSACTION_HISTORY', payload: response });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGetAccountStatement = async (request: AccountStatementRequest): Promise<AccountStatementResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await getAccountStatement(request);
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  const handleProcessPayment = async (request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await processPayment(request);
      
      if (response.success && response.escrowAccount) {
        dispatch({ type: 'ADD_ESCROW_ACCOUNT', payload: response.escrowAccount });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleReleaseEscrowFunds = async (request: ReleaseEscrowRequest): Promise<ReleaseEscrowResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await releaseEscrowFunds(request);
      
      if (response.success && response.escrowAccount) {
        dispatch({ type: 'UPDATE_ESCROW_ACCOUNT', payload: response.escrowAccount });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleRefundEscrowFunds = async (request: RefundEscrowRequest): Promise<RefundEscrowResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await refundEscrowFunds(request);
      
      if (response.success && response.escrowAccount) {
        dispatch({ type: 'UPDATE_ESCROW_ACCOUNT', payload: response.escrowAccount });
      }
      
      return response;
    } catch (error) {
      const creditsError: CreditsError = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      };
      dispatch({ type: 'SET_ERROR', payload: creditsError });
      return { success: false, error: creditsError.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const handleCalculateFees = (amount: number) => {
    return calculateTradeFees(amount);
  };

  const handleValidateTransaction = (request: any): string[] => {
    return validateTransaction(request);
  };

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: CreditsError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: CreditsContextType = {
    // State
    state,
    
    // Account Management
    createAccount: handleCreateAccount,
    getAccountBalance: handleGetAccountBalance,
    selectAccount,
    
    // Transaction Management
    transferCredits: handleTransferCredits,
    getTransactionHistory: handleGetTransactionHistory,
    getAccountStatement: handleGetAccountStatement,
    
    // Payment Processing
    processPayment: handleProcessPayment,
    releaseEscrowFunds: handleReleaseEscrowFunds,
    refundEscrowFunds: handleRefundEscrowFunds,
    
    // Utility Functions
    calculateFees: handleCalculateFees,
    validateTransaction: handleValidateTransaction,
    
    // UI Actions
    setLoading,
    setError,
    clearError
  };

  return (
    <CreditsContext.Provider value={contextValue}>
      {children}
    </CreditsContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useCredits = (): CreditsContextType => {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};

// ============================================================================
// EXPORTS
// ============================================================================

export { CreditsContext };
export type { CreditsContextType, CreditsState, CreditsAction };
