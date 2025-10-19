/**
 * Safe Zone Service
 * 
 * Handles Safe Zone management, location recommendations,
 * and meetup coordination for the LocalEx platform.
 */

import { 
  SafeZone, 
  SafetyTier, 
  SafeZoneFeatureType,
  LocationRecommendation,
  SafeZoneSearchRequest,
  SafeZoneSearchResponse,
  BusinessHours
} from './trading.types';

// ============================================================================
// SAFE ZONE CONFIGURATION
// ============================================================================

export const SAFE_ZONE_CONFIG = {
  DEFAULT_RADIUS_MILES: 5,
  MAX_RADIUS_MILES: 10,
  EXPANSION_STEPS: [5, 7.5, 10], // miles
  MAX_RECOMMENDATIONS: 5,
  FAIRNESS_WEIGHT: 0.4, // Weight for fairness in scoring
  DISTANCE_WEIGHT: 0.3, // Weight for distance in scoring
  TIER_WEIGHT: 0.3 // Weight for safety tier in scoring
};

// ============================================================================
// SAFE ZONE SEARCH
// ============================================================================

/**
 * Searches for Safe Zones within a specified radius
 */
export const searchSafeZones = async (request: SafeZoneSearchRequest): Promise<SafeZoneSearchResponse> => {
  try {
    const { centerLat: _centerLat, centerLng: _centerLng, radiusMiles: _radiusMiles, tier, features, isActive } = request;
    
    // TODO: Implement actual Safe Zone search with PostGIS
    // const query = `
    //   SELECT *, 
    //     ST_Distance(location, ST_MakePoint($1, $2)::geography) / 1609.34 as distance_miles
    //   FROM safe_zones
    //   WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
    //   AND is_active = $4
    //   ORDER BY tier ASC, distance_miles ASC
    // `;
    
    // Mock implementation for now
    const mockSafeZones: SafeZone[] = [
      {
        id: 'sz-1',
        name: 'Springfield Police Station',
        description: 'Main police station with 24/7 security',
        address: '123 Main St, Springfield, IL',
        locationLat: 39.7817,
        locationLng: -89.6501,
        tier: SafetyTier.TIER_1,
        features: [
          { type: SafeZoneFeatureType.SECURITY_CAMERAS, description: '24/7 surveillance', isAvailable: true },
          { type: SafeZoneFeatureType.SECURITY_PRESENCE, description: 'Police officers present', isAvailable: true },
          { type: SafeZoneFeatureType.WELL_LIT, description: 'Well-lit parking area', isAvailable: true }
        ],
        businessHours: {
          monday: { open: '00:00', close: '23:59', is24Hours: true },
          tuesday: { open: '00:00', close: '23:59', is24Hours: true },
          wednesday: { open: '00:00', close: '23:59', is24Hours: true },
          thursday: { open: '00:00', close: '23:59', is24Hours: true },
          friday: { open: '00:00', close: '23:59', is24Hours: true },
          saturday: { open: '00:00', close: '23:59', is24Hours: true },
          sunday: { open: '00:00', close: '23:59', is24Hours: true }
        },
        isActive: true,
        usageCount: 45,
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sz-2',
        name: 'Springfield Mall',
        description: 'Well-lit shopping center with security',
        address: '456 Commerce Blvd, Springfield, IL',
        locationLat: 39.7850,
        locationLng: -89.6450,
        tier: SafetyTier.TIER_3,
        features: [
          { type: SafeZoneFeatureType.SECURITY_CAMERAS, description: 'Mall security cameras', isAvailable: true },
          { type: SafeZoneFeatureType.WELL_LIT, description: 'Well-lit parking lot', isAvailable: true },
          { type: SafeZoneFeatureType.PARKING_AVAILABLE, description: 'Ample parking', isAvailable: true }
        ],
        businessHours: {
          monday: { open: '10:00', close: '21:00', is24Hours: false },
          tuesday: { open: '10:00', close: '21:00', is24Hours: false },
          wednesday: { open: '10:00', close: '21:00', is24Hours: false },
          thursday: { open: '10:00', close: '21:00', is24Hours: false },
          friday: { open: '10:00', close: '22:00', is24Hours: false },
          saturday: { open: '10:00', close: '22:00', is24Hours: false },
          sunday: { open: '11:00', close: '19:00', is24Hours: false }
        },
        isActive: true,
        usageCount: 23,
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Filter by tier if specified
    const filteredZones = tier && tier.length > 0 
      ? mockSafeZones.filter(zone => tier.includes(zone.tier))
      : mockSafeZones;

    // Filter by features if specified
    const featureFilteredZones = features && features.length > 0
      ? filteredZones.filter(zone => 
          features.every(feature => 
            zone.features.some(zoneFeature => zoneFeature.type === feature)
          )
        )
      : filteredZones;

    // Filter by active status
    const activeFilteredZones = isActive !== undefined
      ? featureFilteredZones.filter(zone => zone.isActive === isActive)
      : featureFilteredZones;

    return {
      safeZones: activeFilteredZones,
      recommendations: [],
      total: activeFilteredZones.length
    };
  } catch (error) {
    console.error('Error searching Safe Zones:', error);
    return {
      safeZones: [],
      recommendations: [],
      total: 0
    };
  }
};

/**
 * Gets location recommendations for a trade
 */
export const getLocationRecommendations = async (
  _buyerZip: string,
  _sellerZip: string,
  _maxRadiusMiles: number = SAFE_ZONE_CONFIG.DEFAULT_RADIUS_MILES
): Promise<LocationRecommendation[]> => {
  try {
    // TODO: Implement actual geocoding and midpoint calculation
    // const buyerCoords = await geocodeZipCode(buyerZip);
    // const sellerCoords = await geocodeZipCode(sellerZip);
    // const midpoint = calculateMidpoint(buyerCoords, sellerCoords);
    
    // Mock implementation for now
    const mockRecommendations: LocationRecommendation[] = [
      {
        safeZone: {
          id: 'sz-1',
          name: 'Springfield Police Station',
          description: 'Main police station with 24/7 security',
          address: '123 Main St, Springfield, IL',
          locationLat: 39.7817,
          locationLng: -89.6501,
          tier: SafetyTier.TIER_1,
          features: [],
          isActive: true,
          usageCount: 45,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        distanceFromBuyer: 2.1,
        distanceFromSeller: 1.8,
        travelTimeBuyer: 5,
        travelTimeSeller: 4,
        fairnessScore: 0.95,
        isRecommended: true
      },
      {
        safeZone: {
          id: 'sz-2',
          name: 'Springfield Mall',
          description: 'Well-lit shopping center with security',
          address: '456 Commerce Blvd, Springfield, IL',
          locationLat: 39.7850,
          locationLng: -89.6450,
          tier: SafetyTier.TIER_3,
          features: [],
          isActive: true,
          usageCount: 23,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        distanceFromBuyer: 3.2,
        distanceFromSeller: 2.1,
        travelTimeBuyer: 8,
        travelTimeSeller: 6,
        fairnessScore: 0.78,
        isRecommended: true
      }
    ];

    return mockRecommendations;
  } catch (error) {
    console.error('Error getting location recommendations:', error);
    return [];
  }
};

// ============================================================================
// LOCATION CALCULATIONS
// ============================================================================

/**
 * Calculates the midpoint between two coordinates
 */
export const calculateMidpoint = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): { lat: number; lng: number } => {
  const lat = (lat1 + lat2) / 2;
  const lng = (lng1 + lng2) / 2;
  return { lat, lng };
};

/**
 * Calculates the distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates the fairness score for a location
 */
export const calculateFairnessScore = (
  distanceFromBuyer: number,
  distanceFromSeller: number
): number => {
  const totalDistance = distanceFromBuyer + distanceFromSeller;
  const buyerRatio = distanceFromBuyer / totalDistance;
  const sellerRatio = distanceFromSeller / totalDistance;
  
  // Fairness score: 1.0 = perfectly fair, 0.0 = completely unfair
  const fairness = 1 - Math.abs(buyerRatio - sellerRatio);
  return Math.max(0, Math.min(1, fairness));
};

/**
 * Calculates the overall recommendation score
 */
export const calculateRecommendationScore = (
  safeZone: SafeZone,
  distanceFromBuyer: number,
  distanceFromSeller: number
): number => {
  const fairnessScore = calculateFairnessScore(distanceFromBuyer, distanceFromSeller);
  const tierScore = getTierScore(safeZone.tier);
  const distanceScore = calculateDistanceScore(distanceFromBuyer, distanceFromSeller);
  
  return (
    fairnessScore * SAFE_ZONE_CONFIG.FAIRNESS_WEIGHT +
    tierScore * SAFE_ZONE_CONFIG.TIER_WEIGHT +
    distanceScore * SAFE_ZONE_CONFIG.DISTANCE_WEIGHT
  );
};

/**
 * Gets the tier score for ranking
 */
const getTierScore = (tier: SafetyTier): number => {
  switch (tier) {
    case SafetyTier.TIER_1: return 1.0;
    case SafetyTier.TIER_2: return 0.8;
    case SafetyTier.TIER_3: return 0.6;
    case SafetyTier.TIER_4: return 0.4;
    default: return 0.0;
  }
};

/**
 * Calculates the distance score for ranking
 */
const calculateDistanceScore = (distanceFromBuyer: number, distanceFromSeller: number): number => {
  const maxDistance = SAFE_ZONE_CONFIG.MAX_RADIUS_MILES;
  const avgDistance = (distanceFromBuyer + distanceFromSeller) / 2;
  return Math.max(0, 1 - (avgDistance / maxDistance));
};

// ============================================================================
// SAFE ZONE MANAGEMENT
// ============================================================================

/**
 * Gets a Safe Zone by ID
 */
export const getSafeZone = async (_safeZoneId: string): Promise<SafeZone | null> => {
  try {
    // TODO: Implement actual Safe Zone retrieval
    // const response = await database.query('SELECT * FROM safe_zones WHERE id = $1', [safeZoneId]);
    
    // Mock implementation for now
    return null;
  } catch (error) {
    console.error('Error getting Safe Zone:', error);
    return null;
  }
};

/**
 * Creates a new Safe Zone
 */
export const createSafeZone = async (safeZone: Omit<SafeZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<SafeZone | null> => {
  try {
    // TODO: Implement actual Safe Zone creation
    // const response = await database.query(`
    //   INSERT INTO safe_zones (name, description, address, location_lat, location_lng, tier, features, business_hours, is_active)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    //   RETURNING *
    // `, [safeZone.name, safeZone.description, safeZone.address, safeZone.locationLat, safeZone.locationLng, safeZone.tier, safeZone.features, safeZone.businessHours, safeZone.isActive]);
    
    // Mock implementation for now
    const newSafeZone: SafeZone = {
      ...safeZone,
      id: 'sz-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return newSafeZone;
  } catch (error) {
    console.error('Error creating Safe Zone:', error);
    return null;
  }
};

/**
 * Updates a Safe Zone
 */
export const updateSafeZone = async (_safeZoneId: string, _updates: Partial<SafeZone>): Promise<boolean> => {
  try {
    // TODO: Implement actual Safe Zone update
    // const response = await database.query(`
    //   UPDATE safe_zones 
    //   SET name = $1, description = $2, address = $3, location_lat = $4, location_lng = $5, tier = $6, features = $7, business_hours = $8, is_active = $9, updated_at = NOW()
    //   WHERE id = $10
    // `, [updates.name, updates.description, updates.address, updates.locationLat, updates.locationLng, updates.tier, updates.features, updates.businessHours, updates.isActive, safeZoneId]);
    
    // Mock implementation for now
    return true;
  } catch (error) {
    console.error('Error updating Safe Zone:', error);
    return false;
  }
};

/**
 * Deletes a Safe Zone
 */
export const deleteSafeZone = async (_safeZoneId: string): Promise<boolean> => {
  try {
    // TODO: Implement actual Safe Zone deletion
    // const response = await database.query('DELETE FROM safe_zones WHERE id = $1', [safeZoneId]);
    
    // Mock implementation for now
    return true;
  } catch (error) {
    console.error('Error deleting Safe Zone:', error);
    return false;
  }
};

// ============================================================================
// SAFE ZONE VALIDATION
// ============================================================================

/**
 * Validates Safe Zone data
 */
export const validateSafeZone = (safeZone: Partial<SafeZone>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!safeZone.name || safeZone.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!safeZone.address || safeZone.address.trim().length === 0) {
    errors.push('Address is required');
  }
  
  if (safeZone.locationLat === undefined || safeZone.locationLat === null) {
    errors.push('Latitude is required');
  } else if (safeZone.locationLat < -90 || safeZone.locationLat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }
  
  if (safeZone.locationLng === undefined || safeZone.locationLng === null) {
    errors.push('Longitude is required');
  } else if (safeZone.locationLng < -180 || safeZone.locationLng > 180) {
    errors.push('Longitude must be between -180 and 180');
  }
  
  if (!safeZone.tier) {
    errors.push('Safety tier is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates business hours
 */
export const validateBusinessHours = (businessHours: BusinessHours): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const dayHours = businessHours[day as keyof BusinessHours];
    if (dayHours) {
      if (!dayHours.is24Hours) {
        if (!dayHours.open || !dayHours.close) {
          errors.push(`${day} must have open and close times or be marked as 24 hours`);
        } else {
          const openTime = dayHours.open.split(':').map(Number);
          const closeTime = dayHours.close.split(':').map(Number);
          
          if (openTime[0] < 0 || openTime[0] > 23 || openTime[1] < 0 || openTime[1] > 59) {
            errors.push(`${day} open time is invalid`);
          }
          
          if (closeTime[0] < 0 || closeTime[0] > 23 || closeTime[1] < 0 || closeTime[1] > 59) {
            errors.push(`${day} close time is invalid`);
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// SAFE ZONE STATISTICS
// ============================================================================

/**
 * Gets Safe Zone usage statistics
 */
export const getSafeZoneStats = async (): Promise<{
  totalSafeZones: number;
  activeSafeZones: number;
  tierDistribution: Record<SafetyTier, number>;
  averageUsage: number;
  mostPopularZones: Array<{ id: string; name: string; usageCount: number }>;
}> => {
  try {
    // TODO: Implement actual statistics query
    // const response = await database.query(`
    //   SELECT 
    //     COUNT(*) as total_safe_zones,
    //     COUNT(CASE WHEN is_active = true THEN 1 END) as active_safe_zones,
    //     tier,
    //     AVG(usage_count) as average_usage,
    //     name,
    //     usage_count
    //   FROM safe_zones
    //   GROUP BY tier, name, usage_count
    // `);
    
    // Mock implementation for now
    return {
      totalSafeZones: 25,
      activeSafeZones: 23,
      tierDistribution: {
        [SafetyTier.TIER_1]: 5,
        [SafetyTier.TIER_2]: 8,
        [SafetyTier.TIER_3]: 10,
        [SafetyTier.TIER_4]: 2
      },
      averageUsage: 15.2,
      mostPopularZones: [
        { id: 'sz-1', name: 'Springfield Police Station', usageCount: 45 },
        { id: 'sz-2', name: 'Springfield Mall', usageCount: 23 }
      ]
    };
  } catch (error) {
    console.error('Error getting Safe Zone statistics:', error);
    return {
      totalSafeZones: 0,
      activeSafeZones: 0,
      tierDistribution: {} as Record<SafetyTier, number>,
      averageUsage: 0,
      mostPopularZones: []
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// Note: All functions are already exported above, no need to re-export
