/**
 * Fee Calculation Service
 * 
 * Handles all fee calculations for the LocalEx platform,
 * including base fees, percentage fees, and fee validation.
 */

import { FeeCalculation, FeeStructure } from './credits.types';

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

export const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  baseFeeCents: 199, // $1.99
  percentageFeeBasisPoints: 375, // 3.75%
  minimumTradeAmount: 100, // $1.00 minimum
  maximumFeeCents: 5000 // $50.00 maximum fee cap
};

// ============================================================================
// FEE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate fees for a trade amount
 */
export const calculateFees = (tradeAmountCents: number, feeStructure: FeeStructure = DEFAULT_FEE_STRUCTURE): FeeCalculation => {
  // Validate trade amount
  if (tradeAmountCents < feeStructure.minimumTradeAmount) {
    throw new Error(`Trade amount must be at least $${feeStructure.minimumTradeAmount / 100}`);
  }

  // Calculate base fee
  const baseFeeAmount = feeStructure.baseFeeCents;

  // Calculate percentage fee
  const percentageFeeAmount = Math.round((tradeAmountCents * feeStructure.percentageFeeBasisPoints) / 10000);

  // Calculate total fee
  let totalFee = baseFeeAmount + percentageFeeAmount;

  // Apply maximum fee cap if configured
  if (feeStructure.maximumFeeCents && totalFee > feeStructure.maximumFeeCents) {
    totalFee = feeStructure.maximumFeeCents;
  }

  return {
    baseFee: feeStructure.baseFeeCents,
    percentageFee: feeStructure.percentageFeeBasisPoints,
    tradeAmount: tradeAmountCents,
    calculatedFee: totalFee,
    breakdown: {
      baseFeeAmount,
      percentageFeeAmount: feeStructure.maximumFeeCents && percentageFeeAmount > (feeStructure.maximumFeeCents - baseFeeAmount) 
        ? (feeStructure.maximumFeeCents - baseFeeAmount)
        : percentageFeeAmount,
      totalFee
    }
  };
};

/**
 * Calculate fees for multiple trade amounts (bulk calculation)
 */
export const calculateBulkFees = (tradeAmounts: number[], feeStructure: FeeStructure = DEFAULT_FEE_STRUCTURE): FeeCalculation[] => {
  return tradeAmounts.map(amount => calculateFees(amount, feeStructure));
};

/**
 * Calculate net amount after fees
 */
export const calculateNetAmount = (grossAmountCents: number, feeStructure: FeeStructure = DEFAULT_FEE_STRUCTURE): number => {
  const feeCalculation = calculateFees(grossAmountCents, feeStructure);
  return grossAmountCents - feeCalculation.calculatedFee;
};

/**
 * Calculate gross amount needed to achieve net amount
 */
export const calculateGrossAmount = (netAmountCents: number, feeStructure: FeeStructure = DEFAULT_FEE_STRUCTURE): number => {
  // For percentage-based fees, we need to solve: net = gross - baseFee - (gross * percentage)
  // This gives us: gross = (net + baseFee) / (1 - percentage)
  const percentage = feeStructure.percentageFeeBasisPoints / 10000;
  const grossAmount = Math.ceil((netAmountCents + feeStructure.baseFeeCents) / (1 - percentage));
  
  // Verify the calculation
  const verification = calculateFees(grossAmount, feeStructure);
  if (grossAmount - verification.calculatedFee !== netAmountCents) {
    // If verification fails, add the difference
    return grossAmount + (netAmountCents - (grossAmount - verification.calculatedFee));
  }
  
  return grossAmount;
};

/**
 * Validate fee structure configuration
 */
export const validateFeeStructure = (feeStructure: FeeStructure): string[] => {
  const errors: string[] = [];

  if (feeStructure.baseFeeCents < 0) {
    errors.push('Base fee cannot be negative');
  }

  if (feeStructure.percentageFeeBasisPoints < 0 || feeStructure.percentageFeeBasisPoints > 10000) {
    errors.push('Percentage fee must be between 0 and 10000 basis points (0-100%)');
  }

  if (feeStructure.minimumTradeAmount < 0) {
    errors.push('Minimum trade amount cannot be negative');
  }

  if (feeStructure.maximumFeeCents && feeStructure.maximumFeeCents < feeStructure.baseFeeCents) {
    errors.push('Maximum fee cannot be less than base fee');
  }

  return errors;
};

/**
 * Get fee structure for display purposes
 */
export const getFeeStructureDisplay = (feeStructure: FeeStructure = DEFAULT_FEE_STRUCTURE) => {
  return {
    baseFee: `$${(feeStructure.baseFeeCents / 100).toFixed(2)}`,
    percentageFee: `${(feeStructure.percentageFeeBasisPoints / 100).toFixed(2)}%`,
    minimumTrade: `$${(feeStructure.minimumTradeAmount / 100).toFixed(2)}`,
    maximumFee: feeStructure.maximumFeeCents ? `$${(feeStructure.maximumFeeCents / 100).toFixed(2)}` : 'No limit'
  };
};

/**
 * Calculate fee breakdown for display
 */
export const getFeeBreakdownDisplay = (feeCalculation: FeeCalculation) => {
  return {
    tradeAmount: `$${(feeCalculation.tradeAmount / 100).toFixed(2)}`,
    baseFee: `$${(feeCalculation.breakdown.baseFeeAmount / 100).toFixed(2)}`,
    percentageFee: `$${(feeCalculation.breakdown.percentageFeeAmount / 100).toFixed(2)} (${feeCalculation.percentageFee / 100}%)`,
    totalFee: `$${(feeCalculation.breakdown.totalFee / 100).toFixed(2)}`,
    netAmount: `$${((feeCalculation.tradeAmount - feeCalculation.breakdown.totalFee) / 100).toFixed(2)}`
  };
};

/**
 * Compare fee structures
 */
export const compareFeeStructures = (structure1: FeeStructure, structure2: FeeStructure, testAmounts: number[] = [100, 500, 1000, 5000, 10000]) => {
  const comparison = testAmounts.map(amount => {
    const fees1 = calculateFees(amount, structure1);
    const fees2 = calculateFees(amount, structure2);
    
    return {
      tradeAmount: amount,
      structure1Fees: fees1.calculatedFee,
      structure2Fees: fees2.calculatedFee,
      difference: fees2.calculatedFee - fees1.calculatedFee,
      percentageDifference: ((fees2.calculatedFee - fees1.calculatedFee) / fees1.calculatedFee) * 100
    };
  });

  return comparison;
};

// ============================================================================
// FEE CALCULATION UTILITIES
// ============================================================================

/**
 * Round to nearest cent (for fee calculations)
 */
export const roundToCents = (amount: number): number => {
  return Math.round(amount);
};

/**
 * Convert dollars to cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Format amount for display
 */
export const formatAmount = (cents: number, includeCurrency: boolean = true): string => {
  const dollars = centsToDollars(cents);
  const formatted = dollars.toFixed(2);
  return includeCurrency ? `$${formatted}` : formatted;
};

// ============================================================================
// EXPORTS
// ============================================================================

// All functions and constants are already exported individually above
