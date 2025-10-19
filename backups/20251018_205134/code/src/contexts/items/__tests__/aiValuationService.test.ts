/**
 * AI Valuation Service Tests
 * 
 * Unit tests for AI-powered item valuation, image recognition,
 * and price recommendation functionality.
 */

import {
  generateItemValuation,
  analyzeItemImages,
  searchComparableSales,
  calculateDepreciation,
  analyzeMarketDemand,
  generatePriceRecommendations,
  analyzeSeasonalFactors,
  validateValuationConfidence,
  isValuationExpired,
  refreshValuation,
  AI_VALUATION_CONFIG
} from '../aiValuationService';
import {
  ItemCondition,
  MarketDemand,
  MarketSupply,
  PriceTrend
} from '../items.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockItem = {
  id: 'item_123',
  userId: 'user_123',
  categoryId: 'cat_1',
  title: 'Samsung Refrigerator',
  description: 'Like new Samsung refrigerator',
  priceCredits: 400,
  condition: ItemCondition.GOOD,
  locationLat: 39.7817,
  locationLng: -89.6501,
  locationAddress: 'Springfield, IL',
  status: 'ACTIVE' as const,
  isFeatured: false,
  viewCount: 0,
  cpscChecked: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockValuation = {
  itemId: 'item_123',
  systemValue: 400,
  confidence: 0.85,
  factors: {
    ageYears: 2,
    condition: ItemCondition.GOOD,
    brand: 'Samsung',
    model: 'RF28K9070SG',
    originalRetailPrice: 1200,
    comparableSales: [
      {
        price: 380,
        soldDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        distanceMiles: 5,
        condition: ItemCondition.GOOD,
        brand: 'Samsung',
        model: 'RF28K9070SG',
        source: 'LOCALEX'
      }
    ],
    depreciation: 0.35,
    marketDemand: MarketDemand.MEDIUM,
    localPricing: {
      averagePrice: 400,
      medianPrice: 385,
      priceRange: { min: 300, max: 500 },
      sampleSize: 8,
      lastUpdated: new Date()
    },
    seasonalFactors: {
      currentSeason: 'FALL',
      impact: -0.05,
      reasoning: 'Electronics typically see lower demand in fall'
    }
  },
  recommendations: [
    {
      level: 'LOW' as const,
      price: 350,
      reasoning: 'Quick sale price, below market average',
      confidence: 0.9,
      expectedDaysToSell: 7
    },
    {
      level: 'MEDIUM' as const,
      price: 400,
      reasoning: 'Fair market value based on comparable sales',
      confidence: 0.85,
      expectedDaysToSell: 14
    },
    {
      level: 'HIGH' as const,
      price: 450,
      reasoning: 'Premium pricing for excellent condition',
      confidence: 0.7,
      expectedDaysToSell: 30
    }
  ],
  comparableSales: [],
  marketAnalysis: {
    demandLevel: MarketDemand.MEDIUM,
    supplyLevel: MarketSupply.MEDIUM,
    priceTrend: PriceTrend.STABLE,
    seasonalImpact: -0.05,
    localMarketFactors: [
      'High demand for energy-efficient appliances',
      'Local market has good supply of similar items',
      'Fall season typically reduces electronics demand'
    ]
  },
  generatedAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
};

// ============================================================================
// GENERATE ITEM VALUATION TESTS
// ============================================================================

describe('generateItemValuation', () => {
  it('should generate valuation successfully', async () => {
    const result = await generateItemValuation('item_123');
    
    expect(result).toBeDefined();
    expect(result.itemId).toBe('item_123');
    expect(result.systemValue).toBe(400);
    expect(result.confidence).toBe(0.85);
    expect(result.factors).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.marketAnalysis).toBeDefined();
  });

  it('should handle force refresh', async () => {
    const result = await generateItemValuation('item_123', true);
    
    expect(result).toBeDefined();
    expect(result.itemId).toBe('item_123');
  });

  it('should handle errors gracefully', async () => {
    // Mock console.error to avoid test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // This should not throw but return a mock result
    const result = await generateItemValuation('invalid_item');
    
    expect(result).toBeDefined();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// ANALYZE ITEM IMAGES TESTS
// ============================================================================

describe('analyzeItemImages', () => {
  it('should analyze images successfully', async () => {
    const imageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
    const result = await analyzeItemImages('item_123', imageUrls);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    result.forEach(analysis => {
      expect(analysis.itemId).toBe('item_123');
      expect(analysis.identifiedObjects).toBeDefined();
      expect(analysis.brandRecognition).toBeDefined();
      expect(analysis.conditionAssessment).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  it('should handle empty image array', async () => {
    const result = await analyzeItemImages('item_123', []);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await analyzeItemImages('invalid_item', ['invalid_url']);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// SEARCH COMPARABLE SALES TESTS
// ============================================================================

describe('searchComparableSales', () => {
  it('should search comparable sales successfully', async () => {
    const result = await searchComparableSales(
      'Electronics',
      'Samsung',
      'RF28K9070SG',
      ItemCondition.GOOD,
      39.7817,
      -89.6501,
      50
    );
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    result.forEach(sale => {
      expect(sale.price).toBeGreaterThan(0);
      expect(sale.soldDate).toBeInstanceOf(Date);
      expect(sale.distanceMiles).toBeGreaterThanOrEqual(0);
      expect(sale.condition).toBeDefined();
      expect(sale.brand).toBeDefined();
      expect(sale.source).toBeDefined();
    });
  });

  it('should handle different search parameters', async () => {
    const result = await searchComparableSales(
      'Furniture',
      'IKEA',
      'HEMNES',
      ItemCondition.LIKE_NEW,
      40.7128,
      -74.0060,
      25
    );
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await searchComparableSales(
      'Invalid',
      'Invalid',
      'Invalid',
      ItemCondition.POOR,
      0,
      0,
      -1
    );
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// CALCULATE DEPRECIATION TESTS
// ============================================================================

describe('calculateDepreciation', () => {
  it('should calculate depreciation for electronics', () => {
    const result = calculateDepreciation(2, ItemCondition.GOOD, 'Electronics', 1000);
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('should calculate depreciation for furniture', () => {
    const result = calculateDepreciation(3, ItemCondition.FAIR, 'Furniture', 500);
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('should calculate depreciation for clothing', () => {
    const result = calculateDepreciation(1, ItemCondition.LIKE_NEW, 'Clothing', 100);
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('should handle unknown category', () => {
    const result = calculateDepreciation(2, ItemCondition.GOOD, 'Unknown', 1000);
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('should handle different conditions', () => {
    const newResult = calculateDepreciation(2, ItemCondition.NEW, 'Electronics', 1000);
    const poorResult = calculateDepreciation(2, ItemCondition.POOR, 'Electronics', 1000);
    
    expect(newResult).toBeLessThan(poorResult);
  });

  it('should cap depreciation at 80%', () => {
    const result = calculateDepreciation(20, ItemCondition.POOR, 'Electronics', 1000);
    
    expect(result).toBeLessThanOrEqual(0.8);
  });
});

// ============================================================================
// ANALYZE MARKET DEMAND TESTS
// ============================================================================

describe('analyzeMarketDemand', () => {
  it('should analyze market demand successfully', async () => {
    const result = await analyzeMarketDemand(
      'Electronics',
      'Samsung',
      39.7817,
      -89.6501
    );
    
    expect(result).toBeDefined();
    expect(Object.values(MarketDemand)).toContain(result);
  });

  it('should handle different categories', async () => {
    const electronicsResult = await analyzeMarketDemand('Electronics', 'Samsung', 39.7817, -89.6501);
    const furnitureResult = await analyzeMarketDemand('Furniture', 'IKEA', 39.7817, -89.6501);
    
    expect(electronicsResult).toBeDefined();
    expect(furnitureResult).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await analyzeMarketDemand('Invalid', 'Invalid', 0, 0);
    
    expect(result).toBeDefined();
    expect(Object.values(MarketDemand)).toContain(result);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// GENERATE PRICE RECOMMENDATIONS TESTS
// ============================================================================

describe('generatePriceRecommendations', () => {
  const mockComparableSales = [
    {
      price: 380,
      soldDate: new Date(),
      distanceMiles: 5,
      condition: ItemCondition.GOOD,
      brand: 'Samsung',
      model: 'RF28K9070SG',
      source: 'LOCALEX'
    }
  ];

  it('should generate price recommendations successfully', () => {
    const result = generatePriceRecommendations(
      400,
      mockComparableSales,
      MarketDemand.MEDIUM,
      0.85
    );
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    
    result.forEach(recommendation => {
      expect(recommendation.level).toBeDefined();
      expect(recommendation.price).toBeGreaterThan(0);
      expect(recommendation.reasoning).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.expectedDaysToSell).toBeGreaterThan(0);
    });
  });

  it('should generate different price levels', () => {
    const result = generatePriceRecommendations(
      400,
      mockComparableSales,
      MarketDemand.MEDIUM,
      0.85
    );
    
    const levels = result.map(r => r.level);
    expect(levels).toContain('LOW');
    expect(levels).toContain('MEDIUM');
    expect(levels).toContain('HIGH');
  });

  it('should adjust confidence based on level', () => {
    const result = generatePriceRecommendations(
      400,
      mockComparableSales,
      MarketDemand.MEDIUM,
      0.85
    );
    
    const lowRecommendation = result.find(r => r.level === 'LOW');
    const highRecommendation = result.find(r => r.level === 'HIGH');
    
    expect(lowRecommendation?.confidence).toBeGreaterThan(highRecommendation?.confidence || 0);
  });
});

// ============================================================================
// ANALYZE SEASONAL FACTORS TESTS
// ============================================================================

describe('analyzeSeasonalFactors', () => {
  it('should analyze seasonal factors for spring', () => {
    const springDate = new Date(2024, 3, 15); // April 15th
    const result = analyzeSeasonalFactors('Electronics', springDate);
    
    expect(result).toBeDefined();
    expect(result.currentSeason).toBe('SPRING');
    expect(result.impact).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it('should analyze seasonal factors for summer', () => {
    const summerDate = new Date(2024, 6, 15); // July 15th
    const result = analyzeSeasonalFactors('Clothing', summerDate);
    
    expect(result).toBeDefined();
    expect(result.currentSeason).toBe('SUMMER');
    expect(result.impact).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it('should analyze seasonal factors for fall', () => {
    const fallDate = new Date(2024, 9, 15); // October 15th
    const result = analyzeSeasonalFactors('Electronics', fallDate);
    
    expect(result).toBeDefined();
    expect(result.currentSeason).toBe('FALL');
    expect(result.impact).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it('should analyze seasonal factors for winter', () => {
    const winterDate = new Date(2024, 11, 15); // December 15th
    const result = analyzeSeasonalFactors('Furniture', winterDate);
    
    expect(result).toBeDefined();
    expect(result.currentSeason).toBe('WINTER');
    expect(result.impact).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it('should handle unknown category', () => {
    const result = analyzeSeasonalFactors('Unknown', new Date());
    
    expect(result).toBeDefined();
    expect(result.currentSeason).toBeDefined();
    expect(result.impact).toBe(0);
    expect(result.reasoning).toBeDefined();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('validateValuationConfidence', () => {
  it('should validate high confidence valuation', () => {
    const result = validateValuationConfidence(mockValuation);
    
    expect(result).toBe(true);
  });

  it('should reject low confidence valuation', () => {
    const lowConfidenceValuation = {
      ...mockValuation,
      confidence: 0.5
    };
    
    const result = validateValuationConfidence(lowConfidenceValuation);
    
    expect(result).toBe(false);
  });
});

describe('isValuationExpired', () => {
  it('should detect expired valuation', () => {
    const expiredValuation = {
      ...mockValuation,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    };
    
    const result = isValuationExpired(expiredValuation);
    
    expect(result).toBe(true);
  });

  it('should detect valid valuation', () => {
    const validValuation = {
      ...mockValuation,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
    };
    
    const result = isValuationExpired(validValuation);
    
    expect(result).toBe(false);
  });
});

describe('refreshValuation', () => {
  it('should refresh valuation successfully', async () => {
    const result = await refreshValuation('item_123');
    
    expect(result).toBeDefined();
    expect(result.itemId).toBe('item_123');
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('AI_VALUATION_CONFIG', () => {
  it('should have correct configuration values', () => {
    expect(AI_VALUATION_CONFIG.CONFIDENCE_THRESHOLD).toBe(0.7);
    expect(AI_VALUATION_CONFIG.MAX_COMPARABLE_SALES).toBe(10);
    expect(AI_VALUATION_CONFIG.SEARCH_RADIUS_MILES).toBe(50);
    expect(AI_VALUATION_CONFIG.SEARCH_TIME_DAYS).toBe(90);
    expect(AI_VALUATION_CONFIG.DEPRECIATION_RATES).toBeDefined();
    expect(AI_VALUATION_CONFIG.SEASONAL_FACTORS).toBeDefined();
  });

  it('should have depreciation rates for all categories', () => {
    const rates = AI_VALUATION_CONFIG.DEPRECIATION_RATES;
    
    expect(rates.ELECTRONICS).toBe(0.15);
    expect(rates.FURNITURE).toBe(0.08);
    expect(rates.CLOTHING).toBe(0.20);
    expect(rates.TOOLS).toBe(0.10);
    expect(rates.VEHICLES).toBe(0.12);
    expect(rates.DEFAULT).toBe(0.12);
  });

  it('should have seasonal factors for all seasons', () => {
    const factors = AI_VALUATION_CONFIG.SEASONAL_FACTORS;
    
    expect(factors.SPRING).toBeDefined();
    expect(factors.SUMMER).toBeDefined();
    expect(factors.FALL).toBeDefined();
    expect(factors.WINTER).toBeDefined();
  });
});
