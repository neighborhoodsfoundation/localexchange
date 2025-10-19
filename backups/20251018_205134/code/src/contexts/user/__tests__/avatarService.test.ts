/**
 * Avatar Service Tests
 * 
 * Tests for avatar generation, customization, and caching.
 */

import {
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
} from '../avatarService';

// ============================================================================
// AVATAR GENERATION TESTS
// ============================================================================

describe('Avatar Generation', () => {
  it('should generate avatar with correct properties', () => {
    const avatar = generateAvatar('BlueBird_7432');
    
    expect(avatar).toHaveProperty('backgroundColor');
    expect(avatar).toHaveProperty('textColor');
    expect(avatar).toHaveProperty('icon');
    expect(avatar).toHaveProperty('displayName');
    expect(avatar).toHaveProperty('size');
    expect(avatar.displayName).toBe('BlueBird_7432');
    expect(avatar.size).toBe(64);
  });

  it('should generate different avatars for different names', () => {
    const avatar1 = generateAvatar('BlueBird_7432');
    const avatar2 = generateAvatar('RedTiger_1234');
    
    expect(avatar1.backgroundColor).not.toBe(avatar2.backgroundColor);
    expect(avatar1.icon).not.toBe(avatar2.icon);
  });

  it('should generate consistent avatars for same name', () => {
    const avatar1 = generateAvatar('BlueBird_7432');
    const avatar2 = generateAvatar('BlueBird_7432');
    
    expect(avatar1.backgroundColor).toBe(avatar2.backgroundColor);
    expect(avatar1.textColor).toBe(avatar2.textColor);
    expect(avatar1.icon).toBe(avatar2.icon);
  });
});

// ============================================================================
// INITIALS EXTRACTION TESTS
// ============================================================================

describe('Initials Extraction', () => {
  it('should extract initials from valid display name', () => {
    expect(extractInitials('BlueBird_7432')).toBe('BB');
    expect(extractInitials('RedTiger_1234')).toBe('RT');
    expect(extractInitials('GreenWave_9999')).toBe('GW');
  });

  it('should handle display names without numbers', () => {
    expect(extractInitials('BlueBird')).toBe('BL');
    expect(extractInitials('RedTiger')).toBe('RE');
  });

  it('should handle short display names', () => {
    expect(extractInitials('Blue_1234')).toBe('BL');
    expect(extractInitials('Red_1234')).toBe('RE');
  });

  it('should handle edge cases', () => {
    expect(extractInitials('')).toBe('');
    expect(extractInitials('A')).toBe('A');
    expect(extractInitials('AB')).toBe('AB');
  });
});

// ============================================================================
// COLOR SCHEME TESTS
// ============================================================================

describe('Color Scheme Generation', () => {
  it('should generate color scheme for display name', () => {
    const scheme = generateColorScheme('BlueBird_7432');
    
    expect(scheme).toHaveProperty('bg');
    expect(scheme).toHaveProperty('text');
    expect(scheme).toHaveProperty('name');
    expect(scheme.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(scheme.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should generate consistent color scheme for same name', () => {
    const scheme1 = generateColorScheme('BlueBird_7432');
    const scheme2 = generateColorScheme('BlueBird_7432');
    
    expect(scheme1.bg).toBe(scheme2.bg);
    expect(scheme1.text).toBe(scheme2.text);
    expect(scheme1.name).toBe(scheme2.name);
  });

  it('should generate different color schemes for different names', () => {
    const scheme1 = generateColorScheme('BlueBird_7432');
    const scheme2 = generateColorScheme('RedTiger_1234');
    
    expect(scheme1.bg).not.toBe(scheme2.bg);
  });
});

// ============================================================================
// AVATAR URL TESTS
// ============================================================================

describe('Avatar URL Generation', () => {
  it('should generate valid data URL', () => {
    const url = generateAvatarUrl('BlueBird_7432');
    
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(url.length).toBeGreaterThan(100);
  });

  it('should generate different URLs for different names', () => {
    const url1 = generateAvatarUrl('BlueBird_7432');
    const url2 = generateAvatarUrl('RedTiger_1234');
    
    expect(url1).not.toBe(url2);
  });

  it('should generate consistent URLs for same name', () => {
    const url1 = generateAvatarUrl('BlueBird_7432');
    const url2 = generateAvatarUrl('BlueBird_7432');
    
    expect(url1).toBe(url2);
  });
});

// ============================================================================
// SVG GENERATION TESTS
// ============================================================================

describe('SVG Generation', () => {
  it('should create valid SVG', () => {
    const avatar = generateAvatar('BlueBird_7432');
    const svg = createAvatarSVG(avatar);
    
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain(avatar.backgroundColor);
    expect(svg).toContain(avatar.textColor);
    expect(svg).toContain(avatar.icon);
  });

  it('should include correct dimensions', () => {
    const avatar = generateAvatar('BlueBird_7432', 128);
    const svg = createAvatarSVG(avatar);
    
    expect(svg).toContain('width="128"');
    expect(svg).toContain('height="128"');
  });

  it('should include correct styling', () => {
    const avatar = generateAvatar('BlueBird_7432');
    const svg = createAvatarSVG(avatar);
    
    expect(svg).toContain('fill="' + avatar.backgroundColor + '"');
    expect(svg).toContain('fill="' + avatar.textColor + '"');
  });
});

// ============================================================================
// AVATAR CUSTOMIZATION TESTS
// ============================================================================

describe('Avatar Customization', () => {
  it('should generate avatar with custom size', () => {
    const avatar = generateAvatarWithSize('BlueBird_7432', 128);
    
    expect(avatar.size).toBe(128);
    expect(avatar.displayName).toBe('BlueBird_7432');
  });

  it('should generate avatar with custom colors', () => {
    const avatar = generateAvatarWithColors('BlueBird_7432', '#FF0000', '#FFFFFF');
    
    expect(avatar.backgroundColor).toBe('#FF0000');
    expect(avatar.textColor).toBe('#FFFFFF');
    expect(avatar.displayName).toBe('BlueBird_7432');
  });

  it('should generate avatar with custom icon', () => {
    const avatar = generateAvatarWithIcon('BlueBird_7432', '🚀');
    
    expect(avatar.icon).toBe('🚀');
    expect(avatar.displayName).toBe('BlueBird_7432');
  });
});

// ============================================================================
// AVATAR VALIDATION TESTS
// ============================================================================

describe('Avatar Validation', () => {
  it('should validate correct avatar config', () => {
    const config = {
      size: 64,
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF'
    };
    
    expect(validateAvatarConfig(config)).toBe(true);
  });

  it('should reject invalid size', () => {
    const config = {
      size: 8, // Too small
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF'
    };
    
    expect(validateAvatarConfig(config)).toBe(false);
  });

  it('should reject invalid colors', () => {
    const config = {
      size: 64,
      backgroundColor: 'invalid-color',
      textColor: '#FFFFFF'
    };
    
    expect(validateAvatarConfig(config)).toBe(false);
  });
});

// ============================================================================
// COLOR VALIDATION TESTS
// ============================================================================

describe('Color Validation', () => {
  it('should validate correct hex colors', () => {
    expect(isValidColor('#3B82F6')).toBe(true);
    expect(isValidColor('#FF0000')).toBe(true);
    expect(isValidColor('#00FF00')).toBe(true);
    expect(isValidColor('#0000FF')).toBe(true);
    expect(isValidColor('#FFF')).toBe(true);
    expect(isValidColor('#000')).toBe(true);
  });

  it('should reject invalid hex colors', () => {
    expect(isValidColor('invalid')).toBe(false);
    expect(isValidColor('#GGGGGG')).toBe(false);
    expect(isValidColor('3B82F6')).toBe(false);
    expect(isValidColor('#3B82F')).toBe(false);
    expect(isValidColor('#3B82F66')).toBe(false);
  });
});

// ============================================================================
// AVATAR STATISTICS TESTS
// ============================================================================

describe('Avatar Statistics', () => {
  it('should return correct statistics', () => {
    const stats = getAvatarStats();
    
    expect(stats.totalColorSchemes).toBeGreaterThan(0);
    expect(stats.defaultSize).toBe(64);
    expect(stats.supportedSizes).toHaveProperty('min');
    expect(stats.supportedSizes).toHaveProperty('max');
    expect(stats.supportedFormats).toContain('SVG');
  });

  it('should have correct size limits', () => {
    const stats = getAvatarStats();
    
    expect(stats.supportedSizes.min).toBe(16);
    expect(stats.supportedSizes.max).toBe(512);
  });
});

// ============================================================================
// AVATAR PREVIEW TESTS
// ============================================================================

describe('Avatar Preview', () => {
  it('should generate preview with different sizes', () => {
    const preview = generateAvatarPreview('BlueBird_7432');
    
    expect(preview).toHaveProperty('small');
    expect(preview).toHaveProperty('medium');
    expect(preview).toHaveProperty('large');
    
    expect(preview.small).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(preview.medium).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(preview.large).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should generate different previews for different names', () => {
    const preview1 = generateAvatarPreview('BlueBird_7432');
    const preview2 = generateAvatarPreview('RedTiger_1234');
    
    expect(preview1.small).not.toBe(preview2.small);
    expect(preview1.medium).not.toBe(preview2.medium);
    expect(preview1.large).not.toBe(preview2.large);
  });
});

// ============================================================================
// AVATAR CACHING TESTS
// ============================================================================

describe('Avatar Caching', () => {
  beforeEach(() => {
    clearAvatarCache();
  });

  it('should generate cache key', () => {
    const key = generateAvatarCacheKey('BlueBird_7432', 64);
    
    expect(key).toBe('avatar_BlueBird_7432_64');
  });

  it('should check if avatar is cached', () => {
    expect(isAvatarCached('BlueBird_7432', 64)).toBe(false);
  });

  it('should cache and retrieve avatar', () => {
    const url = 'data:image/svg+xml;base64,test';
    
    cacheAvatar('BlueBird_7432', 64, url);
    expect(isAvatarCached('BlueBird_7432', 64)).toBe(true);
    expect(getCachedAvatar('BlueBird_7432', 64)).toBe(url);
  });

  it('should clear avatar cache', () => {
    cacheAvatar('BlueBird_7432', 64, 'test-url');
    expect(isAvatarCached('BlueBird_7432', 64)).toBe(true);
    
    clearAvatarCache();
    expect(isAvatarCached('BlueBird_7432', 64)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Avatar Service Integration', () => {
  it('should work with complete flow', () => {
    const avatar = generateAvatar('BlueBird_7432');
    const url = generateAvatarUrl('BlueBird_7432');
    const svg = createAvatarSVG(avatar);
    
    expect(avatar.displayName).toBe('BlueBird_7432');
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(svg).toContain('<svg');
  });

  it('should handle multiple operations', () => {
    const names = ['BlueBird_7432', 'RedTiger_1234', 'GreenWave_9999'];
    const avatars = names.map(name => generateAvatar(name));
    const urls = names.map(name => generateAvatarUrl(name));
    
    expect(avatars).toHaveLength(3);
    expect(urls).toHaveLength(3);
    
    avatars.forEach(avatar => {
      expect(avatar.displayName).toBeDefined();
      expect(avatar.backgroundColor).toBeDefined();
      expect(avatar.textColor).toBeDefined();
    });
    
    urls.forEach(url => {
      expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });
});
