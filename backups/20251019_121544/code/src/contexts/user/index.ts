/**
 * User Context Exports
 * 
 * Central export file for all user-related functionality including
 * context, hooks, services, and types.
 */

// ============================================================================
// CONTEXT EXPORTS
// ============================================================================

export { default as UserContext, UserProvider, useUser } from './UserContext';

// ============================================================================
// HOOK EXPORTS
// ============================================================================

export {
  useAuth,
  useLoginForm,
  useRegisterForm,
  useProfile,
  useSettings,
  usePrivacy,
  useDisplayName,
  useVerification,
  usePublicProfile,
  useTradeIdentity,
  useSession,
  useUserError
} from './userHooks';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export { default as userService } from './userService';
export {
  generateDisplayName,
  checkDisplayNameUniqueness,
  validateDisplayName,
  canRegenerateDisplayName,
  getTimeUntilRegeneration,
  formatTimeUntilRegeneration,
  analyzeDisplayName,
  getDisplayNameStats,
  generateDisplayNameSuggestions,
  generateThemedDisplayNameSuggestions
} from './displayNameService';

export {
  generateAvatar,
  extractInitials,
  generateColorScheme,
  generateAvatarUrl,
  createAvatarSVG,
  generateAvatarWithSize,
  generateAvatarWithColors,
  generateAvatarWithIcon,
  validateAvatarConfig,
  isValidColor,
  getAvailableColorSchemes,
  getAvatarStats,
  generateAvatarPreview,
  generateAvatarCacheKey,
  isAvatarCached,
  cacheAvatar,
  getCachedAvatar,
  clearAvatarCache
} from './avatarService';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  User,
  UserProfile,
  UserIdentity,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  DisplayNameConfig,
  DisplayNameGeneration,
  AvatarConfig,
  GenericAvatar,
  VerificationDocument,
  PrivacySettings,
  UserSettings,
  NotificationSettings,
  UserPreferences,
  UserSession,
  DeviceInfo,
  UserListResponse,
  UserSearchResponse,
  SearchFilters,
  UserError,
  UserValidationRules
} from './user.types';

export {
  UserVerificationStatus,
  DocumentType,
  VerificationStatus,
  UserErrorCode
} from './user.types';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export const USER_CONSTANTS = {
  DISPLAY_NAME: {
    REGENERATION_COOLDOWN_DAYS: 30,
    MIN_LENGTH: 8,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z][a-z]+[A-Z][a-z]+_\d{4}$/
  },
  AVATAR: {
    DEFAULT_SIZE: 64,
    MIN_SIZE: 16,
    MAX_SIZE: 512,
    SUPPORTED_FORMATS: ['SVG', 'PNG', 'JPEG']
  },
  VERIFICATION: {
    DOCUMENT_TYPES: ['DRIVERS_LICENSE', 'PASSPORT', 'STATE_ID', 'MILITARY_ID'],
    STATUSES: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']
  },
  PRIVACY: {
    TIER_1_PUBLIC: ['displayName', 'generalLocation', 'ratingAverage', 'ratingCount', 'completedTradesCount', 'completionRate', 'verificationBadge'],
    TIER_2_ESCROW_GATED: ['profilePhotoUrl', 'vehicleDescription'],
    TIER_3_PRIVATE: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'exactLocation']
  }
} as const;

export const USER_VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  displayName: {
    required: true,
    minLength: 8,
    maxLength: 20,
    pattern: /^[A-Z][a-z]+[A-Z][a-z]+_\d{4}$/
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Za-z\s'-]+$/
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Za-z\s'-]+$/
  }
} as const;
