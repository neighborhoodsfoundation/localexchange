/**
 * Items Context Types and Interfaces
 * 
 * Defines all TypeScript interfaces and types for the Items Context
 * including item management, AI valuation, image recognition, and LLM chatbot.
 */

// ============================================================================
// CORE ITEM INTERFACES
// ============================================================================

export interface Item {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  priceCredits: number;
  condition: ItemCondition;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  status: ItemStatus;
  isFeatured: boolean;
  featuredUntil?: Date;
  viewCount: number;
  cpscChecked: boolean;
  cpscResult?: CPSCResult;
  
  // AI-Generated Fields
  systemGeneratedValue?: number;
  valueConfidence?: number;
  valueGeneratedAt?: Date;
  valueFactors?: ValueFactors;
  aiIdentifiedBrand?: string;
  aiIdentifiedModel?: string;
  aiIdentifiedCategory?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemImage {
  id: string;
  itemId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AI VALUATION INTERFACES
// ============================================================================

export interface AIItemValuation {
  itemId: string;
  systemValue: number;
  confidence: number;
  factors: ValueFactors;
  recommendations: PriceRecommendation[];
  comparableSales: ComparableSale[];
  marketAnalysis: MarketAnalysis;
  generatedAt: Date;
  expiresAt: Date;
}

export interface ValueFactors {
  ageYears: number;
  condition: ItemCondition;
  brand: string;
  model?: string;
  originalRetailPrice?: number;
  comparableSales: ComparableSale[];
  depreciation: number;
  marketDemand: MarketDemand;
  localPricing: LocalPricing;
  seasonalFactors: SeasonalFactors;
}

export interface ComparableSale {
  price: number;
  soldDate: Date;
  distanceMiles: number;
  condition: ItemCondition;
  brand: string;
  model?: string;
  source: string; // 'LOCALEX', 'EBAY', 'FACEBOOK', 'CRAIGSLIST'
  url?: string;
}

export interface MarketAnalysis {
  demandLevel: MarketDemand;
  supplyLevel: MarketSupply;
  priceTrend: PriceTrend;
  seasonalImpact: number;
  localMarketFactors: string[];
}

export interface PriceRecommendation {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  price: number;
  reasoning: string;
  confidence: number;
  expectedDaysToSell: number;
}

// ============================================================================
// IMAGE RECOGNITION INTERFACES
// ============================================================================

export interface ImageRecognitionResult {
  itemId: string;
  imageId: string;
  identifiedObjects: IdentifiedObject[];
  brandRecognition: BrandRecognition;
  conditionAssessment: ConditionAssessment;
  confidence: number;
  processingTime: number;
  createdAt: Date;
}

export interface IdentifiedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
  attributes: ObjectAttribute[];
}

export interface BrandRecognition {
  brand: string;
  confidence: number;
  model?: string;
  year?: number;
  category: string;
}

export interface ConditionAssessment {
  overallCondition: ItemCondition;
  wearLevel: number; // 0-1 scale
  damageAreas: DamageArea[];
  maintenanceNeeded: string[];
  estimatedAge: number;
}

export interface DamageArea {
  type: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  location: string;
  description: string;
}

// ============================================================================
// LLM CHATBOT INTERFACES
// ============================================================================

export interface ChatbotSession {
  id: string;
  userId: string;
  itemId?: string;
  context: ChatbotContext;
  messages: ChatbotMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ChatbotMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: ChatbotMessageMetadata;
  createdAt: Date;
}

export interface ChatbotMessageMetadata {
  itemId?: string;
  valuationData?: AIItemValuation;
  imageAnalysis?: ImageRecognitionResult;
  suggestedActions?: string[];
  suggestions?: string[];
  confidence?: number;
}

export interface ChatbotContext {
  currentItem?: Item;
  userIntent: UserIntent;
  conversationStage: ConversationStage;
  previousValuations: string[];
  userPreferences: UserPreferences;
}

export interface UserPreferences {
  priceRange?: { min: number; max: number };
  preferredCondition?: ItemCondition[];
  categoriesOfInterest?: string[];
  locationRadius?: number;
}

// ============================================================================
// SEARCH AND FILTERING INTERFACES
// ============================================================================

export interface ItemSearchRequest {
  query?: string;
  categoryId?: string;
  condition?: ItemCondition[];
  priceMin?: number;
  priceMax?: number;
  locationLat?: number;
  locationLng?: number;
  radiusMiles?: number;
  sortBy?: ItemSortBy;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  userId?: string; // For user's own items
}

export interface ItemSearchResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: CategoryFacet[];
  conditions: ConditionFacet[];
  priceRanges: PriceRangeFacet[];
  locations: LocationFacet[];
}

export interface CategoryFacet {
  categoryId: string;
  name: string;
  count: number;
}

export interface ConditionFacet {
  condition: ItemCondition;
  count: number;
}

export interface PriceRangeFacet {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface LocationFacet {
  city: string;
  state: string;
  count: number;
}

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum ItemCondition {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR'
}

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD = 'SOLD',
  REMOVED = 'REMOVED',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

export enum ItemSortBy {
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  PRICE = 'PRICE',
  VIEW_COUNT = 'VIEW_COUNT',
  DISTANCE = 'DISTANCE',
  RELEVANCE = 'RELEVANCE'
}

export enum MarketDemand {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  VERY_LOW = 'VERY_LOW'
}

export enum MarketSupply {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  VERY_LOW = 'VERY_LOW'
}

export enum PriceTrend {
  RISING = 'RISING',
  STABLE = 'STABLE',
  FALLING = 'FALLING',
  VOLATILE = 'VOLATILE'
}

export enum UserIntent {
  SELL_ITEM = 'SELL_ITEM',
  BUY_ITEM = 'BUY_ITEM',
  GET_VALUATION = 'GET_VALUATION',
  LEARN_ABOUT_ITEM = 'LEARN_ABOUT_ITEM',
  COMPARE_ITEMS = 'COMPARE_ITEMS',
  GENERAL_HELP = 'GENERAL_HELP'
}

export enum ConversationStage {
  GREETING = 'GREETING',
  UNDERSTANDING_INTENT = 'UNDERSTANDING_INTENT',
  ANALYZING_ITEM = 'ANALYZING_ITEM',
  PROVIDING_VALUATION = 'PROVIDING_VALUATION',
  ANSWERING_QUESTIONS = 'ANSWERING_QUESTIONS',
  SUGGESTING_ACTIONS = 'SUGGESTING_ACTIONS',
  CLOSING = 'CLOSING'
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateItemRequest {
  categoryId: string;
  title: string;
  description: string;
  priceCredits: number;
  condition: ItemCondition;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  images?: File[];
}

export interface CreateItemResponse {
  success: boolean;
  item?: Item;
  error?: string;
}

export interface UpdateItemRequest {
  title?: string;
  description?: string;
  priceCredits?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  isFeatured?: boolean;
  cpscChecked?: boolean;
}

export interface UpdateItemResponse {
  success: boolean;
  item?: Item;
  error?: string;
}

export interface UploadImageRequest {
  itemId: string;
  image: File;
  isPrimary?: boolean;
  altText?: string;
}

export interface UploadImageResponse {
  success: boolean;
  image?: ItemImage;
  error?: string;
}

export interface GetValuationRequest {
  itemId: string;
  forceRefresh?: boolean;
}

export interface GetValuationResponse {
  success: boolean;
  valuation?: AIItemValuation;
  error?: string;
}

export interface AnalyzeImageRequest {
  itemId: string;
  imageId: string;
  imageUrl: string;
}

export interface AnalyzeImageResponse {
  success: boolean;
  analysis?: ImageRecognitionResult;
  error?: string;
}

export interface ChatbotRequest {
  sessionId?: string;
  message: string;
  itemId?: string;
  context?: Partial<ChatbotContext>;
}

export interface ChatbotResponse {
  success: boolean;
  sessionId: string;
  message?: ChatbotMessage;
  suggestions?: string[];
  error?: string;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObjectAttribute {
  name: string;
  value: string | number | boolean;
  confidence: number;
}

export interface LocalPricing {
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  sampleSize: number;
  lastUpdated: Date;
}

export interface SeasonalFactors {
  currentSeason: string;
  impact: number; // -1 to 1, negative = lower prices, positive = higher prices
  reasoning: string;
}

export interface CPSCResult {
  isSafe: boolean;
  hasRecalls: boolean;
  recallDetails?: string[];
  safetyScore: number;
  checkedAt: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ItemError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export enum ItemErrorCode {
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  INVALID_CONDITION = 'INVALID_CONDITION',
  INVALID_PRICE = 'INVALID_PRICE',
  IMAGE_UPLOAD_FAILED = 'IMAGE_UPLOAD_FAILED',
  VALUATION_FAILED = 'VALUATION_FAILED',
  IMAGE_ANALYSIS_FAILED = 'IMAGE_ANALYSIS_FAILED',
  CHATBOT_ERROR = 'CHATBOT_ERROR',
  SEARCH_ERROR = 'SEARCH_ERROR',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface ItemValidationRules {
  title: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  description: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  priceCredits: {
    min: number;
    max: number;
    required: boolean;
  };
  images: {
    minCount: number;
    maxCount: number;
    maxSizeMB: number;
    allowedFormats: string[];
  };
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
// All types are already exported individually above
