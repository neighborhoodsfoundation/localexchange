/**
 * Trading Context Types and Interfaces
 * 
 * Defines all TypeScript interfaces and types for the Trading Context
 * including trade lifecycle, offers, escrow, feedback, and coordination.
 */

// ============================================================================
// CORE TRADE INTERFACES
// ============================================================================

export interface Trade {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  offeredPrice: number;
  finalPrice?: number;
  status: TradeStatus;
  escrowTransactionId?: string;
  meetupDetails?: MeetupDetails;
  feedback?: TradeFeedback;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface TradeOffer {
  id: string;
  tradeId: string;
  offeredBy: string;
  offeredTo: string;
  amount: number;
  type: OfferType;
  status: OfferStatus;
  message?: string;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
}

export interface MeetupDetails {
  id: string;
  tradeId: string;
  safeZoneId?: string;
  customLocation?: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  meetingTime?: Date;
  arrivalWindow?: number; // minutes
  buyerArrivedAt?: Date;
  sellerArrivedAt?: Date;
  bothArrivedAt?: Date;
  handoffConfirmedAt?: Date;
  buyerDisplayName?: string;
  buyerProfilePhotoUrl?: string;
  buyerVehicleInfo?: string;
  sellerDisplayName?: string;
  sellerProfilePhotoUrl?: string;
  sellerVehicleInfo?: string;
  identificationPackageCreatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeFeedback {
  id: string;
  tradeId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5 stars
  review?: string;
  isPositive: boolean;
  createdAt: Date;
}

// ============================================================================
// TRADE STATUS AND TYPES
// ============================================================================

export enum TradeStatus {
  OFFER_MADE = 'OFFER_MADE',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  LOCATION_SELECTING = 'LOCATION_SELECTING',
  LOCATION_CONFIRMED = 'LOCATION_CONFIRMED',
  TIME_SELECTING = 'TIME_SELECTING',
  TIME_CONFIRMED = 'TIME_CONFIRMED',
  ESCROW_CREATED = 'ESCROW_CREATED',
  AWAITING_ARRIVAL = 'AWAITING_ARRIVAL',
  BOTH_ARRIVED = 'BOTH_ARRIVED',
  HANDOFF_PENDING = 'HANDOFF_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED'
}

export enum OfferType {
  INITIAL_OFFER = 'INITIAL_OFFER',
  COUNTER_OFFER = 'COUNTER_OFFER'
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// ============================================================================
// SAFE ZONE INTERFACES
// ============================================================================

export interface SafeZone {
  id: string;
  name: string;
  description?: string;
  address: string;
  locationLat: number;
  locationLng: number;
  tier: SafetyTier;
  features: SafeZoneFeature[];
  businessHours?: BusinessHours;
  isActive: boolean;
  usageCount: number;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeZoneFeature {
  type: SafeZoneFeatureType;
  description: string;
  isAvailable: boolean;
}

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  is24Hours: boolean;
}

export enum SafetyTier {
  TIER_1 = 'TIER_1', // Police stations, fire departments
  TIER_2 = 'TIER_2', // Government buildings, courthouses
  TIER_3 = 'TIER_3', // Well-lit public areas, shopping centers
  TIER_4 = 'TIER_4'  // General public spaces
}

export enum SafeZoneFeatureType {
  SECURITY_CAMERAS = 'SECURITY_CAMERAS',
  WELL_LIT = 'WELL_LIT',
  PARKING_AVAILABLE = 'PARKING_AVAILABLE',
  PUBLIC_RESTROOMS = 'PUBLIC_RESTROOMS',
  SECURITY_PRESENCE = 'SECURITY_PRESENCE',
  EMERGENCY_PHONE = 'EMERGENCY_PHONE',
  WHEELCHAIR_ACCESSIBLE = 'WHEELCHAIR_ACCESSIBLE',
  COVERED_AREA = 'COVERED_AREA'
}

// ============================================================================
// LOCATION COORDINATION INTERFACES
// ============================================================================

export interface LocationRecommendation {
  safeZone: SafeZone;
  distanceFromBuyer: number; // miles
  distanceFromSeller: number; // miles
  travelTimeBuyer: number; // minutes
  travelTimeSeller: number; // minutes
  fairnessScore: number; // 0-1, higher is more fair
  isRecommended: boolean;
}

export interface LocationSelection {
  tradeId: string;
  buyerSelection?: string; // safeZoneId or 'CUSTOM'
  sellerSelection?: string; // safeZoneId or 'CUSTOM'
  customLocation?: string;
  customLocationLat?: number;
  customLocationLng?: number;
  customLocationAddress?: string;
  bothConfirmed: boolean;
  confirmedAt?: Date;
}

export interface TimeSelection {
  tradeId: string;
  proposedTime?: Date;
  buyerConfirmation?: boolean;
  sellerConfirmation?: boolean;
  bothConfirmed: boolean;
  confirmedAt?: Date;
  arrivalWindow: number; // minutes
}

// ============================================================================
// ARRIVAL AND HANDOFF INTERFACES
// ============================================================================

export interface ArrivalStatus {
  tradeId: string;
  buyerArrived: boolean;
  sellerArrived: boolean;
  buyerArrivedAt?: Date;
  sellerArrivedAt?: Date;
  bothArrivedAt?: Date;
  lateArrivalThreshold: number; // minutes
  noShowThreshold: number; // minutes
}

export interface HandoffConfirmation {
  tradeId: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  buyerConfirmedAt?: Date;
  sellerConfirmedAt?: Date;
  bothConfirmedAt?: Date;
  itemAsDescribed: boolean;
  issues?: string[];
}

// ============================================================================
// ESCROW AND FINANCIAL INTERFACES
// ============================================================================

export interface EscrowDetails {
  tradeId: string;
  escrowTransactionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: EscrowStatus;
  createdAt: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  disputeId?: string;
}

export enum EscrowStatus {
  CREATED = 'CREATED',
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED'
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface TradeNotification {
  id: string;
  userId: string;
  tradeId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export enum NotificationType {
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  LOCATION_SELECTED = 'LOCATION_SELECTED',
  TIME_SELECTED = 'TIME_SELECTED',
  ESCROW_CREATED = 'ESCROW_CREATED',
  PARTNER_ARRIVED = 'PARTNER_ARRIVED',
  BOTH_ARRIVED = 'BOTH_ARRIVED',
  HANDOFF_CONFIRMED = 'HANDOFF_CONFIRMED',
  TRADE_COMPLETED = 'TRADE_COMPLETED',
  TRADE_CANCELLED = 'TRADE_CANCELLED',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  REMINDER_15MIN = 'REMINDER_15MIN'
}

// ============================================================================
// DISPUTE INTERFACES
// ============================================================================

export interface TradeDispute {
  id: string;
  tradeId: string;
  reportedBy: string;
  reportedAgainst: string;
  issueType: DisputeIssueType;
  description: string;
  evidencePhotos: string[];
  requestedResolution: DisputeResolution;
  status: DisputeStatus;
  adminNotes?: string;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export enum DisputeIssueType {
  ITEM_NOT_AS_DESCRIBED = 'ITEM_NOT_AS_DESCRIBED',
  ITEM_DAMAGED = 'ITEM_DAMAGED',
  WRONG_ITEM = 'WRONG_ITEM',
  NO_SHOW = 'NO_SHOW',
  UNSAFE_BEHAVIOR = 'UNSAFE_BEHAVIOR',
  FRAUD = 'FRAUD',
  OTHER = 'OTHER'
}

export enum DisputeResolution {
  REFUND_FULL = 'REFUND_FULL',
  REFUND_PARTIAL = 'REFUND_PARTIAL',
  RELIST_ITEM = 'RELIST_ITEM',
  NO_ACTION = 'NO_ACTION'
}

export enum DisputeStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateTradeRequest {
  itemId: string;
  buyerId: string;
  offeredPrice: number;
  message?: string;
}

export interface CreateTradeResponse {
  success: boolean;
  trade?: Trade;
  error?: string;
}

export interface MakeOfferRequest {
  tradeId: string;
  amount: number;
  type: OfferType;
  message?: string;
}

export interface MakeOfferResponse {
  success: boolean;
  offer?: TradeOffer;
  error?: string;
}

export interface RespondToOfferRequest {
  offerId: string;
  response: 'ACCEPT' | 'REJECT';
  message?: string;
}

export interface RespondToOfferResponse {
  success: boolean;
  trade?: Trade;
  error?: string;
}

export interface SelectLocationRequest {
  tradeId: string;
  safeZoneId?: string;
  customLocation?: string;
  customLocationLat?: number;
  customLocationLng?: number;
  customLocationAddress?: string;
}

export interface SelectLocationResponse {
  success: boolean;
  locationSelection?: LocationSelection;
  error?: string;
}

export interface SelectTimeRequest {
  tradeId: string;
  proposedTime: Date;
  arrivalWindow?: number;
}

export interface SelectTimeResponse {
  success: boolean;
  timeSelection?: TimeSelection;
  error?: string;
}

export interface CreateEscrowRequest {
  tradeId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
}

export interface CreateEscrowResponse {
  success: boolean;
  escrowDetails?: EscrowDetails;
  error?: string;
}

export interface ConfirmArrivalRequest {
  tradeId: string;
  userId: string;
  locationLat?: number;
  locationLng?: number;
}

export interface ConfirmArrivalResponse {
  success: boolean;
  arrivalStatus?: ArrivalStatus;
  error?: string;
}

export interface ConfirmHandoffRequest {
  tradeId: string;
  userId: string;
  itemAsDescribed: boolean;
  issues?: string[];
}

export interface ConfirmHandoffResponse {
  success: boolean;
  handoffConfirmation?: HandoffConfirmation;
  error?: string;
}

export interface LeaveFeedbackRequest {
  tradeId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  review?: string;
}

export interface LeaveFeedbackResponse {
  success: boolean;
  feedback?: TradeFeedback;
  error?: string;
}

// ============================================================================
// SEARCH AND FILTER INTERFACES
// ============================================================================

export interface TradeSearchRequest {
  userId?: string;
  status?: TradeStatus[];
  itemId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TradeSearchResponse {
  trades: Trade[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SafeZoneSearchRequest {
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  tier?: SafetyTier[];
  features?: SafeZoneFeatureType[];
  isActive?: boolean;
}

export interface SafeZoneSearchResponse {
  safeZones: SafeZone[];
  recommendations: LocationRecommendation[];
  total: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface TradingError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export enum TradingErrorCode {
  TRADE_NOT_FOUND = 'TRADE_NOT_FOUND',
  INVALID_TRADE_STATE = 'INVALID_TRADE_STATE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  OFFER_EXPIRED = 'OFFER_EXPIRED',
  LOCATION_NOT_SELECTED = 'LOCATION_NOT_SELECTED',
  TIME_NOT_SELECTED = 'TIME_NOT_SELECTED',
  ESCROW_NOT_CREATED = 'ESCROW_NOT_CREATED',
  ARRIVAL_NOT_CONFIRMED = 'ARRIVAL_NOT_CONFIRMED',
  HANDOFF_NOT_CONFIRMED = 'HANDOFF_NOT_CONFIRMED',
  SAFE_ZONE_NOT_FOUND = 'SAFE_ZONE_NOT_FOUND',
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_TIME = 'INVALID_TIME',
  TRADE_ALREADY_CANCELLED = 'TRADE_ALREADY_CANCELLED',
  TRADE_ALREADY_COMPLETED = 'TRADE_ALREADY_COMPLETED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface TradeValidationRules {
  offeredPrice: {
    min: number;
    max: number;
    required: boolean;
  };
  message: {
    maxLength: number;
    required: boolean;
  };
  rating: {
    min: number;
    max: number;
    required: boolean;
  };
  review: {
    maxLength: number;
    required: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TradeRole = 'BUYER' | 'SELLER' | 'ADMIN';

export type TradeAction = 
  | 'MAKE_OFFER'
  | 'ACCEPT_OFFER'
  | 'REJECT_OFFER'
  | 'SELECT_LOCATION'
  | 'SELECT_TIME'
  | 'CREATE_ESCROW'
  | 'CONFIRM_ARRIVAL'
  | 'CONFIRM_HANDOFF'
  | 'CANCEL_TRADE'
  | 'DISPUTE_TRADE'
  | 'LEAVE_FEEDBACK';

export type TradeStateTransition = {
  from: TradeStatus;
  to: TradeStatus;
  action: TradeAction;
  conditions?: string[];
};

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Note: All types are already exported above, no need to re-export
