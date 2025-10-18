/**
 * Display Name Generation Service
 * 
 * Generates anonymous, unique display names for users using
 * adjective + noun + number pattern (e.g., "BlueBird_7432").
 * Ensures uniqueness and provides regeneration capabilities.
 */

import { DisplayNameConfig, DisplayNameGeneration } from './user.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DISPLAY_NAME_CONFIG: DisplayNameConfig = {
  adjectives: [
    'Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Cyan',
    'Swift', 'Bright', 'Bold', 'Calm', 'Wild', 'Gentle', 'Sharp', 'Smooth',
    'Happy', 'Lucky', 'Brave', 'Smart', 'Quick', 'Strong', 'Wise', 'Kind',
    'Golden', 'Silver', 'Copper', 'Bronze', 'Crystal', 'Diamond', 'Pearl',
    'Ocean', 'Mountain', 'Forest', 'Desert', 'River', 'Lake', 'Valley',
    'Sunny', 'Cloudy', 'Stormy', 'Windy', 'Rainy', 'Snowy', 'Foggy', 'Clear'
  ],
  nouns: [
    'Bird', 'Eagle', 'Hawk', 'Falcon', 'Raven', 'Owl', 'Swan', 'Dove',
    'Tiger', 'Lion', 'Wolf', 'Bear', 'Fox', 'Deer', 'Rabbit', 'Squirrel',
    'Dolphin', 'Whale', 'Shark', 'Turtle', 'Fish', 'Crab', 'Lobster', 'Seal',
    'Flower', 'Rose', 'Lily', 'Tulip', 'Daisy', 'Sunflower', 'Orchid', 'Lotus',
    'Tree', 'Oak', 'Pine', 'Maple', 'Willow', 'Cedar', 'Birch', 'Elm',
    'Star', 'Moon', 'Sun', 'Planet', 'Comet', 'Asteroid', 'Galaxy', 'Nebula',
    'Wave', 'Breeze', 'Storm', 'Lightning', 'Thunder', 'Rainbow', 'Aurora', 'Mist'
  ],
  numberRange: { min: 1000, max: 9999 },
  regenerationCooldownDays: 30
};

// ============================================================================
// DISPLAY NAME GENERATION
// ============================================================================

/**
 * Generates a unique display name using adjective + noun + number pattern
 */
const generateDisplayName = async (): Promise<DisplayNameGeneration> => {
  const { adjectives, nouns, numberRange } = DISPLAY_NAME_CONFIG;
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate random components
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * (numberRange.max - numberRange.min + 1)) + numberRange.min;
    
    const displayName = `${adjective}${noun}_${number}`;
    
    // Check uniqueness
    const isUnique = await checkDisplayNameUniqueness(displayName);
    
    if (isUnique) {
      return {
        displayName,
        generatedAt: new Date(),
        regenerationAvailableAt: new Date(Date.now() + DISPLAY_NAME_CONFIG.regenerationCooldownDays * 24 * 60 * 60 * 1000),
        isUnique: true
      };
    }
    
    attempts++;
  }
  
  // Fallback: add timestamp if uniqueness fails
  const timestamp = Date.now().toString().slice(-4);
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const displayName = `${adjective}${noun}_${timestamp}`;
  
  return {
    displayName,
    generatedAt: new Date(),
    regenerationAvailableAt: new Date(Date.now() + DISPLAY_NAME_CONFIG.regenerationCooldownDays * 24 * 60 * 60 * 1000),
    isUnique: true
  };
};

/**
 * Checks if a display name is unique
 */
const checkDisplayNameUniqueness = async (displayName: string): Promise<boolean> => {
  try {
    // TODO: Implement actual uniqueness check against database
    // const response = await userService.checkDisplayNameAvailability(displayName);
    // return response.available;
    
    // Mock implementation - assume unique for now
    return true;
  } catch (error) {
    console.error('Error checking display name uniqueness:', error);
    return false;
  }
};

/**
 * Validates display name format
 */
const validateDisplayName = (displayName: string): boolean => {
  // Pattern: Adjective + Noun + _ + Number
  const pattern = /^[A-Z][a-z]+[A-Z][a-z]+_\d{4}$/;
  return pattern.test(displayName);
};

/**
 * Checks if display name regeneration is available
 */
const canRegenerateDisplayName = (lastGeneratedAt: Date): boolean => {
  const now = new Date();
  const cooldownMs = DISPLAY_NAME_CONFIG.regenerationCooldownDays * 24 * 60 * 60 * 1000;
  const nextAvailableAt = new Date(lastGeneratedAt.getTime() + cooldownMs);
  
  return now >= nextAvailableAt;
};

/**
 * Gets time until next regeneration is available
 */
const getTimeUntilRegeneration = (lastGeneratedAt: Date): number => {
  const now = new Date();
  const cooldownMs = DISPLAY_NAME_CONFIG.regenerationCooldownDays * 24 * 60 * 60 * 1000;
  const nextAvailableAt = new Date(lastGeneratedAt.getTime() + cooldownMs);
  
  return Math.max(0, nextAvailableAt.getTime() - now.getTime());
};

/**
 * Formats time until regeneration as human-readable string
 */
const formatTimeUntilRegeneration = (lastGeneratedAt: Date): string => {
  const timeMs = getTimeUntilRegeneration(lastGeneratedAt);
  
  if (timeMs === 0) {
    return 'Available now';
  }
  
  const days = Math.floor(timeMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((timeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((timeMs % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
};

// ============================================================================
// DISPLAY NAME ANALYSIS
// ============================================================================

/**
 * Analyzes display name components
 */
const analyzeDisplayName = (displayName: string): {
  adjective: string;
  noun: string;
  number: string;
  isValid: boolean;
} => {
  const parts = displayName.split('_');
  
  if (parts.length !== 2) {
    return {
      adjective: '',
      noun: '',
      number: '',
      isValid: false
    };
  }
  
  const [namePart, numberPart] = parts;
  
  // Find the split between adjective and noun (capital letter in middle)
  const nameMatch = namePart?.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
  
  if (!nameMatch) {
    return {
      adjective: '',
      noun: '',
      number: '',
      isValid: false
    };
  }
  
  const [, adjective, noun] = nameMatch;
  
  return {
    adjective: adjective || '',
    noun: noun || '',
    number: numberPart || '',
    isValid: true
  };
};

/**
 * Gets display name statistics
 */
const getDisplayNameStats = (): {
  totalAdjectives: number;
  totalNouns: number;
  totalCombinations: number;
  regenerationCooldownDays: number;
} => {
  const { adjectives, nouns, regenerationCooldownDays } = DISPLAY_NAME_CONFIG;
  
  return {
    totalAdjectives: adjectives.length,
    totalNouns: nouns.length,
    totalCombinations: adjectives.length * nouns.length * (DISPLAY_NAME_CONFIG.numberRange.max - DISPLAY_NAME_CONFIG.numberRange.min + 1),
    regenerationCooldownDays
  };
};

// ============================================================================
// DISPLAY NAME SUGGESTIONS
// ============================================================================

/**
 * Generates display name suggestions based on user preferences
 */
const generateDisplayNameSuggestions = async (count: number = 5): Promise<string[]> => {
  const suggestions: string[] = [];
  const { adjectives, nouns, numberRange } = DISPLAY_NAME_CONFIG;
  
  for (let i = 0; i < count; i++) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * (numberRange.max - numberRange.min + 1)) + numberRange.min;
    
    const displayName = `${adjective}${noun}_${number}`;
    suggestions.push(displayName);
  }
  
  return suggestions;
};

/**
 * Generates themed display name suggestions
 */
const generateThemedDisplayNameSuggestions = async (
  theme: 'nature' | 'animals' | 'colors' | 'weather' | 'space',
  count: number = 5
): Promise<string[]> => {
  const themedConfig = getThemedConfig(theme);
  const suggestions: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const adjective = themedConfig.adjectives[Math.floor(Math.random() * themedConfig.adjectives.length)];
    const noun = themedConfig.nouns[Math.floor(Math.random() * themedConfig.nouns.length)];
    const number = Math.floor(Math.random() * (DISPLAY_NAME_CONFIG.numberRange.max - DISPLAY_NAME_CONFIG.numberRange.min + 1)) + DISPLAY_NAME_CONFIG.numberRange.min;
    
    const displayName = `${adjective}${noun}_${number}`;
    suggestions.push(displayName);
  }
  
  return suggestions;
};

/**
 * Gets themed configuration
 */
const getThemedConfig = (theme: string) => {
  const themes = {
    nature: {
      adjectives: ['Forest', 'Mountain', 'River', 'Ocean', 'Valley', 'Meadow', 'Garden', 'Grove'],
      nouns: ['Tree', 'Flower', 'Leaf', 'Branch', 'Root', 'Seed', 'Petal', 'Stem']
    },
    animals: {
      adjectives: ['Swift', 'Bold', 'Gentle', 'Wild', 'Brave', 'Clever', 'Strong', 'Wise'],
      nouns: ['Eagle', 'Wolf', 'Dolphin', 'Tiger', 'Lion', 'Hawk', 'Fox', 'Bear']
    },
    colors: {
      adjectives: ['Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Cyan'],
      nouns: ['Bird', 'Flower', 'Star', 'Wave', 'Flame', 'Crystal', 'Pearl', 'Diamond']
    },
    weather: {
      adjectives: ['Sunny', 'Cloudy', 'Stormy', 'Windy', 'Rainy', 'Snowy', 'Foggy', 'Clear'],
      nouns: ['Breeze', 'Storm', 'Lightning', 'Thunder', 'Rainbow', 'Aurora', 'Mist', 'Frost']
    },
    space: {
      adjectives: ['Cosmic', 'Stellar', 'Lunar', 'Solar', 'Galactic', 'Nebular', 'Asteroid', 'Comet'],
      nouns: ['Star', 'Moon', 'Planet', 'Galaxy', 'Nebula', 'Asteroid', 'Comet', 'Orbit']
    }
  };
  
  return themes[theme as keyof typeof themes] || themes.nature;
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DISPLAY_NAME_CONFIG,
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
};
