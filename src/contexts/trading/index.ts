/**
 * Trading Context Exports
 * 
 * Central export file for all trading context components,
 * services, hooks, and types.
 */

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

export { TradingProvider, useTrading } from './TradingContext';

// ============================================================================
// SERVICES
// ============================================================================

export {
  SAFE_ZONE_CONFIG,
  searchSafeZones,
  getLocationRecommendations,
  calculateMidpoint,
  calculateDistance,
  calculateFairnessScore,
  calculateRecommendationScore,
  getSafeZone,
  createSafeZone,
  updateSafeZone,
  deleteSafeZone,
  validateSafeZone,
  validateBusinessHours,
  getSafeZoneStats
} from './safeZoneService';

export {
  TRADE_STATE_TRANSITIONS,
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
  getTradeStats
} from './tradeService';

// ============================================================================
// HOOKS
// ============================================================================

export {
  useTrade,
  useUserTrades,
  useCreateTrade,
  useOffers,
  useSafeZones,
  useLocationSelection,
  useTimeSelection,
  useEscrow,
  useArrivalTracking,
  useHandoffConfirmation,
  useFeedback,
  useTradeState,
  useTradeNotifications,
  useTradeStats
} from './tradingHooks';

// ============================================================================
// TYPES
// ============================================================================

export type {
  Trade,
  TradeOffer,
  MeetupDetails,
  TradeFeedback,
  SafeZone,
  SafeZoneFeature,
  BusinessHours,
  DayHours,
  LocationRecommendation,
  LocationSelection,
  TimeSelection,
  ArrivalStatus,
  HandoffConfirmation,
  EscrowDetails,
  TradeNotification,
  TradeDispute,
  CreateTradeRequest,
  CreateTradeResponse,
  MakeOfferRequest,
  MakeOfferResponse,
  RespondToOfferRequest,
  RespondToOfferResponse,
  SelectLocationRequest,
  SelectLocationResponse,
  SelectTimeRequest,
  SelectTimeResponse,
  CreateEscrowRequest,
  CreateEscrowResponse,
  ConfirmArrivalRequest,
  ConfirmArrivalResponse,
  ConfirmHandoffRequest,
  ConfirmHandoffResponse,
  LeaveFeedbackRequest,
  LeaveFeedbackResponse,
  TradeSearchRequest,
  TradeSearchResponse,
  SafeZoneSearchRequest,
  SafeZoneSearchResponse,
  TradingError,
  TradeValidationRules
} from './trading.types';

export {
  TradeStatus,
  OfferType,
  OfferStatus,
  SafetyTier,
  SafeZoneFeatureType,
  EscrowStatus,
  NotificationType,
  DisputeIssueType,
  DisputeResolution,
  DisputeStatus,
  TradingErrorCode,
  TradeRole,
  TradeAction,
  TradeStateTransition
} from './trading.types';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export { default as TradingContext } from './TradingContext';
