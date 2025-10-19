/**
 * LocalEx Cache Service
 * High-performance caching layer for database queries and API responses
 */

import { cacheRedis, CACHE_TTL, CACHE_KEYS, redisUtils } from '../config/redis';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRatio: number;
}

class CacheService {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRatio: 0,
  };

  /**
   * Generate a cache key from query and parameters
   */
  private generateQueryKey(query: string, params: any[] = []): string {
    const queryHash = crypto
      .createHash('sha256')
      .update(query + JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);
    
    return CACHE_KEYS.QUERY_RESULT(queryHash);
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        console.warn('Cache Redis not connected, skipping cache get');
        return null;
      }

      const data = await cacheRedis.get(key);
      
      if (data) {
        this.stats.hits++;
        this.updateHitRatio();
        return redisUtils.deserialize<T>(data);
      } else {
        this.stats.misses++;
        this.updateHitRatio();
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      this.updateHitRatio();
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        console.warn('Cache Redis not connected, skipping cache set');
        return false;
      }

      const ttl = options.ttl || CACHE_TTL.QUERY_RESULTS;
      const serializedValue = options.serialize !== false ? redisUtils.serialize(value) : value;
      
      await cacheRedis.setex(key, ttl, serializedValue);
      this.stats.sets++;
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        console.warn('Cache Redis not connected, skipping cache delete');
        return false;
      }

      const result = await cacheRedis.del(key);
      this.stats.deletes++;
      
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (!redisUtils.isConnected(cacheRedis) || keys.length === 0) {
        return 0;
      }

      const result = await cacheRedis.del(...keys);
      this.stats.deletes += result;
      
      return result;
    } catch (error) {
      console.error('Cache delete many error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return false;
      }

      const result = await cacheRedis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!redisUtils.isConnected(cacheRedis) || keys.length === 0) {
        return [];
      }

      const values = await cacheRedis.mget(...keys);
      const results: (T | null)[] = [];
      
      for (let i = 0; i < values.length; i++) {
        if (values[i]) {
          this.stats.hits++;
          results[i] = redisUtils.deserialize<T>(values[i]!);
        } else {
          this.stats.misses++;
          results[i] = null;
        }
      }
      
      this.updateHitRatio();
      return results;
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return false;
      }

      const ttl = options.ttl || CACHE_TTL.QUERY_RESULTS;
      const pipeline = cacheRedis.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = options.serialize !== false ? redisUtils.serialize(value) : value;
        pipeline.setex(key, ttl, serializedValue);
      }
      
      await pipeline.exec();
      this.stats.sets += Object.keys(keyValuePairs).length;
      
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Cache database query result
   */
  async cacheQuery<T>(
    query: string,
    params: any[],
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = this.generateQueryKey(query, params);
    
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch from database
    const result = await fetchFn();
    
    // Cache the result
    await this.set(cacheKey, result, options);
    
    return result;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return 0;
      }

      const keys = await cacheRedis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      return await this.deleteMany(keys);
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: string): Promise<number> {
    const patterns = [
      `user:profile:${userId}`,
      `user:balance:${userId}`,
      `session:*`, // This would need more specific session invalidation
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.invalidatePattern(pattern);
    }
    
    return totalDeleted;
  }

  /**
   * Invalidate item-related cache
   */
  async invalidateItem(itemId: string): Promise<number> {
    return await this.invalidatePattern(`item:${itemId}`);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return false;
      }

      await cacheRedis.flushdb();
      this.resetStats();
      
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRatio: 0,
    };
  }

  /**
   * Update hit ratio
   */
  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get Redis memory usage
   */
  async getMemoryUsage(): Promise<number> {
    return await redisUtils.getMemoryUsage(cacheRedis);
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    return await redisUtils.getInfo(cacheRedis);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    memoryUsage: number;
    stats: CacheStats;
  }> {
    const connected = redisUtils.isConnected(cacheRedis);
    const memoryUsage = await this.getMemoryUsage();
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      memoryUsage,
      stats: this.getStats(),
    };
  }

  // Specific cache methods for common use cases

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId: string, profile: any): Promise<boolean> {
    const key = CACHE_KEYS.USER_PROFILE(userId);
    return await this.set(key, profile, { ttl: CACHE_TTL.USER_PROFILES });
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = CACHE_KEYS.USER_PROFILE(userId);
    return await this.get(key);
  }

  /**
   * Cache user balance
   */
  async cacheUserBalance(userId: string, balance: number): Promise<boolean> {
    const key = CACHE_KEYS.USER_BALANCE(userId);
    return await this.set(key, balance, { ttl: CACHE_TTL.QUERY_RESULTS });
  }

  /**
   * Get cached user balance
   */
  async getCachedUserBalance(userId: string): Promise<number | null> {
    const key = CACHE_KEYS.USER_BALANCE(userId);
    return await this.get(key);
  }

  /**
   * Cache API response
   */
  async cacheApiResponse(endpoint: string, params: string, response: any): Promise<boolean> {
    const key = CACHE_KEYS.API_RESPONSE(endpoint, params);
    return await this.set(key, response, { ttl: CACHE_TTL.API_RESPONSES });
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse(endpoint: string, params: string): Promise<any | null> {
    const key = CACHE_KEYS.API_RESPONSE(endpoint, params);
    return await this.get(key);
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
