/**
 * Trading Hooks
 * 
 * Custom React hooks for trading functionality
 * including trade management, offers, and coordination.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTrading } from './TradingContext';
import { 
  Trade, 
  TradeOffer, 
  TradeStatus, 
  CreateTradeRequest,
  MakeOfferRequest,
  RespondToOfferRequest,
  SelectLocationRequest,
  SelectTimeRequest,
  ConfirmArrivalRequest,
  ConfirmHandoffRequest,
  LeaveFeedbackRequest,
  SafeZone,
  LocationRecommendation
} from './trading.types';

// ============================================================================
// TRADE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for managing a specific trade
 */
export const useTrade = (tradeId: string) => {
  const { getTrade, updateTrade, isLoading, error } = useTrading();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoadingTrade, setIsLoadingTrade] = useState(false);

  const loadTrade = useCallback(async () => {
    if (!tradeId) return;
    
    setIsLoadingTrade(true);
    try {
      const tradeData = await getTrade(tradeId);
      setTrade(tradeData);
    } catch (err) {
      console.error('Error loading trade:', err);
    } finally {
      setIsLoadingTrade(false);
    }
  }, [tradeId, getTrade]);

  const refreshTrade = useCallback(async () => {
    await loadTrade();
  }, [loadTrade]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  return {
    trade,
    isLoading: isLoading || isLoadingTrade,
    error,
    refreshTrade
  };
};

/**
 * Hook for managing user's trades
 */
export const useUserTrades = (userId: string, status?: TradeStatus[]) => {
  const { getTrades, isLoading, error } = useTrading();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  const loadTrades = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingTrades(true);
    try {
      const response = await getTrades({ userId, status });
      setTrades(response.trades);
    } catch (err) {
      console.error('Error loading trades:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [userId, status, getTrades]);

  const refreshTrades = useCallback(async () => {
    await loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  return {
    trades,
    isLoading: isLoading || isLoadingTrades,
    error,
    refreshTrades
  };
};

/**
 * Hook for creating trades
 */
export const useCreateTrade = () => {
  const { createTrade, isLoading, error } = useTrading();
  const [isCreating, setIsCreating] = useState(false);

  const createNewTrade = useCallback(async (request: CreateTradeRequest) => {
    setIsCreating(true);
    try {
      const response = await createTrade(request);
      return response;
    } catch (err) {
      console.error('Error creating trade:', err);
      return { success: false, error: 'Failed to create trade' };
    } finally {
      setIsCreating(false);
    }
  }, [createTrade]);

  return {
    createTrade: createNewTrade,
    isLoading: isLoading || isCreating,
    error
  };
};

// ============================================================================
// OFFER MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for managing offers
 */
export const useOffers = (tradeId: string) => {
  const { getOffers, makeOffer, respondToOffer, isLoading, error } = useTrading();
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!tradeId) return;
    
    setIsLoadingOffers(true);
    try {
      const offersData = await getOffers(tradeId);
      setOffers(offersData);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setIsLoadingOffers(false);
    }
  }, [tradeId, getOffers]);

  const makeNewOffer = useCallback(async (request: MakeOfferRequest) => {
    try {
      const response = await makeOffer(request);
      if (response.success) {
        await loadOffers(); // Refresh offers
      }
      return response;
    } catch (err) {
      console.error('Error making offer:', err);
      return { success: false, error: 'Failed to make offer' };
    }
  }, [makeOffer, loadOffers]);

  const respondToOfferRequest = useCallback(async (request: RespondToOfferRequest) => {
    try {
      const response = await respondToOffer(request);
      if (response.success) {
        await loadOffers(); // Refresh offers
      }
      return response;
    } catch (err) {
      console.error('Error responding to offer:', err);
      return { success: false, error: 'Failed to respond to offer' };
    }
  }, [respondToOffer, loadOffers]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  return {
    offers,
    isLoading: isLoading || isLoadingOffers,
    error,
    makeOffer: makeNewOffer,
    respondToOffer: respondToOfferRequest,
    refreshOffers: loadOffers
  };
};

// ============================================================================
// LOCATION COORDINATION HOOKS
// ============================================================================

/**
 * Hook for Safe Zone management
 */
export const useSafeZones = () => {
  const { searchSafeZones, getLocationRecommendations, isLoading, error } = useTrading();
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [recommendations, setRecommendations] = useState<LocationRecommendation[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);

  const searchZones = useCallback(async (centerLat: number, centerLng: number, radiusMiles: number = 5) => {
    setIsLoadingZones(true);
    try {
      const response = await searchSafeZones({
        centerLat,
        centerLng,
        radiusMiles,
        isActive: true
      });
      setSafeZones(response.safeZones);
      setRecommendations(response.recommendations);
    } catch (err) {
      console.error('Error searching Safe Zones:', err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [searchSafeZones]);

  const getRecommendations = useCallback(async (tradeId: string) => {
    try {
      const recs = await getLocationRecommendations(tradeId);
      setRecommendations(recs);
    } catch (err) {
      console.error('Error getting location recommendations:', err);
    }
  }, [getLocationRecommendations]);

  return {
    safeZones,
    recommendations,
    isLoading: isLoading || isLoadingZones,
    error,
    searchZones,
    getRecommendations
  };
};

/**
 * Hook for location selection
 */
export const useLocationSelection = (tradeId: string) => {
  const { selectLocation, isLoading, error } = useTrading();
  const [isSelecting, setIsSelecting] = useState(false);

  const selectLocationForTrade = useCallback(async (request: SelectLocationRequest) => {
    setIsSelecting(true);
    try {
      const response = await selectLocation(request);
      return response;
    } catch (err) {
      console.error('Error selecting location:', err);
      return { success: false, error: 'Failed to select location' };
    } finally {
      setIsSelecting(false);
    }
  }, [selectLocation]);

  return {
    selectLocation: selectLocationForTrade,
    isLoading: isLoading || isSelecting,
    error
  };
};

// ============================================================================
// TIME COORDINATION HOOKS
// ============================================================================

/**
 * Hook for time selection
 */
export const useTimeSelection = (tradeId: string) => {
  const { selectTime, getTimeSuggestions, isLoading, error } = useTrading();
  const [timeSuggestions, setTimeSuggestions] = useState<Date[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const selectTimeForTrade = useCallback(async (request: SelectTimeRequest) => {
    setIsSelecting(true);
    try {
      const response = await selectTime(request);
      return response;
    } catch (err) {
      console.error('Error selecting time:', err);
      return { success: false, error: 'Failed to select time' };
    } finally {
      setIsSelecting(false);
    }
  }, [selectTime]);

  const loadTimeSuggestions = useCallback(async () => {
    try {
      const suggestions = await getTimeSuggestions(tradeId);
      setTimeSuggestions(suggestions);
    } catch (err) {
      console.error('Error loading time suggestions:', err);
    }
  }, [tradeId, getTimeSuggestions]);

  useEffect(() => {
    if (tradeId) {
      loadTimeSuggestions();
    }
  }, [tradeId, loadTimeSuggestions]);

  return {
    timeSuggestions,
    selectTime: selectTimeForTrade,
    isLoading: isLoading || isSelecting,
    error,
    refreshSuggestions: loadTimeSuggestions
  };
};

// ============================================================================
// ESCROW MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for escrow management
 */
export const useEscrow = (tradeId: string) => {
  const { createEscrow, releaseEscrow, refundEscrow, isLoading, error } = useTrading();
  const [isEscrowLoading, setIsEscrowLoading] = useState(false);

  const createEscrowForTrade = useCallback(async (buyerId: string, sellerId: string, amount: number) => {
    setIsEscrowLoading(true);
    try {
      const response = await createEscrow({ tradeId, buyerId, sellerId, amount });
      return response;
    } catch (err) {
      console.error('Error creating escrow:', err);
      return { success: false, error: 'Failed to create escrow' };
    } finally {
      setIsEscrowLoading(false);
    }
  }, [createEscrow, tradeId]);

  const releaseEscrowForTrade = useCallback(async () => {
    setIsEscrowLoading(true);
    try {
      const success = await releaseEscrow(tradeId);
      return success;
    } catch (err) {
      console.error('Error releasing escrow:', err);
      return false;
    } finally {
      setIsEscrowLoading(false);
    }
  }, [releaseEscrow, tradeId]);

  const refundEscrowForTrade = useCallback(async () => {
    setIsEscrowLoading(true);
    try {
      const success = await refundEscrow(tradeId);
      return success;
    } catch (err) {
      console.error('Error refunding escrow:', err);
      return false;
    } finally {
      setIsEscrowLoading(false);
    }
  }, [refundEscrow, tradeId]);

  return {
    createEscrow: createEscrowForTrade,
    releaseEscrow: releaseEscrowForTrade,
    refundEscrow: refundEscrowForTrade,
    isLoading: isLoading || isEscrowLoading,
    error
  };
};

// ============================================================================
// ARRIVAL AND HANDOFF HOOKS
// ============================================================================

/**
 * Hook for arrival tracking
 */
export const useArrivalTracking = (tradeId: string) => {
  const { confirmArrival, getArrivalStatus, isLoading, error } = useTrading();
  const [arrivalStatus, setArrivalStatus] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmUserArrival = useCallback(async (userId: string, locationLat?: number, locationLng?: number) => {
    setIsConfirming(true);
    try {
      const response = await confirmArrival({ tradeId, userId, locationLat, locationLng });
      if (response.success) {
        await loadArrivalStatus(); // Refresh status
      }
      return response;
    } catch (err) {
      console.error('Error confirming arrival:', err);
      return { success: false, error: 'Failed to confirm arrival' };
    } finally {
      setIsConfirming(false);
    }
  }, [confirmArrival, tradeId]);

  const loadArrivalStatus = useCallback(async () => {
    try {
      const status = await getArrivalStatus(tradeId);
      setArrivalStatus(status);
    } catch (err) {
      console.error('Error loading arrival status:', err);
    }
  }, [tradeId, getArrivalStatus]);

  useEffect(() => {
    if (tradeId) {
      loadArrivalStatus();
    }
  }, [tradeId, loadArrivalStatus]);

  return {
    arrivalStatus,
    confirmArrival: confirmUserArrival,
    isLoading: isLoading || isConfirming,
    error,
    refreshStatus: loadArrivalStatus
  };
};

/**
 * Hook for handoff confirmation
 */
export const useHandoffConfirmation = (tradeId: string) => {
  const { confirmHandoff, isLoading, error } = useTrading();
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmHandoffForTrade = useCallback(async (userId: string, itemAsDescribed: boolean, issues?: string[]) => {
    setIsConfirming(true);
    try {
      const response = await confirmHandoff({ tradeId, userId, itemAsDescribed, issues });
      return response;
    } catch (err) {
      console.error('Error confirming handoff:', err);
      return { success: false, error: 'Failed to confirm handoff' };
    } finally {
      setIsConfirming(false);
    }
  }, [confirmHandoff, tradeId]);

  return {
    confirmHandoff: confirmHandoffForTrade,
    isLoading: isLoading || isConfirming,
    error
  };
};

// ============================================================================
// FEEDBACK HOOKS
// ============================================================================

/**
 * Hook for feedback management
 */
export const useFeedback = (userId: string) => {
  const { leaveFeedback, getFeedback, isLoading, error } = useTrading();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isLeavingFeedback, setIsLeavingFeedback] = useState(false);

  const leaveFeedbackForTrade = useCallback(async (request: LeaveFeedbackRequest) => {
    setIsLeavingFeedback(true);
    try {
      const response = await leaveFeedback(request);
      if (response.success) {
        await loadFeedback(); // Refresh feedback
      }
      return response;
    } catch (err) {
      console.error('Error leaving feedback:', err);
      return { success: false, error: 'Failed to leave feedback' };
    } finally {
      setIsLeavingFeedback(false);
    }
  }, [leaveFeedback]);

  const loadFeedback = useCallback(async () => {
    try {
      const feedbackData = await getFeedback(userId);
      setFeedback(feedbackData);
    } catch (err) {
      console.error('Error loading feedback:', err);
    }
  }, [userId, getFeedback]);

  useEffect(() => {
    if (userId) {
      loadFeedback();
    }
  }, [userId, loadFeedback]);

  return {
    feedback,
    leaveFeedback: leaveFeedbackForTrade,
    isLoading: isLoading || isLeavingFeedback,
    error,
    refreshFeedback: loadFeedback
  };
};

// ============================================================================
// TRADE STATE HOOKS
// ============================================================================

/**
 * Hook for trade state management
 */
export const useTradeState = (tradeId: string) => {
  const { cancelTrade, disputeTrade, canPerformAction, isLoading, error } = useTrading();
  const [isUpdating, setIsUpdating] = useState(false);

  const cancelTradeWithReason = useCallback(async (reason: string) => {
    setIsUpdating(true);
    try {
      const success = await cancelTrade(tradeId, reason);
      return success;
    } catch (err) {
      console.error('Error cancelling trade:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [cancelTrade, tradeId]);

  const disputeTradeWithReason = useCallback(async (issueType: string, description: string) => {
    setIsUpdating(true);
    try {
      const success = await disputeTrade(tradeId, issueType, description);
      return success;
    } catch (err) {
      console.error('Error disputing trade:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [disputeTrade, tradeId]);

  const checkCanPerformAction = useCallback(async (action: string) => {
    try {
      const canPerform = await canPerformAction(tradeId, action);
      return canPerform;
    } catch (err) {
      console.error('Error checking action permission:', err);
      return false;
    }
  }, [canPerformAction, tradeId]);

  return {
    cancelTrade: cancelTradeWithReason,
    disputeTrade: disputeTradeWithReason,
    canPerformAction: checkCanPerformAction,
    isLoading: isLoading || isUpdating,
    error
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for trade notifications
 */
export const useTradeNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual notifications loading
      // const response = await notificationService.getNotifications(userId);
      // setNotifications(response);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  return {
    notifications,
    isLoading,
    refreshNotifications: loadNotifications
  };
};

/**
 * Hook for trade statistics
 */
export const useTradeStats = (userId: string) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual statistics loading
      // const response = await tradeService.getTradeStats(userId);
      // setStats(response);
    } catch (err) {
      console.error('Error loading trade stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId, loadStats]);

  return {
    stats,
    isLoading,
    refreshStats: loadStats
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

// Note: All hooks are already exported above, no need to re-export
