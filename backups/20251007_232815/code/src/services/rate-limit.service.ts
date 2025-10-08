/**
 * LocalEx Rate Limiting Service
 * Sliding window rate limiting with Redis backend
 */

import { cacheRedis, RATE_LIMITS, redisUtils } from '../config/redis';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  window: number;  // Time window in seconds
  max: number;     // Maximum requests per window
}

class RateLimitService {
  private defaultConfigs = RATE_LIMITS;

  /**
   * Generate rate limit key
   */
  private generateKey(identifier: string, type: string): string {
    const now = Date.now();
    const window = this.defaultConfigs[type as keyof typeof RATE_LIMITS]?.window || 60;
    const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
    
    return `rate:${type}:${identifier}:${windowStart}`;
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkRateLimit(
    identifier: string,
    type: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        console.warn('Rate limit Redis not connected, allowing request');
        return {
          allowed: true,
          limit: config?.max || 100,
          remaining: config?.max || 100,
          resetTime: Date.now() + (config?.window || 60) * 1000,
        };
      }

      const rateLimitConfig = config || this.defaultConfigs[type as keyof typeof RATE_LIMITS];
      
      if (!rateLimitConfig) {
        throw new Error(`Unknown rate limit type: ${type}`);
      }

      const { window, max } = rateLimitConfig;
      const now = Date.now();
      const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
      const windowEnd = windowStart + (window * 1000);
      
      // Generate keys for current and previous windows
      const currentKey = `rate:${type}:${identifier}:${windowStart}`;
      const previousKey = `rate:${type}:${identifier}:${windowStart - (window * 1000)}`;
      
      // Use Redis pipeline for atomic operations
      const pipeline = cacheRedis.pipeline();
      
      // Increment current window
      pipeline.incr(currentKey);
      pipeline.expire(currentKey, window * 2); // Keep for 2 windows
      
      // Get previous window count
      pipeline.get(previousKey);
      
      const results = await pipeline.exec();
      
      if (!results || results.length < 3) {
        throw new Error('Pipeline execution failed');
      }

      const currentCount = results[0][1] as number;
      const previousCount = results[2][1] ? parseInt(results[2][1] as string) : 0;
      
      // Calculate sliding window count
      const timeInCurrentWindow = (now - windowStart) / (window * 1000);
      const slidingWindowCount = Math.floor(
        previousCount * (1 - timeInCurrentWindow) + currentCount
      );
      
      const allowed = slidingWindowCount <= max;
      const remaining = Math.max(0, max - slidingWindowCount);
      const resetTime = windowEnd;
      
      let retryAfter: number | undefined;
      if (!allowed) {
        retryAfter = Math.ceil((windowEnd - now) / 1000);
      }
      
      return {
        allowed,
        limit: max,
        remaining,
        resetTime,
        retryAfter,
      };
      
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: config?.max || 100,
        remaining: config?.max || 100,
        resetTime: Date.now() + (config?.window || 60) * 1000,
      };
    }
  }

  /**
   * Check API request rate limit
   */
  async checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, 'API_REQUESTS');
  }

  /**
   * Check login attempt rate limit
   */
  async checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, 'LOGIN_ATTEMPTS');
  }

  /**
   * Check registration rate limit
   */
  async checkRegistrationRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, 'REGISTRATION');
  }

  /**
   * Check password reset rate limit
   */
  async checkPasswordResetRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, 'PASSWORD_RESET');
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string, type: string): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return false;
      }

      const now = Date.now();
      const window = this.defaultConfigs[type as keyof typeof RATE_LIMITS]?.window || 60;
      const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
      
      const currentKey = `rate:${type}:${identifier}:${windowStart}`;
      const previousKey = `rate:${type}:${identifier}:${windowStart - (window * 1000)}`;
      
      await cacheRedis.del(currentKey, previousKey);
      
      return true;
    } catch (error) {
      console.error('Reset rate limit error:', error);
      return false;
    }
  }

  /**
   * Get rate limit status for identifier
   */
  async getRateLimitStatus(
    identifier: string,
    type: string
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  } | null> {
    try {
      if (!redisUtils.isConnected(cacheRedis)) {
        return null;
      }

      const rateLimitConfig = this.defaultConfigs[type as keyof typeof RATE_LIMITS];
      if (!rateLimitConfig) {
        return null;
      }

      const { window, max } = rateLimitConfig;
      const now = Date.now();
      const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
      const windowEnd = windowStart + (window * 1000);
      
      const currentKey = `rate:${type}:${identifier}:${windowStart}`;
      const previousKey = `rate:${type}:${identifier}:${windowStart - (window * 1000)}`;
      
      const pipeline = cacheRedis.pipeline();
      pipeline.get(currentKey);
      pipeline.get(previousKey);
      
      const results = await pipeline.exec();
      
      if (!results || results.length < 2) {
        return null;
      }

      const currentCount = results[0][1] ? parseInt(results[0][1] as string) : 0;
      const previousCount = results[1][1] ? parseInt(results[1][1] as string) : 0;
      
      // Calculate sliding window count
      const timeInCurrentWindow = (now - windowStart) / (window * 1000);
      const slidingWindowCount = Math.floor(
        previousCount * (1 - timeInCurrentWindow) + currentCount
      );
      
      return {
        current: slidingWindowCount,
        limit: max,
        remaining: Math.max(0, max - slidingWindowCount),
        resetTime: windowEnd,
      };
      
    } catch (error) {
      console.error('Get rate limit status error:', error);
      return null;
    }
  }

  /**
   * Middleware function for Express.js
   */
  createMiddleware(type: string, config?: RateLimitConfig) {
    return async (req: any, res: any, next: any) => {
      try {
        // Extract identifier (IP address or user ID)
        const identifier = req.user?.id || req.ip || 'anonymous';
        
        const result = await this.checkRateLimit(identifier, type, config);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        });
        
        if (!result.allowed) {
          if (result.retryAfter) {
            res.set('Retry-After', result.retryAfter.toString());
          }
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
          });
        }
        
        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        next(); // Fail open
      }
    };
  }

  /**
   * Get all rate limit types
   */
  getRateLimitTypes(): string[] {
    return Object.keys(this.defaultConfigs);
  }

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig(type: string): RateLimitConfig | null {
    return this.defaultConfigs[type as keyof typeof RATE_LIMITS] || null;
  }

  /**
   * Update rate limit configuration
   */
  updateRateLimitConfig(type: string, config: RateLimitConfig): void {
    (this.defaultConfigs as any)[type] = config;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    types: string[];
  }> {
    const connected = redisUtils.isConnected(cacheRedis);
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      types: this.getRateLimitTypes(),
    };
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
export default rateLimitService;
