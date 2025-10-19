/**
 * User Context Types and Interfaces
 * 
 * Defines all TypeScript interfaces and types for the User Context
 * including user data, authentication, profiles, and verification.
 */

// ============================================================================
// CORE USER INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  
  // Location (stored for Safe Zone calculation, NEVER shown exact)
  locationLat?: number;
  locationLng?: number;
  locationZip?: string;
  locationCity?: string;
  locationState?: string;
  
  // TIER 1: ALWAYS PUBLIC
  displayName: string; // "BlueBird_7432"
  displayNameGeneratedAt: Date;
  displayNameRegenerationAvailableAt: Date;
  generalLocation: string; // "Springfield area" (derived from city)
  
  // Reputation (PUBLIC)
  ratingAverage: number;
  ratingCount: number;
  completedTradesCount: number;
  completionRate: number;
  avgResponseTimeHours?: number;
  onTimeArrivalRate: number;
  
  // Verification (PUBLIC badge, PRIVATE documents)
  verificationBadge: boolean;
  verificationStatus: UserVerificationStatus;
  verificationDocuments?: Record<string, string>; // S3 URLs (admin only access)
  verifiedAt?: Date;
  
  // TIER 2: ESCROW-GATED
  profilePhotoUrl?: string; // Visible ONLY in active trades post-escrow
  vehicleDescription?: string; // Optional, e.g., "Blue Toyota Camry"
  
  // Metadata
  isActive: boolean;
  isBanned: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  displayName: string;
  generalLocation: string;
  ratingAverage: number;
  ratingCount: number;
  completedTradesCount: number;
  completionRate: number;
  verificationBadge: boolean;
  memberSince: string; // "August 2025"
  // NO personal info (first name, email, phone, etc.)
}

export interface UserIdentity {
  displayName: string;
  profilePhotoUrl?: string;
  vehicleInfo?: string;
  // NO real name, email, phone, address
}

// ============================================================================
// AUTHENTICATION INTERFACES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  verificationBadge: boolean;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  locationZip?: string;
  locationCity?: string;
  locationState?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  verificationRequired?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// DISPLAY NAME SYSTEM
// ============================================================================

export interface DisplayNameConfig {
  adjectives: string[];
  nouns: string[];
  numberRange: { min: number; max: number };
  regenerationCooldownDays: number;
}

export interface DisplayNameGeneration {
  displayName: string;
  generatedAt: Date;
  regenerationAvailableAt: Date;
  isUnique: boolean;
}

// ============================================================================
// AVATAR SYSTEM
// ============================================================================

export interface AvatarConfig {
  backgroundColor: string;
  textColor: string;
  icon: string;
  size: number;
}

export interface GenericAvatar {
  backgroundColor: string;
  textColor: string;
  icon: string;
  displayName: string;
  size: number;
}

// ============================================================================
// VERIFICATION SYSTEM
// ============================================================================

export enum UserVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export interface VerificationDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  documentImageUrl: string;
  verificationData: Record<string, any>;
  status: VerificationStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DocumentType {
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  PASSPORT = 'PASSPORT',
  STATE_ID = 'STATE_ID',
  MILITARY_ID = 'MILITARY_ID'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// ============================================================================
// PRIVACY & SETTINGS
// ============================================================================

export interface PrivacySettings {
  userId: string;
  showTradeHistory: boolean;
  showCompletedTrades: boolean;
  showRatings: boolean;
  allowPhotoAccess: boolean;
  allowVehicleInfo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  userId: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  tradeUpdates: boolean;
  safetyAlerts: boolean;
  marketingEmails: boolean;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  units: 'metric' | 'imperial';
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  appVersion?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface UserListResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UserSearchResponse {
  users: UserProfile[];
  total: number;
  query: string;
  filters: SearchFilters;
}

export interface SearchFilters {
  location?: string;
  ratingMin?: number;
  verificationRequired?: boolean;
  completedTradesMin?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface UserError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  DISPLAY_NAME_CONFLICT = 'DISPLAY_NAME_CONFLICT',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface UserValidationRules {
  email: {
    required: boolean;
    pattern: RegExp;
    maxLength: number;
  };
  password: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  displayName: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  firstName: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  lastName: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'SUSPENDED';

export type LoginMethod = 'EMAIL' | 'GOOGLE' | 'APPLE';

export type VerificationMethod = 'EMAIL' | 'SMS' | 'DOCUMENT';

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
// All types are already exported individually above
