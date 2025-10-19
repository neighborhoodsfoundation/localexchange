/**
 * Item Context Exports
 * 
 * Central export file for all Item Context components, hooks, and types.
 */

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

export { itemService } from './itemService';

// ============================================================================
// HOOKS
// ============================================================================

// Note: Hooks are not needed for service layer

// ============================================================================
// SERVICES
// ============================================================================

export {
  generateItemValuation,
  analyzeItemImages,
  searchComparableSales,
  calculateDepreciation,
  analyzeMarketDemand,
  generatePriceRecommendations,
  analyzeSeasonalFactors,
  validateValuationConfidence,
  isValuationExpired,
  refreshValuation,
  AI_VALUATION_CONFIG
} from './aiValuationService';

export {
  createChatbotSession,
  sendChatbotMessage,
  getConversationHistory,
  endChatbotSession,
  isSessionActive,
  getSessionStats,
  CHATBOT_CONFIG
} from './chatbotService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type {
  Item,
  ItemImage,
  ItemCategory,
  AIItemValuation,
  ValueFactors,
  ComparableSale,
  MarketAnalysis,
  PriceRecommendation,
  ImageRecognitionResult,
  IdentifiedObject,
  BrandRecognition,
  ConditionAssessment,
  DamageArea,
  ChatbotSession,
  ChatbotMessage,
  ChatbotContext,
  UserPreferences,
  ItemSearchRequest,
  ItemSearchResponse,
  SearchFacets,
  CategoryFacet,
  ConditionFacet,
  PriceRangeFacet,
  LocationFacet,
  CreateItemRequest,
  CreateItemResponse,
  UpdateItemRequest,
  UpdateItemResponse,
  UploadImageRequest,
  UploadImageResponse,
  GetValuationRequest,
  GetValuationResponse,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  ChatbotRequest,
  ChatbotResponse,
  BoundingBox,
  ObjectAttribute,
  LocalPricing,
  SeasonalFactors,
  CPSCResult,
  ItemError,
  ItemValidationRules
} from './items.types';

export {
  ItemCondition,
  ItemStatus,
  ItemSortBy,
  MarketDemand,
  MarketSupply,
  PriceTrend,
  UserIntent,
  ConversationStage,
  ItemErrorCode
} from './items.types';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

// Import itemService for default export
import { itemService } from './itemService';

export default {
  itemService
};
