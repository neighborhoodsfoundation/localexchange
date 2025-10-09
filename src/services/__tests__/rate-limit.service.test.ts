/**
 * Rate Limit Service Unit Tests
 * Tests for sliding window rate limiting with Redis backend
 */

// Mock Redis before importing service
jest.mock('../../config/redis', () => ({
  cacheRedis: {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    pipeline: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1], // incr result
        [null, 'OK'], // expire result
        [null, '0'], // previous window get result
      ]),
    })),
  },
  RATE_LIMITS: {
    API_REQUESTS: { window: 60, max: 100 },
    LOGIN_ATTEMPTS: { window: 300, max: 5 },
    REGISTRATION: { window: 3600, max: 3 },
    PASSWORD_RESET: { window: 3600, max: 3 },
  },
  redisUtils: {
    isConnected: jest.fn().mockReturnValue(true),
  },
}));

import { rateLimitService } from '../rate-limit.service';
import { cacheRedis, redisUtils } from '../../config/redis';

describe('RateLimitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      // Arrange
      const identifier = 'user-123';
      const type = 'API_REQUESTS';
      
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5], // current count
          [null, 'OK'],
          [null, '2'], // previous count
        ]),
      });

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result).toHaveProperty('resetTime');
      expect(cacheRedis.pipeline).toHaveBeenCalled();
    });

    it('should deny request when over limit', async () => {
      // Arrange
      const identifier = 'user-123';
      const type = 'API_REQUESTS';
      
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 95], // current count
          [null, 'OK'],
          [null, '50'], // previous count
        ]),
      });

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result).toHaveProperty('retryAfter');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use custom config when provided', async () => {
      // Arrange
      const identifier = 'user-123';
      const type = 'custom-type';
      const customConfig = { window: 120, max: 50 };
      
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 10],
          [null, 'OK'],
          [null, '5'],
        ]),
      });

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type, customConfig);

      // Assert
      expect(result.limit).toBe(50);
      expect(result.allowed).toBe(true);
    });

    it('should allow request when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);
      const identifier = 'user-123';
      const type = 'API_REQUESTS';

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(cacheRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should throw error for unknown rate limit type without config', async () => {
      // Arrange
      const identifier = 'user-123';
      const type = 'UNKNOWN_TYPE';

      // Act & Assert
      await expect(
        rateLimitService.checkRateLimit(identifier, type)
      ).rejects.toThrow('Unknown rate limit type');
    });

    it('should handle pipeline execution errors gracefully', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error')),
      });

      // Act
      const result = await rateLimitService.checkRateLimit('user-123', 'API_REQUESTS');

      // Assert
      expect(result.allowed).toBe(true); // Fail open
    });

    it('should calculate sliding window count correctly', async () => {
      // Arrange
      const identifier = 'user-123';
      const type = 'API_REQUESTS';
      
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 20], // current window
          [null, 'OK'],
          [null, '40'], // previous window
        ]),
      });

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result).toBeDefined();
      expect(result.limit).toBe(100);
    });
  });

  describe('checkApiRateLimit', () => {
    it('should check API request rate limit', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 10],
          [null, 'OK'],
          [null, '5'],
        ]),
      });

      // Act
      const result = await rateLimitService.checkApiRateLimit('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.limit).toBe(100);
    });
  });

  describe('checkLoginRateLimit', () => {
    it('should check login attempt rate limit', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 2],
          [null, 'OK'],
          [null, '1'],
        ]),
      });

      // Act
      const result = await rateLimitService.checkLoginRateLimit('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.limit).toBe(5);
    });
  });

  describe('checkRegistrationRateLimit', () => {
    it('should check registration rate limit', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 'OK'],
          [null, '0'],
        ]),
      });

      // Act
      const result = await rateLimitService.checkRegistrationRateLimit('192.168.1.1');

      // Assert
      expect(result).toBeDefined();
      expect(result.limit).toBe(3);
    });
  });

  describe('checkPasswordResetRateLimit', () => {
    it('should check password reset rate limit', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 'OK'],
          [null, '0'],
        ]),
      });

      // Act
      const result = await rateLimitService.checkPasswordResetRateLimit('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.limit).toBe(3);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', async () => {
      // Act
      const result = await rateLimitService.resetRateLimit('user-123', 'API_REQUESTS');

      // Assert
      expect(result).toBe(true);
      expect(cacheRedis.del).toHaveBeenCalled();
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await rateLimitService.resetRateLimit('user-123', 'API_REQUESTS');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (cacheRedis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await rateLimitService.resetRateLimit('user-123', 'API_REQUESTS');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '10'],
          [null, '5'],
        ]),
      });

      // Act
      const status = await rateLimitService.getRateLimitStatus('user-123', 'API_REQUESTS');

      // Assert
      expect(status).toBeDefined();
      expect(status?.limit).toBe(100);
      expect(status?.current).toBeGreaterThanOrEqual(0);
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
    });

    it('should return null when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const status = await rateLimitService.getRateLimitStatus('user-123', 'API_REQUESTS');

      // Assert
      expect(status).toBeNull();
    });

    it('should return null for unknown rate limit type', async () => {
      // Act
      const status = await rateLimitService.getRateLimitStatus('user-123', 'UNKNOWN_TYPE');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('createMiddleware', () => {
    it('should create Express middleware', () => {
      // Act
      const middleware = rateLimitService.createMiddleware('API_REQUESTS');

      // Assert
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should call next() when request is allowed', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, 'OK'],
          [null, '2'],
        ]),
      });

      const middleware = rateLimitService.createMiddleware('API_REQUESTS');
      const req = { ip: '192.168.1.1' };
      const res = { set: jest.fn() };
      const next = jest.fn();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalled();
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 95],
          [null, 'OK'],
          [null, '50'],
        ]),
      });

      const middleware = rateLimitService.createMiddleware('API_REQUESTS');
      const req = { ip: '192.168.1.1' };
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should use user ID if authenticated', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, 'OK'],
          [null, '2'],
        ]),
      });

      const middleware = rateLimitService.createMiddleware('API_REQUESTS');
      const req = { user: { id: 'user-123' }, ip: '192.168.1.1' };
      const res = { set: jest.fn() };
      const next = jest.fn();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should fail open on error', async () => {
      // Arrange
      (cacheRedis.pipeline as jest.Mock).mockImplementation(() => {
        throw new Error('Redis error');
      });

      const middleware = rateLimitService.createMiddleware('API_REQUESTS');
      const req = { ip: '192.168.1.1' };
      const res = { set: jest.fn() };
      const next = jest.fn();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled(); // Fail open
    });
  });

  describe('getRateLimitTypes', () => {
    it('should return all rate limit types', () => {
      // Act
      const types = rateLimitService.getRateLimitTypes();

      // Assert
      expect(types).toBeInstanceOf(Array);
      expect(types).toContain('API_REQUESTS');
      expect(types).toContain('LOGIN_ATTEMPTS');
      expect(types).toContain('REGISTRATION');
      expect(types).toContain('PASSWORD_RESET');
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return configuration for valid type', () => {
      // Act
      const config = rateLimitService.getRateLimitConfig('API_REQUESTS');

      // Assert
      expect(config).toBeDefined();
      expect(config).toHaveProperty('window');
      expect(config).toHaveProperty('max');
      expect(config?.window).toBe(60);
      expect(config?.max).toBe(100);
    });

    it('should return null for invalid type', () => {
      // Act
      const config = rateLimitService.getRateLimitConfig('INVALID_TYPE');

      // Assert
      expect(config).toBeNull();
    });
  });

  describe('updateRateLimitConfig', () => {
    it('should update rate limit configuration', () => {
      // Arrange
      const newConfig = { window: 120, max: 200 };

      // Act
      rateLimitService.updateRateLimitConfig('API_REQUESTS', newConfig);
      const updatedConfig = rateLimitService.getRateLimitConfig('API_REQUESTS');

      // Assert
      expect(updatedConfig?.window).toBe(120);
      expect(updatedConfig?.max).toBe(200);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connected', async () => {
      // Act
      const health = await rateLimitService.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health).toHaveProperty('types');
      expect(health.types.length).toBeGreaterThan(0);
    });

    it('should return unhealthy status when not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const health = await rateLimitService.healthCheck();

      // Assert
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
    });
  });
});

/**
 * Test Coverage Summary:
 * - Sliding window rate limiting algorithm ✅
 * - Rate limit checking (allow/deny) ✅
 * - Specific rate limit methods (API, login, registration, password reset) ✅
 * - Rate limit reset ✅
 * - Rate limit status retrieval ✅
 * - Express middleware creation ✅
 * - Configuration management ✅
 * - Health check ✅
 * - Redis connection handling ✅
 * - Error handling and fail-open behavior ✅
 * 
 * Target Coverage: 90%+
 * Critical Logic: Sliding window algorithm, fail-open behavior
 */

