/**
 * Trade Service
 * 
 * Handles trade lifecycle management, state transitions,
 * and coordination for the LocalEx platform.
 */

import { 
  Trade, 
  TradeOffer, 
  TradeStatus, 
  OfferType, 
  OfferStatus,
  CreateTradeRequest,
  CreateTradeResponse,
  MakeOfferRequest,
  MakeOfferResponse,
  RespondToOfferRequest,
  RespondToOfferResponse,
  TradingError,
  TradingErrorCode
} from './trading.types';

// ============================================================================
// TRADE STATE MACHINE
// ============================================================================

export const TRADE_STATE_TRANSITIONS: Record<TradeStatus, TradeStatus[]> = {
  [TradeStatus.OFFER_MADE]: [TradeStatus.OFFER_ACCEPTED, TradeStatus.OFFER_REJECTED, TradeStatus.CANCELLED],
  [TradeStatus.OFFER_ACCEPTED]: [TradeStatus.LOCATION_SELECTING, TradeStatus.CANCELLED],
  [TradeStatus.OFFER_REJECTED]: [TradeStatus.CANCELLED],
  [TradeStatus.LOCATION_SELECTING]: [TradeStatus.LOCATION_CONFIRMED, TradeStatus.CANCELLED],
  [TradeStatus.LOCATION_CONFIRMED]: [TradeStatus.TIME_SELECTING, TradeStatus.CANCELLED],
  [TradeStatus.TIME_SELECTING]: [TradeStatus.TIME_CONFIRMED, TradeStatus.CANCELLED],
  [TradeStatus.TIME_CONFIRMED]: [TradeStatus.ESCROW_CREATED, TradeStatus.CANCELLED],
  [TradeStatus.ESCROW_CREATED]: [TradeStatus.AWAITING_ARRIVAL, TradeStatus.CANCELLED, TradeStatus.DISPUTED],
  [TradeStatus.AWAITING_ARRIVAL]: [TradeStatus.BOTH_ARRIVED, TradeStatus.CANCELLED, TradeStatus.DISPUTED],
  [TradeStatus.BOTH_ARRIVED]: [TradeStatus.HANDOFF_PENDING, TradeStatus.CANCELLED, TradeStatus.DISPUTED],
  [TradeStatus.HANDOFF_PENDING]: [TradeStatus.COMPLETED, TradeStatus.CANCELLED, TradeStatus.DISPUTED],
  [TradeStatus.COMPLETED]: [],
  [TradeStatus.CANCELLED]: [],
  [TradeStatus.DISPUTED]: [TradeStatus.COMPLETED, TradeStatus.CANCELLED]
};

/**
 * Validates if a trade state transition is allowed
 */
export const validateTradeTransition = (currentStatus: TradeStatus, newStatus: TradeStatus): boolean => {
  const allowedTransitions = TRADE_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
};

/**
 * Gets the next possible states for a trade
 */
export const getNextPossibleStates = (currentStatus: TradeStatus): TradeStatus[] => {
  return TRADE_STATE_TRANSITIONS[currentStatus] || [];
};

// ============================================================================
// TRADE CREATION
// ============================================================================

/**
 * Creates a new trade
 */
export const createTrade = async (request: CreateTradeRequest): Promise<CreateTradeResponse> => {
  try {
    // Validate request
    const validation = validateCreateTradeRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // TODO: Implement actual trade creation with database
    // const trade = await database.query(`
    //   INSERT INTO trades (item_id, buyer_id, seller_id, offered_price, status, created_at, updated_at)
    //   VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    //   RETURNING *
    // `, [request.itemId, request.buyerId, request.sellerId, request.offeredPrice, TradeStatus.OFFER_MADE]);

    // Mock implementation for now
    const trade: Trade = {
      id: 'trade-' + Date.now(),
      itemId: request.itemId,
      buyerId: request.buyerId,
      sellerId: 'seller-123', // Mock seller ID
      offeredPrice: request.offeredPrice,
      status: TradeStatus.OFFER_MADE,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      trade
    };
  } catch (error) {
    console.error('Error creating trade:', error);
    return {
      success: false,
      error: 'Failed to create trade'
    };
  }
};

/**
 * Validates create trade request
 */
const validateCreateTradeRequest = (request: CreateTradeRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!request.itemId || request.itemId.trim().length === 0) {
    errors.push('Item ID is required');
  }

  if (!request.buyerId || request.buyerId.trim().length === 0) {
    errors.push('Buyer ID is required');
  }

  if (!request.offeredPrice || request.offeredPrice <= 0) {
    errors.push('Offered price must be greater than 0');
  }

  if (request.offeredPrice > 100000) {
    errors.push('Offered price cannot exceed 100,000 credits');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// TRADE RETRIEVAL
// ============================================================================

/**
 * Gets a trade by ID
 */
export const getTrade = async (tradeId: string): Promise<Trade | null> => {
  try {
    // TODO: Implement actual trade retrieval
    // const result = await database.query('SELECT * FROM trades WHERE id = $1', [tradeId]);
    // return result.rows[0] || null;

    // Mock implementation for now
    return null;
  } catch (error) {
    console.error('Error getting trade:', error);
    return null;
  }
};

/**
 * Gets trades for a user
 */
export const getTradesForUser = async (userId: string, status?: TradeStatus[]): Promise<Trade[]> => {
  try {
    // TODO: Implement actual trade retrieval
    // let query = 'SELECT * FROM trades WHERE buyer_id = $1 OR seller_id = $1';
    // const params = [userId];
    // 
    // if (status && status.length > 0) {
    //   query += ' AND status = ANY($2)';
    //   params.push(status);
    // }
    // 
    // query += ' ORDER BY created_at DESC';
    // const result = await database.query(query, params);
    // return result.rows;

    // Mock implementation for now
    return [];
  } catch (error) {
    console.error('Error getting trades for user:', error);
    return [];
  }
};

// ============================================================================
// OFFER MANAGEMENT
// ============================================================================

/**
 * Makes an offer on a trade
 */
export const makeOffer = async (request: MakeOfferRequest): Promise<MakeOfferResponse> => {
  try {
    // Validate request
    const validation = validateMakeOfferRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Check if trade exists and is in correct state
    const trade = await getTrade(request.tradeId);
    if (!trade) {
      return {
        success: false,
        error: 'Trade not found'
      };
    }

    if (trade.status !== TradeStatus.OFFER_MADE) {
      return {
        success: false,
        error: 'Trade is not in correct state for offers'
      };
    }

    // TODO: Implement actual offer creation
    // const offer = await database.query(`
    //   INSERT INTO trade_offers (trade_id, offered_by, offered_to, amount, type, status, expires_at, created_at)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    //   RETURNING *
    // `, [request.tradeId, request.offeredBy, request.offeredTo, request.amount, request.type, OfferStatus.PENDING, new Date(Date.now() + 24 * 60 * 60 * 1000)]);

    // Mock implementation for now
    const offer: TradeOffer = {
      id: 'offer-' + Date.now(),
      tradeId: request.tradeId,
      offeredBy: 'buyer-123',
      offeredTo: 'seller-123',
      amount: request.amount,
      type: request.type,
      status: OfferStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    };

    return {
      success: true,
      offer
    };
  } catch (error) {
    console.error('Error making offer:', error);
    return {
      success: false,
      error: 'Failed to make offer'
    };
  }
};

/**
 * Responds to an offer
 */
export const respondToOffer = async (request: RespondToOfferRequest): Promise<RespondToOfferResponse> => {
  try {
    // Validate request
    const validation = validateRespondToOfferRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // TODO: Implement actual offer response
    // const offer = await database.query('SELECT * FROM trade_offers WHERE id = $1', [request.offerId]);
    // if (!offer.rows[0]) {
    //   return { success: false, error: 'Offer not found' };
    // }

    // Update offer status
    // await database.query(`
    //   UPDATE trade_offers 
    //   SET status = $1, responded_at = NOW()
    //   WHERE id = $2
    // `, [request.response === 'ACCEPT' ? OfferStatus.ACCEPTED : OfferStatus.REJECTED, request.offerId]);

    // Update trade status
    // const newStatus = request.response === 'ACCEPT' ? TradeStatus.OFFER_ACCEPTED : TradeStatus.OFFER_REJECTED;
    // await database.query(`
    //   UPDATE trades 
    //   SET status = $1, updated_at = NOW()
    //   WHERE id = $2
    // `, [newStatus, offer.rows[0].trade_id]);

    // Mock implementation for now
    const trade: Trade = {
      id: 'trade-123',
      itemId: 'item-123',
      buyerId: 'buyer-123',
      sellerId: 'seller-123',
      offeredPrice: 100,
      status: request.response === 'ACCEPT' ? TradeStatus.OFFER_ACCEPTED : TradeStatus.OFFER_REJECTED,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      trade
    };
  } catch (error) {
    console.error('Error responding to offer:', error);
    return {
      success: false,
      error: 'Failed to respond to offer'
    };
  }
};

/**
 * Validates make offer request
 */
const validateMakeOfferRequest = (request: MakeOfferRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!request.tradeId || request.tradeId.trim().length === 0) {
    errors.push('Trade ID is required');
  }

  if (!request.amount || request.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (request.amount > 100000) {
    errors.push('Amount cannot exceed 100,000 credits');
  }

  if (!request.type) {
    errors.push('Offer type is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates respond to offer request
 */
const validateRespondToOfferRequest = (request: RespondToOfferRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!request.offerId || request.offerId.trim().length === 0) {
    errors.push('Offer ID is required');
  }

  if (!request.response || !['ACCEPT', 'REJECT'].includes(request.response)) {
    errors.push('Response must be ACCEPT or REJECT');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// TRADE STATE MANAGEMENT
// ============================================================================

/**
 * Updates trade status
 */
export const updateTradeStatus = async (tradeId: string, newStatus: TradeStatus): Promise<boolean> => {
  try {
    // Get current trade
    const trade = await getTrade(tradeId);
    if (!trade) {
      return false;
    }

    // Validate transition
    if (!validateTradeTransition(trade.status, newStatus)) {
      console.error(`Invalid trade transition from ${trade.status} to ${newStatus}`);
      return false;
    }

    // TODO: Implement actual trade status update
    // await database.query(`
    //   UPDATE trades 
    //   SET status = $1, updated_at = NOW()
    //   WHERE id = $2
    // `, [newStatus, tradeId]);

    // Mock implementation for now
    return true;
  } catch (error) {
    console.error('Error updating trade status:', error);
    return false;
  }
};

/**
 * Cancels a trade
 */
export const cancelTrade = async (tradeId: string, reason: string): Promise<boolean> => {
  try {
    // Get current trade
    const trade = await getTrade(tradeId);
    if (!trade) {
      return false;
    }

    // Check if trade can be cancelled
    const canCancel = [TradeStatus.OFFER_MADE, TradeStatus.OFFER_ACCEPTED, TradeStatus.LOCATION_SELECTING, TradeStatus.TIME_SELECTING].includes(trade.status);
    if (!canCancel) {
      return false;
    }

    // Update trade status
    const success = await updateTradeStatus(tradeId, TradeStatus.CANCELLED);
    if (success) {
      // TODO: Update cancellation reason and timestamp
      // await database.query(`
      //   UPDATE trades 
      //   SET cancellation_reason = $1, cancelled_at = NOW()
      //   WHERE id = $2
      // `, [reason, tradeId]);
    }

    return success;
  } catch (error) {
    console.error('Error cancelling trade:', error);
    return false;
  }
};

/**
 * Disputes a trade
 */
export const disputeTrade = async (tradeId: string, issueType: string, description: string): Promise<boolean> => {
  try {
    // Get current trade
    const trade = await getTrade(tradeId);
    if (!trade) {
      return false;
    }

    // Check if trade can be disputed
    const canDispute = [TradeStatus.ESCROW_CREATED, TradeStatus.AWAITING_ARRIVAL, TradeStatus.BOTH_ARRIVED, TradeStatus.HANDOFF_PENDING].includes(trade.status);
    if (!canDispute) {
      return false;
    }

    // Update trade status
    const success = await updateTradeStatus(tradeId, TradeStatus.DISPUTED);
    if (success) {
      // TODO: Create dispute record
      // await database.query(`
      //   INSERT INTO trade_disputes (trade_id, issue_type, description, status, created_at)
      //   VALUES ($1, $2, $3, $4, NOW())
      // `, [tradeId, issueType, description, DisputeStatus.PENDING]);
    }

    return success;
  } catch (error) {
    console.error('Error disputing trade:', error);
    return false;
  }
};

// ============================================================================
// TRADE VALIDATION
// ============================================================================

/**
 * Validates trade data
 */
export const validateTrade = (trade: Partial<Trade>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!trade.itemId || trade.itemId.trim().length === 0) {
    errors.push('Item ID is required');
  }

  if (!trade.buyerId || trade.buyerId.trim().length === 0) {
    errors.push('Buyer ID is required');
  }

  if (!trade.sellerId || trade.sellerId.trim().length === 0) {
    errors.push('Seller ID is required');
  }

  if (!trade.offeredPrice || trade.offeredPrice <= 0) {
    errors.push('Offered price must be greater than 0');
  }

  if (!trade.status) {
    errors.push('Status is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Checks if a trade can be modified
 */
export const canModifyTrade = (trade: Trade): boolean => {
  const modifiableStates = [
    TradeStatus.OFFER_MADE,
    TradeStatus.OFFER_ACCEPTED,
    TradeStatus.LOCATION_SELECTING,
    TradeStatus.TIME_SELECTING
  ];
  
  return modifiableStates.includes(trade.status);
};

/**
 * Checks if a trade is active
 */
export const isTradeActive = (trade: Trade): boolean => {
  const activeStates = [
    TradeStatus.OFFER_MADE,
    TradeStatus.OFFER_ACCEPTED,
    TradeStatus.LOCATION_SELECTING,
    TradeStatus.LOCATION_CONFIRMED,
    TradeStatus.TIME_SELECTING,
    TradeStatus.TIME_CONFIRMED,
    TradeStatus.ESCROW_CREATED,
    TradeStatus.AWAITING_ARRIVAL,
    TradeStatus.BOTH_ARRIVED,
    TradeStatus.HANDOFF_PENDING,
    TradeStatus.DISPUTED
  ];
  
  return activeStates.includes(trade.status);
};

// ============================================================================
// TRADE STATISTICS
// ============================================================================

/**
 * Gets trade statistics for a user
 */
export const getTradeStats = async (userId: string): Promise<{
  totalTrades: number;
  completedTrades: number;
  cancelledTrades: number;
  disputedTrades: number;
  averageRating: number;
  completionRate: number;
}> => {
  try {
    // TODO: Implement actual statistics query
    // const result = await database.query(`
    //   SELECT 
    //     COUNT(*) as total_trades,
    //     COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_trades,
    //     COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_trades,
    //     COUNT(CASE WHEN status = 'DISPUTED' THEN 1 END) as disputed_trades
    //   FROM trades
    //   WHERE buyer_id = $1 OR seller_id = $1
    // `, [userId]);

    // Mock implementation for now
    return {
      totalTrades: 0,
      completedTrades: 0,
      cancelledTrades: 0,
      disputedTrades: 0,
      averageRating: 0,
      completionRate: 0
    };
  } catch (error) {
    console.error('Error getting trade statistics:', error);
    return {
      totalTrades: 0,
      completedTrades: 0,
      cancelledTrades: 0,
      disputedTrades: 0,
      averageRating: 0,
      completionRate: 0
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// Note: All functions are already exported above, no need to re-export
