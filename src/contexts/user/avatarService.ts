/**
 * Avatar Generation Service
 * 
 * Generates generic avatars for users using display name initials
 * and color schemes. Provides consistent, anonymous avatars that
 * don't reveal personal information.
 */

import { AvatarConfig, GenericAvatar } from './user.types';

// ============================================================================
// AVATAR CONFIGURATION
// ============================================================================

const AVATAR_CONFIG: AvatarConfig = {
  backgroundColor: '#3B82F6', // Blue
  textColor: '#FFFFFF', // White
  icon: '👤', // Generic person icon
  size: 64
};

// ============================================================================
// COLOR SCHEMES
// ============================================================================

const COLOR_SCHEMES = [
  { bg: '#3B82F6', text: '#FFFFFF', name: 'Blue' },
  { bg: '#EF4444', text: '#FFFFFF', name: 'Red' },
  { bg: '#10B981', text: '#FFFFFF', name: 'Green' },
  { bg: '#F59E0B', text: '#FFFFFF', name: 'Yellow' },
  { bg: '#8B5CF6', text: '#FFFFFF', name: 'Purple' },
  { bg: '#EC4899', text: '#FFFFFF', name: 'Pink' },
  { bg: '#06B6D4', text: '#FFFFFF', name: 'Cyan' },
  { bg: '#84CC16', text: '#FFFFFF', name: 'Lime' },
  { bg: '#F97316', text: '#FFFFFF', name: 'Orange' },
  { bg: '#6366F1', text: '#FFFFFF', name: 'Indigo' },
  { bg: '#14B8A6', text: '#FFFFFF', name: 'Teal' },
  { bg: '#F43F5E', text: '#FFFFFF', name: 'Rose' }
];

// ============================================================================
// AVATAR GENERATION
// ============================================================================

/**
 * Generates a generic avatar for a user based on their display name
 */
export const generateAvatar = (displayName: string, size: number = 64): GenericAvatar => {
  // Extract initials from display name
  const initials = extractInitials(displayName);
  
  // Generate color scheme based on display name hash
  const colorScheme = generateColorScheme(displayName);
  
  return {
    backgroundColor: colorScheme.bg,
    textColor: colorScheme.text,
    icon: initials,
    displayName,
    size
  };
};

/**
 * Extracts initials from display name
 */
export const extractInitials = (displayName: string): string => {
  // Remove numbers and underscores
  const cleanName = displayName.replace(/[_\d]/g, '');
  
  // Find the split between adjective and noun (capital letter in middle)
  const match = cleanName.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
  
  if (match) {
    const [, adjective, noun] = match;
    return (adjective[0] + noun[0]).toUpperCase();
  }
  
  // Fallback: use first two characters
  return cleanName.substring(0, 2).toUpperCase();
};

/**
 * Generates a color scheme based on display name hash
 */
export const generateColorScheme = (displayName: string) => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    const char = displayName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to select color scheme
  const index = Math.abs(hash) % COLOR_SCHEMES.length;
  return COLOR_SCHEMES[index];
};

/**
 * Generates avatar URL for display
 */
export const generateAvatarUrl = (displayName: string, size: number = 64): string => {
  const avatar = generateAvatar(displayName, size);
  
  // Create SVG data URL
  const svg = createAvatarSVG(avatar);
  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
  
  return dataUrl;
};

/**
 * Creates SVG for avatar
 */
export const createAvatarSVG = (avatar: GenericAvatar): string => {
  const { backgroundColor, textColor, icon, size } = avatar;
  
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" rx="8"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
            font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            font-weight="bold" fill="${textColor}">
        ${icon}
      </text>
    </svg>
  `.trim();
};

// ============================================================================
// AVATAR CUSTOMIZATION
// ============================================================================

/**
 * Generates avatar with custom size
 */
export const generateAvatarWithSize = (displayName: string, size: number): GenericAvatar => {
  return generateAvatar(displayName, size);
};

/**
 * Generates avatar with custom color scheme
 */
export const generateAvatarWithColors = (
  displayName: string, 
  backgroundColor: string, 
  textColor: string
): GenericAvatar => {
  const initials = extractInitials(displayName);
  
  return {
    backgroundColor,
    textColor,
    icon: initials,
    displayName,
    size: 64
  };
};

/**
 * Generates avatar with custom icon
 */
export const generateAvatarWithIcon = (
  displayName: string, 
  icon: string
): GenericAvatar => {
  const colorScheme = generateColorScheme(displayName);
  
  return {
    backgroundColor: colorScheme.bg,
    textColor: colorScheme.text,
    icon,
    displayName,
    size: 64
  };
};

// ============================================================================
// AVATAR VALIDATION
// ============================================================================

/**
 * Validates avatar configuration
 */
export const validateAvatarConfig = (config: Partial<AvatarConfig>): boolean => {
  if (config.size && (config.size < 16 || config.size > 512)) {
    return false;
  }
  
  if (config.backgroundColor && !isValidColor(config.backgroundColor)) {
    return false;
  }
  
  if (config.textColor && !isValidColor(config.textColor)) {
    return false;
  }
  
  return true;
};

/**
 * Validates color format
 */
export const isValidColor = (color: string): boolean => {
  // Check if it's a valid hex color
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// ============================================================================
// AVATAR UTILITIES
// ============================================================================

/**
 * Gets available color schemes
 */
export const getAvailableColorSchemes = () => {
  return COLOR_SCHEMES.map(scheme => ({
    ...scheme,
    preview: generateAvatarUrl('TestUser_1234', 32)
  }));
};

/**
 * Gets avatar statistics
 */
export const getAvatarStats = () => {
  return {
    totalColorSchemes: COLOR_SCHEMES.length,
    defaultSize: AVATAR_CONFIG.size,
    supportedSizes: { min: 16, max: 512 },
    supportedFormats: ['SVG', 'PNG', 'JPEG']
  };
};

/**
 * Generates avatar preview
 */
export const generateAvatarPreview = (displayName: string): {
  small: string;
  medium: string;
  large: string;
} => {
  return {
    small: generateAvatarUrl(displayName, 32),
    medium: generateAvatarUrl(displayName, 64),
    large: generateAvatarUrl(displayName, 128)
  };
};

// ============================================================================
// AVATAR CACHING
// ============================================================================

/**
 * Generates cache key for avatar
 */
export const generateAvatarCacheKey = (displayName: string, size: number): string => {
  return `avatar_${displayName}_${size}`;
};

/**
 * Checks if avatar is cached
 */
export const isAvatarCached = (displayName: string, size: number): boolean => {
  const cacheKey = generateAvatarCacheKey(displayName, size);
  return localStorage.getItem(cacheKey) !== null;
};

/**
 * Caches avatar URL
 */
export const cacheAvatar = (displayName: string, size: number, url: string): void => {
  const cacheKey = generateAvatarCacheKey(displayName, size);
  localStorage.setItem(cacheKey, url);
};

/**
 * Gets cached avatar URL
 */
export const getCachedAvatar = (displayName: string, size: number): string | null => {
  const cacheKey = generateAvatarCacheKey(displayName, size);
  return localStorage.getItem(cacheKey);
};

/**
 * Clears avatar cache
 */
export const clearAvatarCache = (): void => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('avatar_')) {
      localStorage.removeItem(key);
    }
  });
};

// ============================================================================
// AVATAR EXPORTS
// ============================================================================

export {
  AVATAR_CONFIG,
  COLOR_SCHEMES,
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
};
