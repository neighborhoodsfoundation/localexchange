/**
 * Display Name Service Tests
 * 
 * Tests for display name generation, validation, and management.
 */

import {
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
} from '../displayNameService';

// ============================================================================
// DISPLAY NAME GENERATION TESTS
// ============================================================================

describe('Display Name Generation', () => {
  it('should generate valid display name format', async () => {
    const result = await generateDisplayName();
    
    expect(result.displayName).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+_\d{4}$/);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.regenerationAvailableAt).toBeInstanceOf(Date);
    expect(result.isUnique).toBe(true);
  });

  it('should generate different names on multiple calls', async () => {
    const result1 = await generateDisplayName();
    const result2 = await generateDisplayName();
    
    expect(result1.displayName).not.toBe(result2.displayName);
  });

  it('should have correct regeneration cooldown', async () => {
    const result = await generateDisplayName();
    const now = new Date();
    const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    expect(result.regenerationAvailableAt.getTime()).toBeGreaterThan(now.getTime());
    expect(result.regenerationAvailableAt.getTime() - now.getTime()).toBeCloseTo(cooldownMs, -3);
  });
});

// ============================================================================
// DISPLAY NAME VALIDATION TESTS
// ============================================================================

describe('Display Name Validation', () => {
  it('should validate correct format', () => {
    expect(validateDisplayName('BlueBird_7432')).toBe(true);
    expect(validateDisplayName('RedTiger_1234')).toBe(true);
    expect(validateDisplayName('GreenWave_9999')).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(validateDisplayName('bluebird_7432')).toBe(false); // lowercase
    expect(validateDisplayName('BlueBird7432')).toBe(false); // no underscore
    expect(validateDisplayName('Blue_Bird_7432')).toBe(false); // extra underscore
    expect(validateDisplayName('BlueBird_123')).toBe(false); // wrong number length
    expect(validateDisplayName('BlueBird_12345')).toBe(false); // wrong number length
    expect(validateDisplayName('BlueBird_abcd')).toBe(false); // non-numeric
  });

  it('should handle edge cases', () => {
    expect(validateDisplayName('')).toBe(false);
    expect(validateDisplayName('BlueBird')).toBe(false);
    expect(validateDisplayName('BlueBird_')).toBe(false);
    expect(validateDisplayName('_7432')).toBe(false);
  });
});

// ============================================================================
// DISPLAY NAME ANALYSIS TESTS
// ============================================================================

describe('Display Name Analysis', () => {
  it('should analyze valid display name', () => {
    const result = analyzeDisplayName('BlueBird_7432');
    
    expect(result.adjective).toBe('Blue');
    expect(result.noun).toBe('Bird');
    expect(result.number).toBe('7432');
    expect(result.isValid).toBe(true);
  });

  it('should handle invalid display name', () => {
    const result = analyzeDisplayName('invalid_name');
    
    expect(result.adjective).toBe('');
    expect(result.noun).toBe('');
    expect(result.number).toBe('');
    expect(result.isValid).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(analyzeDisplayName('')).toEqual({
      adjective: '',
      noun: '',
      number: '',
      isValid: false
    });
    
    expect(analyzeDisplayName('BlueBird')).toEqual({
      adjective: '',
      noun: '',
      number: '',
      isValid: false
    });
  });
});

// ============================================================================
// REGENERATION TESTS
// ============================================================================

describe('Display Name Regeneration', () => {
  it('should allow regeneration after cooldown', () => {
    const lastGenerated = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    expect(canRegenerateDisplayName(lastGenerated)).toBe(true);
  });

  it('should prevent regeneration during cooldown', () => {
    const lastGenerated = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    expect(canRegenerateDisplayName(lastGenerated)).toBe(false);
  });

  it('should calculate time until regeneration', () => {
    const lastGenerated = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const timeMs = getTimeUntilRegeneration(lastGenerated);
    
    expect(timeMs).toBeGreaterThan(0);
    expect(timeMs).toBeLessThan(30 * 24 * 60 * 60 * 1000); // Less than 30 days
  });

  it('should format time until regeneration', () => {
    const lastGenerated = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const formatted = formatTimeUntilRegeneration(lastGenerated);
    
    expect(formatted).toContain('day');
    expect(formatted).toContain('remaining');
  });

  it('should show available now when cooldown expired', () => {
    const lastGenerated = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    const formatted = formatTimeUntilRegeneration(lastGenerated);
    
    expect(formatted).toBe('Available now');
  });
});

// ============================================================================
// DISPLAY NAME SUGGESTIONS TESTS
// ============================================================================

describe('Display Name Suggestions', () => {
  it('should generate correct number of suggestions', async () => {
    const suggestions = await generateDisplayNameSuggestions(5);
    
    expect(suggestions).toHaveLength(5);
    suggestions.forEach(suggestion => {
      expect(validateDisplayName(suggestion)).toBe(true);
    });
  });

  it('should generate themed suggestions', async () => {
    const natureSuggestions = await generateThemedDisplayNameSuggestions('nature', 3);
    const animalSuggestions = await generateThemedDisplayNameSuggestions('animals', 3);
    
    expect(natureSuggestions).toHaveLength(3);
    expect(animalSuggestions).toHaveLength(3);
    
    natureSuggestions.forEach(suggestion => {
      expect(validateDisplayName(suggestion)).toBe(true);
    });
    
    animalSuggestions.forEach(suggestion => {
      expect(validateDisplayName(suggestion)).toBe(true);
    });
  });

  it('should handle different themes', async () => {
    const themes = ['nature', 'animals', 'colors', 'weather', 'space'] as const;
    
    for (const theme of themes) {
      const suggestions = await generateThemedDisplayNameSuggestions(theme, 2);
      expect(suggestions).toHaveLength(2);
    }
  });
});

// ============================================================================
// DISPLAY NAME STATISTICS TESTS
// ============================================================================

describe('Display Name Statistics', () => {
  it('should return correct statistics', () => {
    const stats = getDisplayNameStats();
    
    expect(stats.totalAdjectives).toBeGreaterThan(0);
    expect(stats.totalNouns).toBeGreaterThan(0);
    expect(stats.totalCombinations).toBeGreaterThan(0);
    expect(stats.regenerationCooldownDays).toBe(30);
  });

  it('should calculate total combinations correctly', () => {
    const stats = getDisplayNameStats();
    const expectedCombinations = stats.totalAdjectives * stats.totalNouns * 9000; // 1000-9999
    
    expect(stats.totalCombinations).toBe(expectedCombinations);
  });
});

// ============================================================================
// UNIQUENESS TESTS
// ============================================================================

describe('Display Name Uniqueness', () => {
  it('should check uniqueness', async () => {
    const isUnique = await checkDisplayNameUniqueness('TestName_1234');
    
    expect(typeof isUnique).toBe('boolean');
  });

  it('should handle uniqueness check errors', async () => {
    // Mock the service to throw an error
    const originalCheck = checkDisplayNameUniqueness;
    jest.spyOn(require('../displayNameService'), 'checkDisplayNameUniqueness')
      .mockImplementation(() => {
        throw new Error('Service error');
      });
    
    const isUnique = await checkDisplayNameUniqueness('TestName_1234');
    expect(isUnique).toBe(false);
    
    // Restore original implementation
    jest.restoreAllMocks();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Display Name Service Integration', () => {
  it('should work with complete flow', async () => {
    // Generate display name
    const result = await generateDisplayName();
    expect(validateDisplayName(result.displayName)).toBe(true);
    
    // Analyze display name
    const analysis = analyzeDisplayName(result.displayName);
    expect(analysis.isValid).toBe(true);
    
    // Check regeneration availability
    const canRegenerate = canRegenerateDisplayName(result.generatedAt);
    expect(typeof canRegenerate).toBe('boolean');
  });

  it('should handle multiple operations', async () => {
    const results = await Promise.all([
      generateDisplayName(),
      generateDisplayName(),
      generateDisplayName()
    ]);
    
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(validateDisplayName(result.displayName)).toBe(true);
    });
  });
});
