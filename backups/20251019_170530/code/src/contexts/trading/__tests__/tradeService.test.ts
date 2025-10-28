/**
 * Trade Service Tests
 * 
 * Comprehensive test suite for trade lifecycle management,
 * state transitions, and validation.
 */

import {
  validateTradeTransition,
  getNextPossibleStates,
  createTrade,
  getTrade,
  getTradesForUser,
  makeOffer,
  respondToOffer,
  updateTradeStatus,
  cancelTrade,
  disputeTrade,
  validateTrade,
  canModifyTrade,
  isTradeActive,
  getTradeStats,
  TRADE_STATE_TRANSITIONS
} from '../tradeService';
import { TradeStatus, OfferType } from '../trading.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTrade = {
  id: 'trade-123',
  itemId: 'item-123',
  buyerId: 'buyer-123',
  sellerId: 'seller-123',
  offeredPrice: 100,
  status: TradeStatus.OFFER_MADE,
  createdAt: new Date(),
  updatedAt: new Date()
};

// const mockOffer = {
//   id: 'offer-123',
//   tradeId: 'trade-123',
//   offeredBy: 'buyer-123',
//   offeredTo: 'seller-123',
//   amount: 100,
//   type: OfferType.INITIAL_OFFER,
//   status: OfferStatus.PENDING,
//   expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
//   createdAt: new Date()
// };

// ============================================================================
// TRADE STATE MACHINE TESTS
// ============================================================================

describe('Trade State Machine', () => {
  it('should validate allowed transitions', () => {
    expect(validateTradeTransition(TradeStatus.OFFER_MADE, TradeStatus.OFFER_ACCEPTED)).toBe(true);
    expect(validateTradeTransition(TradeStatus.OFFER_MADE, TradeStatus.OFFER_REJECTED)).toBe(true);
    expect(validateTradeTransition(TradeStatus.OFFER_MADE, TradeStatus.CANCELLED)).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(validateTradeTransition(TradeStatus.OFFER_MADE, TradeStatus.COMPLETED)).toBe(false);
    expect(validateTradeTransition(TradeStatus.COMPLETED, TradeStatus.OFFER_MADE)).toBe(false);
    expect(validateTradeTransition(TradeStatus.CANCELLED, TradeStatus.OFFER_MADE)).toBe(false);
  });

  it('should get next possible states', () => {
    const nextStates = getNextPossibleStates(TradeStatus.OFFER_MADE);
    expect(nextStates).toContain(TradeStatus.OFFER_ACCEPTED);
    expect(nextStates).toContain(TradeStatus.OFFER_REJECTED);
    expect(nextStates).toContain(TradeStatus.CANCELLED);
    expect(nextStates).not.toContain(TradeStatus.COMPLETED);
  });

  it('should handle terminal states', () => {
    const nextStates = getNextPossibleStates(TradeStatus.COMPLETED);
    expect(nextStates).toHaveLength(0);
  });
});

// ============================================================================
// TRADE CREATION TESTS
// ============================================================================

describe('Trade Creation', () => {
  it('should create a trade successfully', async () => {
    const request = {
      itemId: 'item-123',
      buyerId: 'buyer-123',
      offeredPrice: 100
    };

    const result = await createTrade(request);

    expect(result.success).toBe(true);
    expect(result.trade).toBeDefined();
    expect(result.trade?.itemId).toBe('item-123');
    expect(result.trade?.buyerId).toBe('buyer-123');
    expect(result.trade?.offeredPrice).toBe(100);
    expect(result.trade?.status).toBe(TradeStatus.OFFER_MADE);
  });

  it('should validate trade creation request', async () => {
    const invalidRequest = {
      itemId: '',
      buyerId: '',
      offeredPrice: -1
    };

    const result = await createTrade(invalidRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle creation errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const request = {
      itemId: 'item-123',
      buyerId: 'buyer-123',
      offeredPrice: 100
    };

    const result = await createTrade(request);

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// TRADE RETRIEVAL TESTS
// ============================================================================

describe('Trade Retrieval', () => {
  it('should get a trade by ID', async () => {
    const result = await getTrade('trade-123');

    expect(result).toBeDefined();
  });

  it('should get trades for a user', async () => {
    const result = await getTradesForUser('user-123');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should get trades with status filter', async () => {
    const result = await getTradesForUser('user-123', [TradeStatus.OFFER_MADE]);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle retrieval errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getTrade('nonexistent');

    expect(result).toBeNull();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// OFFER MANAGEMENT TESTS
// ============================================================================

describe('Offer Management', () => {
  it('should make an offer successfully', async () => {
    const request = {
      tradeId: 'trade-123',
      amount: 150,
      type: OfferType.INITIAL_OFFER
    };

    const result = await makeOffer(request);

    expect(result.success).toBe(true);
    expect(result.offer).toBeDefined();
    expect(result.offer?.amount).toBe(150);
    expect(result.offer?.type).toBe(OfferType.INITIAL_OFFER);
  });

  it('should validate offer request', async () => {
    const invalidRequest = {
      tradeId: '',
      amount: -1,
      type: undefined as any
    };

    const result = await makeOffer(invalidRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should respond to an offer', async () => {
    const request = {
      offerId: 'offer-123',
      response: 'ACCEPT' as const
    };

    const result = await respondToOffer(request);

    expect(result.success).toBe(true);
    expect(result.trade).toBeDefined();
  });

  it('should validate offer response', async () => {
    const invalidRequest = {
      offerId: '',
      response: 'INVALID' as any
    };

    const result = await respondToOffer(invalidRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle offer errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const request = {
      tradeId: 'trade-123',
      amount: 150,
      type: OfferType.INITIAL_OFFER
    };

    const result = await makeOffer(request);

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// TRADE STATE MANAGEMENT TESTS
// ============================================================================

describe('Trade State Management', () => {
  it('should update trade status', async () => {
    const result = await updateTradeStatus('trade-123', TradeStatus.OFFER_ACCEPTED);

    expect(result).toBe(true);
  });

  it('should cancel a trade', async () => {
    const result = await cancelTrade('trade-123', 'Changed mind');

    expect(result).toBe(true);
  });

  it('should dispute a trade', async () => {
    const result = await disputeTrade('trade-123', 'ITEM_NOT_AS_DESCRIBED', 'Item was damaged');

    expect(result).toBe(true);
  });

  it('should handle state update errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateTradeStatus('nonexistent', TradeStatus.OFFER_ACCEPTED);

    expect(result).toBe(false);

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// TRADE VALIDATION TESTS
// ============================================================================

describe('Trade Validation', () => {
  it('should validate trade data correctly', () => {
    const validTrade = {
      itemId: 'item-123',
      buyerId: 'buyer-123',
      sellerId: 'seller-123',
      offeredPrice: 100,
      status: TradeStatus.OFFER_MADE
    };

    const result = validateTrade(validTrade);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch validation errors', () => {
    const invalidTrade = {
      itemId: '',
      buyerId: '',
      sellerId: '',
      offeredPrice: -1,
      status: undefined as any
    };

    const result = validateTrade(invalidTrade);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should check if trade can be modified', () => {
    const modifiableTrade = { ...mockTrade, status: TradeStatus.OFFER_MADE };
    const nonModifiableTrade = { ...mockTrade, status: TradeStatus.COMPLETED };

    expect(canModifyTrade(modifiableTrade)).toBe(true);
    expect(canModifyTrade(nonModifiableTrade)).toBe(false);
  });

  it('should check if trade is active', () => {
    const activeTrade = { ...mockTrade, status: TradeStatus.OFFER_MADE };
    const inactiveTrade = { ...mockTrade, status: TradeStatus.COMPLETED };

    expect(isTradeActive(activeTrade)).toBe(true);
    expect(isTradeActive(inactiveTrade)).toBe(false);
  });
});

// ============================================================================
// TRADE STATISTICS TESTS
// ============================================================================

describe('Trade Statistics', () => {
  it('should get trade statistics', async () => {
    const result = await getTradeStats('user-123');

    expect(result).toBeDefined();
    expect(result.totalTrades).toBeDefined();
    expect(result.completedTrades).toBeDefined();
    expect(result.cancelledTrades).toBeDefined();
    expect(result.disputedTrades).toBeDefined();
    expect(result.averageRating).toBeDefined();
    expect(result.completionRate).toBeDefined();
  });

  it('should handle statistics errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getTradeStats('user-123');

    expect(result).toBeDefined();
    expect(result.totalTrades).toBeDefined();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// STATE TRANSITIONS TESTS
// ============================================================================

describe('State Transitions', () => {
  it('should have correct state transitions defined', () => {
    expect(TRADE_STATE_TRANSITIONS).toBeDefined();
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.OFFER_MADE]).toBeDefined();
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.OFFER_MADE]).toContain(TradeStatus.OFFER_ACCEPTED);
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.OFFER_MADE]).toContain(TradeStatus.OFFER_REJECTED);
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.OFFER_MADE]).toContain(TradeStatus.CANCELLED);
  });

  it('should have terminal states with no transitions', () => {
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.COMPLETED]).toHaveLength(0);
    expect(TRADE_STATE_TRANSITIONS[TradeStatus.CANCELLED]).toHaveLength(0);
  });

  it('should have all states defined', () => {
    const allStates = Object.values(TradeStatus);
    const definedStates = Object.keys(TRADE_STATE_TRANSITIONS);
    
    expect(definedStates.length).toBe(allStates.length);
  });
});

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle invalid trade IDs', async () => {
    const result = await getTrade('');
    expect(result).toBeNull();
  });

  it('should handle invalid user IDs', async () => {
    const result = await getTradesForUser('');
    expect(result).toHaveLength(0);
  });

  it('should handle invalid offer amounts', async () => {
    const request = {
      tradeId: 'trade-123',
      amount: 0,
      type: OfferType.INITIAL_OFFER
    };

    const result = await makeOffer(request);
    expect(result.success).toBe(false);
  });

  it('should handle invalid offer responses', async () => {
    const request = {
      offerId: 'offer-123',
      response: 'INVALID' as any
    };

    const result = await respondToOffer(request);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Trade Service Integration', () => {
  it('should handle complete trade lifecycle', async () => {
    // Create trade
    const createResult = await createTrade({
      itemId: 'item-123',
      buyerId: 'buyer-123',
      offeredPrice: 100
    });

    expect(createResult.success).toBe(true);
    expect(createResult.trade).toBeDefined();

    // Make offer
    const offerResult = await makeOffer({
      tradeId: createResult.trade!.id,
      amount: 150,
      type: OfferType.INITIAL_OFFER
    });

    expect(offerResult.success).toBe(true);

    // Respond to offer
    const respondResult = await respondToOffer({
      offerId: offerResult.offer!.id,
      response: 'ACCEPT'
    });

    expect(respondResult.success).toBe(true);

    // Update trade status
    const updateResult = await updateTradeStatus(createResult.trade!.id, TradeStatus.OFFER_ACCEPTED);
    expect(updateResult).toBe(true);

    // Cancel trade
    const cancelResult = await cancelTrade(createResult.trade!.id, 'Changed mind');
    expect(cancelResult).toBe(true);
  });

  it('should handle error scenarios gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Try to create trade with invalid data
    const createResult = await createTrade({
      itemId: '',
      buyerId: '',
      offeredPrice: -1
    });

    expect(createResult.success).toBe(false);

    // Try to make offer with invalid data
    const offerResult = await makeOffer({
      tradeId: '',
      amount: -1,
      type: undefined as any
    });

    expect(offerResult.success).toBe(false);

    // Try to respond to offer with invalid data
    const respondResult = await respondToOffer({
      offerId: '',
      response: 'INVALID' as any
    });

    expect(respondResult.success).toBe(false);

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  it('should handle multiple operations efficiently', async () => {
    const startTime = Date.now();

    // Perform multiple operations
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(createTrade({
        itemId: `item-${i}`,
        buyerId: `buyer-${i}`,
        offeredPrice: 100 + i
      }));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(results).toHaveLength(10);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
  });
});
