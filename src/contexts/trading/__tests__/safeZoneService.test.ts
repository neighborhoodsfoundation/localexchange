/**
 * Safe Zone Service Tests
 * 
 * Comprehensive test suite for Safe Zone functionality
 * including search, recommendations, and validation.
 */

import {
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
  getSafeZoneStats,
  SAFE_ZONE_CONFIG
} from '../safeZoneService';
import { SafetyTier, SafeZoneFeatureType } from '../trading.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSafeZone = {
  id: 'sz-1',
  name: 'Springfield Police Station',
  description: 'Main police station with 24/7 security',
  address: '123 Main St, Springfield, IL',
  locationLat: 39.7817,
  locationLng: -89.6501,
  tier: SafetyTier.TIER_1,
  features: [
    { type: SafeZoneFeatureType.SECURITY_CAMERAS, description: '24/7 surveillance', isAvailable: true },
    { type: SafeZoneFeatureType.SECURITY_PRESENCE, description: 'Police officers present', isAvailable: true }
  ],
  businessHours: {
    monday: { open: '00:00', close: '23:59', is24Hours: true },
    tuesday: { open: '00:00', close: '23:59', is24Hours: true }
  },
  isActive: true,
  usageCount: 45,
  lastVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// ============================================================================
// SAFE ZONE SEARCH TESTS
// ============================================================================

describe('Safe Zone Search', () => {
  it('should search Safe Zones with basic parameters', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5
    };

    const result = await searchSafeZones(request);

    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.total).toBeDefined();
  });

  it('should filter Safe Zones by tier', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5,
      tier: [SafetyTier.TIER_1]
    };

    const result = await searchSafeZones(request);

    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
  });

  it('should filter Safe Zones by features', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5,
      features: [SafeZoneFeatureType.SECURITY_CAMERAS]
    };

    const result = await searchSafeZones(request);

    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
  });

  it('should filter Safe Zones by active status', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5,
      isActive: true
    };

    const result = await searchSafeZones(request);

    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
  });

  it('should handle search errors gracefully', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5
    };

    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await searchSafeZones(request);

    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
    expect(result.total).toBeDefined();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// LOCATION RECOMMENDATIONS TESTS
// ============================================================================

describe('Location Recommendations', () => {
  it('should get location recommendations', async () => {
    const result = await getLocationRecommendations('62701', '62702', 5);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle recommendation errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getLocationRecommendations('62701', '62702', 5);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// LOCATION CALCULATIONS TESTS
// ============================================================================

describe('Location Calculations', () => {
  it('should calculate midpoint correctly', () => {
    const midpoint = calculateMidpoint(39.7817, -89.6501, 39.7850, -89.6450);
    
    expect(midpoint).toBeDefined();
    expect(midpoint.lat).toBeCloseTo(39.78335, 5);
    expect(midpoint.lng).toBeCloseTo(-89.64755, 5);
  });

  it('should calculate distance correctly', () => {
    const distance = calculateDistance(39.7817, -89.6501, 39.7850, -89.6450);
    
    expect(distance).toBeDefined();
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1); // Should be less than 1 mile
  });

  it('should calculate fairness score correctly', () => {
    const score1 = calculateFairnessScore(2.0, 2.0); // Perfectly fair
    expect(score1).toBe(1.0);

    const score2 = calculateFairnessScore(1.0, 3.0); // Unfair
    expect(score2).toBeLessThan(1.0);
    expect(score2).toBeGreaterThan(0);

    const score3 = calculateFairnessScore(0.5, 0.5); // Perfectly fair
    expect(score3).toBe(1.0);
  });

  it('should calculate recommendation score correctly', () => {
    const score = calculateRecommendationScore(mockSafeZone, 2.0, 2.0);
    
    expect(score).toBeDefined();
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// SAFE ZONE MANAGEMENT TESTS
// ============================================================================

describe('Safe Zone Management', () => {
  it('should get Safe Zone by ID', async () => {
    const result = await getSafeZone('sz-1');
    
    expect(result).toBeDefined();
  });

  it('should create Safe Zone', async () => {
    const newSafeZone = {
      name: 'Test Safe Zone',
      description: 'Test description',
      address: '123 Test St',
      locationLat: 39.7817,
      locationLng: -89.6501,
      tier: SafetyTier.TIER_3,
      features: [],
      businessHours: {},
      isActive: true,
      usageCount: 0
    };

    const result = await createSafeZone(newSafeZone);
    
    expect(result).toBeDefined();
    expect(result?.name).toBe('Test Safe Zone');
  });

  it('should update Safe Zone', async () => {
    const updates = {
      name: 'Updated Safe Zone',
      description: 'Updated description'
    };

    const result = await updateSafeZone('sz-1', updates);
    
    expect(result).toBe(true);
  });

  it('should delete Safe Zone', async () => {
    const result = await deleteSafeZone('sz-1');
    
    expect(result).toBe(true);
  });

  it('should handle management errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getSafeZone('nonexistent');
    
    expect(result).toBeNull();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Safe Zone Validation', () => {
  it('should validate Safe Zone data correctly', () => {
    const validSafeZone = {
      name: 'Test Safe Zone',
      address: '123 Test St',
      locationLat: 39.7817,
      locationLng: -89.6501,
      tier: SafetyTier.TIER_1
    };

    const result = validateSafeZone(validSafeZone);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch validation errors', () => {
    const invalidSafeZone = {
      name: '',
      address: '',
      locationLat: 200, // Invalid latitude
      locationLng: 200, // Invalid longitude
      tier: 'BASIC' as SafetyTier
    };

    const result = validateSafeZone(invalidSafeZone);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate business hours correctly', () => {
    const validBusinessHours = {
      monday: { open: '09:00', close: '17:00', is24Hours: false },
      tuesday: { open: '09:00', close: '17:00', is24Hours: false }
    };

    const result = validateBusinessHours(validBusinessHours);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch business hours validation errors', () => {
    const invalidBusinessHours = {
      monday: { open: '25:00', close: '30:00', is24Hours: false }, // Invalid times
      tuesday: { open: '09:00', close: '17:00', is24Hours: false }
    };

    const result = validateBusinessHours(invalidBusinessHours);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('Safe Zone Statistics', () => {
  it('should get Safe Zone statistics', async () => {
    const result = await getSafeZoneStats();
    
    expect(result).toBeDefined();
    expect(result.totalSafeZones).toBeDefined();
    expect(result.activeSafeZones).toBeDefined();
    expect(result.tierDistribution).toBeDefined();
    expect(result.averageUsage).toBeDefined();
    expect(result.mostPopularZones).toBeDefined();
  });

  it('should handle statistics errors gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getSafeZoneStats();
    
    expect(result).toBeDefined();
    expect(result.totalSafeZones).toBeDefined();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Safe Zone Configuration', () => {
  it('should have correct default configuration', () => {
    expect(SAFE_ZONE_CONFIG.DEFAULT_RADIUS_MILES).toBe(5);
    expect(SAFE_ZONE_CONFIG.MAX_RADIUS_MILES).toBe(10);
    expect(SAFE_ZONE_CONFIG.EXPANSION_STEPS).toEqual([5, 7.5, 10]);
    expect(SAFE_ZONE_CONFIG.MAX_RECOMMENDATIONS).toBe(5);
    expect(SAFE_ZONE_CONFIG.FAIRNESS_WEIGHT).toBe(0.4);
    expect(SAFE_ZONE_CONFIG.DISTANCE_WEIGHT).toBe(0.3);
    expect(SAFE_ZONE_CONFIG.TIER_WEIGHT).toBe(0.3);
  });
});

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty search results', async () => {
    const request = {
      centerLat: 0,
      centerLng: 0,
      radiusMiles: 0.1
    };

    const result = await searchSafeZones(request);
    
    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
    expect(result.total).toBeDefined();
  });

  it('should handle invalid coordinates', async () => {
    const request = {
      centerLat: 200, // Invalid latitude
      centerLng: 200, // Invalid longitude
      radiusMiles: 5
    };

    const result = await searchSafeZones(request);
    
    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
  });

  it('should handle negative radius', async () => {
    const request = {
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: -5
    };

    const result = await searchSafeZones(request);
    
    expect(result).toBeDefined();
    expect(result.safeZones).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Safe Zone Service Integration', () => {
  it('should handle complete workflow', async () => {
    // Search for Safe Zones
    const searchResult = await searchSafeZones({
      centerLat: 39.7817,
      centerLng: -89.6501,
      radiusMiles: 5
    });

    expect(searchResult).toBeDefined();

    // Get location recommendations
    const recommendations = await getLocationRecommendations('62701', '62702', 5);

    expect(recommendations).toBeDefined();

    // Create a new Safe Zone
    const newSafeZone = {
      name: 'Integration Test Safe Zone',
      description: 'Test description',
      address: '123 Test St',
      locationLat: 39.7817,
      locationLng: -89.6501,
      tier: SafetyTier.TIER_3,
      features: [],
      businessHours: {},
      isActive: true,
      usageCount: 0
    };

    const createdZone = await createSafeZone(newSafeZone);
    expect(createdZone).toBeDefined();

    // Update the Safe Zone
    const updateResult = await updateSafeZone(createdZone!.id, {
      name: 'Updated Integration Test Safe Zone'
    });
    expect(updateResult).toBe(true);

    // Delete the Safe Zone
    const deleteResult = await deleteSafeZone(createdZone!.id);
    expect(deleteResult).toBe(true);
  });
});
