/**
 * Fee Calculation Service Tests
 * 
 * Comprehensive unit tests for fee calculation functionality,
 * including base fees, percentage fees, and validation.
 */

import {
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
} from '../feeCalculationService';
import { CreditsErrorCode } from '../credits.types';

// ============================================================================
// FEE CALCULATION TESTS
// ============================================================================

describe('Fee Calculation', () => {
  describe('calculateFees', () => {
    it('should calculate fees correctly for $100 trade', () => {
      const tradeAmount = 10000; // $100.00 in cents
      const result = calculateFees(tradeAmount);

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
      const result = calculateFees(tradeAmount);

      expect(result.tradeAmount).toBe(1000);
      expect(result.baseFee).toBe(199); // $1.99
      expect(result.percentageFee).toBe(375); // 3.75%
      expect(result.calculatedFee).toBe(199 + 37); // $1.99 + $0.37 = $2.36
      expect(result.breakdown.baseFeeAmount).toBe(199);
      expect(result.breakdown.percentageFeeAmount).toBe(37);
      expect(result.breakdown.totalFee).toBe(236);
    });

    it('should calculate fees correctly for $1 trade', () => {
      const tradeAmount = 100; // $1.00 in cents
      const result = calculateFees(tradeAmount);

      expect(result.tradeAmount).toBe(100);
      expect(result.baseFee).toBe(199); // $1.99
      expect(result.percentageFee).toBe(375); // 3.75%
      expect(result.calculatedFee).toBe(199 + 3); // $1.99 + $0.03 = $2.02
      expect(result.breakdown.baseFeeAmount).toBe(199);
      expect(result.breakdown.percentageFeeAmount).toBe(3);
      expect(result.breakdown.totalFee).toBe(202);
    });

    it('should apply maximum fee cap', () => {
      const tradeAmount = 1000000; // $10,000.00 in cents
      const result = calculateFees(tradeAmount);

      expect(result.tradeAmount).toBe(1000000);
      expect(result.calculatedFee).toBe(5000); // Capped at $50.00
      expect(result.breakdown.totalFee).toBe(5000);
    });

    it('should reject trade amount below minimum', () => {
      const tradeAmount = 50; // $0.50 in cents - below $1.00 minimum

      expect(() => calculateFees(tradeAmount)).toThrow();
    });

    it('should work with custom fee structure', () => {
      const customFeeStructure = {
        baseFeeCents: 100, // $1.00
        percentageFeeBasisPoints: 500, // 5.00%
        minimumTradeAmount: 200, // $2.00
        maximumFeeCents: 1000 // $10.00
      };

      const tradeAmount = 2000; // $20.00 in cents
      const result = calculateFees(tradeAmount, customFeeStructure);

      expect(result.tradeAmount).toBe(2000);
      expect(result.baseFee).toBe(100); // $1.00
      expect(result.percentageFee).toBe(500); // 5.00%
      expect(result.calculatedFee).toBe(100 + 100); // $1.00 + $1.00 = $2.00
      expect(result.breakdown.baseFeeAmount).toBe(100);
      expect(result.breakdown.percentageFeeAmount).toBe(100);
      expect(result.breakdown.totalFee).toBe(200);
    });
  });

  describe('calculateBulkFees', () => {
    it('should calculate fees for multiple amounts', () => {
      const tradeAmounts = [1000, 5000, 10000]; // $10, $50, $100
      const results = calculateBulkFees(tradeAmounts);

      expect(results).toHaveLength(3);
      expect(results[0].tradeAmount).toBe(1000);
      expect(results[0].calculatedFee).toBe(199 + 37); // $2.36
      expect(results[1].tradeAmount).toBe(5000);
      expect(results[1].calculatedFee).toBe(199 + 187); // $3.86
      expect(results[2].tradeAmount).toBe(10000);
      expect(results[2].calculatedFee).toBe(199 + 375); // $5.74
    });
  });

  describe('calculateNetAmount', () => {
    it('should calculate net amount after fees', () => {
      const grossAmount = 10000; // $100.00 in cents
      const netAmount = calculateNetAmount(grossAmount);

      expect(netAmount).toBe(10000 - 574); // $100.00 - $5.74 = $94.26
    });
  });

  describe('calculateGrossAmount', () => {
    it('should calculate gross amount needed for net amount', () => {
      const netAmount = 9426; // $94.26 in cents
      const grossAmount = calculateGrossAmount(netAmount);

      // Should be approximately $100.00 to achieve $94.26 net
      expect(grossAmount).toBeGreaterThan(10000);
      expect(grossAmount).toBeLessThan(10100);
    });
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Fee Structure Validation', () => {
  describe('validateFeeStructure', () => {
    it('should validate correct fee structure', () => {
      const validStructure = {
        baseFeeCents: 199,
        percentageFeeBasisPoints: 375,
        minimumTradeAmount: 100,
        maximumFeeCents: 5000
      };

      const errors = validateFeeStructure(validStructure);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative base fee', () => {
      const invalidStructure = {
        baseFeeCents: -100,
        percentageFeeBasisPoints: 375,
        minimumTradeAmount: 100,
        maximumFeeCents: 5000
      };

      const errors = validateFeeStructure(invalidStructure);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Base fee cannot be negative');
    });

    it('should reject invalid percentage fee', () => {
      const invalidStructure = {
        baseFeeCents: 199,
        percentageFeeBasisPoints: 15000, // 150% - invalid
        minimumTradeAmount: 100,
        maximumFeeCents: 5000
      };

      const errors = validateFeeStructure(invalidStructure);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Percentage fee must be between 0 and 10000 basis points');
    });

    it('should reject negative minimum trade amount', () => {
      const invalidStructure = {
        baseFeeCents: 199,
        percentageFeeBasisPoints: 375,
        minimumTradeAmount: -100,
        maximumFeeCents: 5000
      };

      const errors = validateFeeStructure(invalidStructure);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Minimum trade amount cannot be negative');
    });

    it('should reject maximum fee less than base fee', () => {
      const invalidStructure = {
        baseFeeCents: 199,
        percentageFeeBasisPoints: 375,
        minimumTradeAmount: 100,
        maximumFeeCents: 100 // Less than base fee
      };

      const errors = validateFeeStructure(invalidStructure);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Maximum fee cannot be less than base fee');
    });
  });
});

// ============================================================================
// DISPLAY FORMATTING TESTS
// ============================================================================

describe('Display Formatting', () => {
  describe('getFeeStructureDisplay', () => {
    it('should format fee structure for display', () => {
      const display = getFeeStructureDisplay();

      expect(display.baseFee).toBe('$1.99');
      expect(display.percentageFee).toBe('3.75%');
      expect(display.minimumTrade).toBe('$1.00');
      expect(display.maximumFee).toBe('$50.00');
    });

    it('should format custom fee structure for display', () => {
      const customStructure = {
        baseFeeCents: 100,
        percentageFeeBasisPoints: 500,
        minimumTradeAmount: 200,
        maximumFeeCents: 1000
      };

      const display = getFeeStructureDisplay(customStructure);

      expect(display.baseFee).toBe('$1.00');
      expect(display.percentageFee).toBe('5.00%');
      expect(display.minimumTrade).toBe('$2.00');
      expect(display.maximumFee).toBe('$10.00');
    });
  });

  describe('getFeeBreakdownDisplay', () => {
    it('should format fee breakdown for display', () => {
      const feeCalculation = {
        baseFee: 199,
        percentageFee: 375,
        tradeAmount: 10000,
        calculatedFee: 574,
        breakdown: {
          baseFeeAmount: 199,
          percentageFeeAmount: 375,
          totalFee: 574
        }
      };

      const display = getFeeBreakdownDisplay(feeCalculation);

      expect(display.tradeAmount).toBe('$100.00');
      expect(display.baseFee).toBe('$1.99');
      expect(display.percentageFee).toBe('$3.75 (3.75%)');
      expect(display.totalFee).toBe('$5.74');
      expect(display.netAmount).toBe('$94.26');
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('roundToCents', () => {
    it('should round amounts to nearest cent', () => {
      expect(roundToCents(123.456)).toBe(123);
      expect(roundToCents(123.654)).toBe(124);
      expect(roundToCents(123.5)).toBe(124);
    });
  });

  describe('dollarsToCents', () => {
    it('should convert dollars to cents', () => {
      expect(dollarsToCents(1.99)).toBe(199);
      expect(dollarsToCents(100.00)).toBe(10000);
      expect(dollarsToCents(0.01)).toBe(1);
    });
  });

  describe('centsToDollars', () => {
    it('should convert cents to dollars', () => {
      expect(centsToDollars(199)).toBe(1.99);
      expect(centsToDollars(10000)).toBe(100.00);
      expect(centsToDollars(1)).toBe(0.01);
    });
  });

  describe('formatAmount', () => {
    it('should format amounts with currency', () => {
      expect(formatAmount(199)).toBe('$1.99');
      expect(formatAmount(10000)).toBe('$100.00');
      expect(formatAmount(0)).toBe('$0.00');
    });

    it('should format amounts without currency', () => {
      expect(formatAmount(199, false)).toBe('1.99');
      expect(formatAmount(10000, false)).toBe('100.00');
      expect(formatAmount(0, false)).toBe('0.00');
    });
  });
});

// ============================================================================
// COMPARISON TESTS
// ============================================================================

describe('Fee Structure Comparison', () => {
  describe('compareFeeStructures', () => {
    it('should compare two fee structures', () => {
      const structure1 = {
        baseFeeCents: 199,
        percentageFeeBasisPoints: 375,
        minimumTradeAmount: 100,
        maximumFeeCents: 5000
      };

      const structure2 = {
        baseFeeCents: 100,
        percentageFeeBasisPoints: 500,
        minimumTradeAmount: 200,
        maximumFeeCents: 1000
      };

      const comparison = compareFeeStructures(structure1, structure2, [1000, 5000, 10000]);

      expect(comparison).toHaveLength(3);
      expect(comparison[0].tradeAmount).toBe(1000);
      expect(comparison[0].structure1Fees).toBe(199 + 37); // $2.36
      expect(comparison[0].structure2Fees).toBe(100 + 50); // $1.50
      expect(comparison[0].difference).toBe((100 + 50) - (199 + 37)); // structure2 - structure1
    });
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Default Configuration', () => {
  it('should have correct default fee structure', () => {
    expect(DEFAULT_FEE_STRUCTURE.baseFeeCents).toBe(199); // $1.99
    expect(DEFAULT_FEE_STRUCTURE.percentageFeeBasisPoints).toBe(375); // 3.75%
    expect(DEFAULT_FEE_STRUCTURE.minimumTradeAmount).toBe(100); // $1.00
    expect(DEFAULT_FEE_STRUCTURE.maximumFeeCents).toBe(5000); // $50.00
  });
});
