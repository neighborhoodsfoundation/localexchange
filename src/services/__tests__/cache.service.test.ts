/**
 * Cache Service Unit Tests
 * Tests for high-performance caching layer with Redis
 */

// Mock Redis before importing service
jest.mock('../../config/redis', () => ({
  cacheRedis: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    mget: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
    pipeline: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  },
  CACHE_TTL: {
    QUERY_RESULTS: 300,
    USER_PROFILES: 3600,
    API_RESPONSES: 600,
  },
  CACHE_KEYS: {
    QUERY_RESULT: (hash: string) => `query:${hash}`,
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    USER_BALANCE: (userId: string) => `user:balance:${userId}`,
    API_RESPONSE: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
  },
  redisUtils: {
    isConnected: jest.fn().mockReturnValue(true),
    serialize: jest.fn((data) => JSON.stringify(data)),
    deserialize: jest.fn((data) => JSON.parse(data)),
    getMemoryUsage: jest.fn().mockResolvedValue(1024000),
    getInfo: jest.fn().mockResolvedValue({ redis_version: '7.0' }),
  },
}));

import { cacheService } from '../cache.service';
import { cacheRedis, redisUtils } from '../../config/redis';

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.resetStats();
  });

  describe('get', () => {
    it('should return cached data when it exists', async () => {
      // Arrange
      const key = 'test-key';
      const cachedValue = { data: 'test-value' };
      (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedValue));

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(cacheRedis.get).toHaveBeenCalledWith(key);
      expect(redisUtils.deserialize).toHaveBeenCalled();
    });

    it('should return null when data does not exist', async () => {
      // Arrange
      (cacheRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await cacheService.get('non-existent-key');

      // Assert
      expect(result).toBeNull();
    });

    it('should track cache hits', async () => {
      // Arrange
      (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify({ data: 'value' }));

      // Act
      await cacheService.get('test-key');
      const stats = cacheService.getStats();

      // Assert
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', async () => {
      // Arrange
      (cacheRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      await cacheService.get('test-key');
      const stats = cacheService.getStats();

      // Assert
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it('should return null when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.get('test-key');

      // Assert
      expect(result).toBeNull();
      expect(cacheRedis.get).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (cacheRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await cacheService.get('test-key');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set data in cache with default TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };

      // Act
      const result = await cacheService.set(key, value);

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.setex).toHaveBeenCalledWith(
        key,
        300, // default TTL
        JSON.stringify(value)
      );
    });

    it('should set data with custom TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 600;

      // Act
      const result = await cacheService.set(key, value, { ttl });

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );
    });

    it('should track cache sets', async () => {
      // Act
      await cacheService.set('test-key', { data: 'value' });
      const stats = cacheService.getStats();

      // Assert
      expect(stats.sets).toBe(1);
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.set('test-key', { data: 'value' });

      // Assert
      expect(result).toBe(false);
      expect(cacheRedis.setex).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (cacheRedis.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await cacheService.set('test-key', { data: 'value' });

      // Assert
      expect(result).toBe(false);
    });

    it('should handle raw string values when serialize is false', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'raw-string';

      // Act
      await cacheService.set(key, value, { serialize: false });

      // Assert
      expect(cacheRedis.setex).toHaveBeenCalledWith(
        key,
        expect.any(Number),
        value // Not serialized
      );
    });
  });

  describe('delete', () => {
    it('should delete data from cache', async () => {
      // Arrange
      (cacheRedis.del as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await cacheService.delete('test-key');

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should track cache deletes', async () => {
      // Arrange
      (cacheRedis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await cacheService.delete('test-key');
      const stats = cacheService.getStats();

      // Assert
      expect(stats.deletes).toBe(1);
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      (cacheRedis.del as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await cacheService.delete('non-existent-key');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.delete('test-key');

      // Assert
      expect(result).toBe(false);
      expect(cacheRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple keys', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      (cacheRedis.del as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await cacheService.deleteMany(keys);

      // Assert
      expect(result).toBe(3);
      expect(cacheRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should return 0 for empty array', async () => {
      // Act
      const result = await cacheService.deleteMany([]);

      // Assert
      expect(result).toBe(0);
      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it('should return 0 when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.deleteMany(['key1', 'key2']);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      // Arrange
      (cacheRedis.exists as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await cacheService.exists('test-key');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      (cacheRedis.exists as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await cacheService.exists('non-existent-key');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.exists('test-key');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('mget', () => {
    it('should get multiple values', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      const values = [
        JSON.stringify({ data: 'value1' }),
        JSON.stringify({ data: 'value2' }),
        null,
      ];
      (cacheRedis.mget as jest.Mock).mockResolvedValue(values);

      // Act
      const result = await cacheService.mget(keys);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ data: 'value1' });
      expect(result[1]).toEqual({ data: 'value2' });
      expect(result[2]).toBeNull();
    });

    it('should track hits and misses for multiple gets', async () => {
      // Arrange
      const keys = ['key1', 'key2'];
      const values = [JSON.stringify({ data: 'value1' }), null];
      (cacheRedis.mget as jest.Mock).mockResolvedValue(values);

      // Act
      await cacheService.mget(keys);
      const stats = cacheService.getStats();

      // Assert
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should return empty array when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await cacheService.mget(['key1', 'key2']);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mset', () => {
    it('should set multiple values', async () => {
      // Arrange
      const keyValuePairs = {
        key1: { data: 'value1' },
        key2: { data: 'value2' },
      };

      // Act
      const result = await cacheService.mset(keyValuePairs);

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.pipeline).toHaveBeenCalled();
    });

    it('should track multiple sets', async () => {
      // Arrange
      const keyValuePairs = {
        key1: { data: 'value1' },
        key2: { data: 'value2' },
      };

      // Act
      await cacheService.mset(keyValuePairs);
      const stats = cacheService.getStats();

      // Assert
      expect(stats.sets).toBe(2);
    });
  });

  describe('cacheQuery', () => {
    it('should return cached result if available', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const params = [1];
      const cachedResult = { id: 1, name: 'Test' };
      (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedResult));

      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'Different' });

      // Act
      const result = await cacheService.cacheQuery(query, params, fetchFn);

      // Assert
      expect(result).toEqual(cachedResult);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache result if not in cache', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const params = [1];
      const fetchedResult = { id: 1, name: 'Test' };
      (cacheRedis.get as jest.Mock).mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(fetchedResult);

      // Act
      const result = await cacheService.cacheQuery(query, params, fetchFn);

      // Assert
      expect(result).toEqual(fetchedResult);
      expect(fetchFn).toHaveBeenCalled();
      expect(cacheRedis.setex).toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching pattern', async () => {
      // Arrange
      const pattern = 'user:*';
      const matchingKeys = ['user:1', 'user:2', 'user:3'];
      (cacheRedis.keys as jest.Mock).mockResolvedValue(matchingKeys);
      (cacheRedis.del as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await cacheService.invalidatePattern(pattern);

      // Assert
      expect(result).toBe(3);
      expect(cacheRedis.keys).toHaveBeenCalledWith(pattern);
      expect(cacheRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });

    it('should return 0 when no keys match', async () => {
      // Arrange
      (cacheRedis.keys as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await cacheService.invalidatePattern('no-match:*');

      // Assert
      expect(result).toBe(0);
      expect(cacheRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear all cache', async () => {
      // Arrange
      cacheService.getStats().hits = 10;

      // Act
      const result = await cacheService.clearAll();

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.flushdb).toHaveBeenCalled();
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      // Act
      const stats = cacheService.getStats();

      // Assert
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('hitRatio');
    });

    it('should calculate hit ratio correctly', async () => {
      // Arrange
      (cacheRedis.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ data: 'value' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ data: 'value' }));

      // Act
      await cacheService.get('key1'); // hit
      await cacheService.get('key2'); // miss
      await cacheService.get('key3'); // hit
      const stats = cacheService.getStats();

      // Assert
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRatio).toBeCloseTo(0.666, 2);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(true);

      // Act
      const health = await cacheService.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('stats');
    });

    it('should return unhealthy status when not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const health = await cacheService.healthCheck();

      // Assert
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
    });
  });

  describe('Specific cache methods', () => {
    describe('cacheUserProfile / getCachedUserProfile', () => {
      it('should cache and retrieve user profile', async () => {
        // Arrange
        const userId = 'user-123';
        const profile = { id: userId, name: 'Test User' };
        (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(profile));

        // Act
        await cacheService.cacheUserProfile(userId, profile);
        const cached = await cacheService.getCachedUserProfile(userId);

        // Assert
        expect(cached).toEqual(profile);
        expect(cacheRedis.setex).toHaveBeenCalled();
      });
    });

    describe('cacheUserBalance / getCachedUserBalance', () => {
      it('should cache and retrieve user balance', async () => {
        // Arrange
        const userId = 'user-123';
        const balance = 1000;
        (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(balance));

        // Act
        await cacheService.cacheUserBalance(userId, balance);
        const cached = await cacheService.getCachedUserBalance(userId);

        // Assert
        expect(cached).toBe(balance);
      });
    });

    describe('cacheApiResponse / getCachedApiResponse', () => {
      it('should cache and retrieve API response', async () => {
        // Arrange
        const endpoint = '/api/users';
        const params = '?page=1';
        const response = { users: [] };
        (cacheRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(response));

        // Act
        await cacheService.cacheApiResponse(endpoint, params, response);
        const cached = await cacheService.getCachedApiResponse(endpoint, params);

        // Assert
        expect(cached).toEqual(response);
      });
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate user-related cache', async () => {
      // Arrange
      (cacheRedis.keys as jest.Mock).mockResolvedValue(['user:profile:123', 'user:balance:123']);
      (cacheRedis.del as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await cacheService.invalidateUser('123');

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(cacheRedis.keys).toHaveBeenCalled();
    });
  });

  describe('invalidateItem', () => {
    it('should invalidate item-related cache', async () => {
      // Arrange
      (cacheRedis.keys as jest.Mock).mockResolvedValue(['item:123']);
      (cacheRedis.del as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await cacheService.invalidateItem('123');

      // Assert
      expect(result).toBe(1);
    });
  });
});

/**
 * Test Coverage Summary:
 * - Basic get/set/delete operations ✅
 * - Hit/miss tracking ✅
 * - Multiple key operations (mget/mset) ✅
 * - Query caching ✅
 * - Pattern-based invalidation ✅
 * - User/item specific cache operations ✅
 * - Statistics tracking ✅
 * - Health check ✅
 * - Redis connection handling ✅
 * - Error handling ✅
 * 
 * Target Coverage: 80%+
 * Critical Logic: Cache hit/miss tracking, invalidation patterns
 */

