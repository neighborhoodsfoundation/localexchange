/**
 * Session Service Unit Tests
 * Tests for Redis-based session management with security features
 */

// Mock Redis before importing service
jest.mock('../../config/redis', () => ({
  sessionRedis: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    pipeline: jest.fn(() => ({
      del: jest.fn().mockReturnThis(),
      srem: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    scard: jest.fn(),
  },
  CACHE_TTL: {
    USER_SESSIONS: 3600,
  },
  redisUtils: {
    isConnected: jest.fn().mockReturnValue(true),
    serialize: jest.fn((data) => JSON.stringify(data)),
    deserialize: jest.fn((data) => JSON.parse(data)),
    getMemoryUsage: jest.fn().mockResolvedValue(1024000),
  },
}));

import { sessionService } from '../session.service';
import { sessionRedis, redisUtils } from '../../config/redis';

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      // Act
      const session = await sessionService.createSession(userId, {}, metadata);

      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.userAgent).toBe(metadata.userAgent);
      expect(session.ipAddress).toBe(metadata.ipAddress);
      expect(session.isActive).toBe(true);
      expect(sessionRedis.setex).toHaveBeenCalled();
      expect(sessionRedis.sadd).toHaveBeenCalledTimes(2); // user sessions and active sessions
    });

    it('should use custom TTL when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const customTTL = 7200;

      // Act
      await sessionService.createSession(userId, { ttl: customTTL });

      // Assert
      expect(sessionRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        customTTL,
        expect.any(String)
      );
    });

    it('should throw error when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(
        sessionService.createSession('user-123')
      ).rejects.toThrow('Session Redis not connected');
    });

    it('should generate unique session IDs', async () => {
      // Act
      const session1 = await sessionService.createSession('user-123');
      const session2 = await sessionService.createSession('user-123');

      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionData = {
        sessionId,
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const session = await sessionService.getSession(sessionId);

      // Assert
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.userId).toBe('user-123');
    });

    it('should return null when session does not exist', async () => {
      // Arrange
      (sessionRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      const session = await sessionService.getSession('non-existent');

      // Assert
      expect(session).toBeNull();
    });

    it('should return null when session is expired', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionData = {
        sessionId,
        userId: 'user-123',
        createdAt: Date.now() - 7200000,
        lastAccessed: Date.now() - 3600000,
        expiresAt: Date.now() - 1000, // Expired
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const session = await sessionService.getSession(sessionId);

      // Assert
      expect(session).toBeNull();
      expect(sessionRedis.del).toHaveBeenCalled(); // Cleanup expired session
    });

    it('should return null when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const session = await sessionService.getSession('session-123');

      // Assert
      expect(session).toBeNull();
    });

    it('should update last accessed time', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionData = {
        sessionId,
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now() - 60000,
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const session = await sessionService.getSession(sessionId);

      // Assert
      expect(session?.lastAccessed).toBeGreaterThan(sessionData.lastAccessed);
      expect(sessionRedis.setex).toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      // Arrange
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };

      // Act
      const result = await sessionService.updateSession(session);

      // Assert
      expect(result).toBe(true);
      expect(sessionRedis.setex).toHaveBeenCalled();
    });

    it('should return false when TTL is negative', async () => {
      // Arrange
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() - 1000, // Expired
        isActive: true,
      };

      // Act
      const result = await sessionService.updateSession(session);

      // Assert
      expect(result).toBe(false);
      expect(sessionRedis.del).toHaveBeenCalled();
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };

      // Act
      const result = await sessionService.updateSession(session);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionData = {
        sessionId,
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const result = await sessionService.deleteSession(sessionId);

      // Assert
      expect(result).toBe(true);
      expect(sessionRedis.del).toHaveBeenCalled();
      expect(sessionRedis.srem).toHaveBeenCalledTimes(2); // user sessions and active sessions
    });

    it('should return false when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await sessionService.deleteSession('session-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteUserSessions', () => {
    it('should delete all user sessions', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionIds = ['session-1', 'session-2', 'session-3'];
      (sessionRedis.smembers as jest.Mock).mockResolvedValue(sessionIds);

      // Act
      const count = await sessionService.deleteUserSessions(userId);

      // Assert
      expect(count).toBe(3);
      expect(sessionRedis.pipeline).toHaveBeenCalled();
    });

    it('should return 0 when user has no sessions', async () => {
      // Arrange
      (sessionRedis.smembers as jest.Mock).mockResolvedValue([]);

      // Act
      const count = await sessionService.deleteUserSessions('user-123');

      // Assert
      expect(count).toBe(0);
    });

    it('should return 0 when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const count = await sessionService.deleteUserSessions('user-123');

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('extendSession', () => {
    it('should extend session expiry', async () => {
      // Arrange
      const sessionId = 'session-123';
      const sessionData = {
        sessionId,
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const result = await sessionService.extendSession(sessionId, 7200);

      // Assert
      expect(result).toBe(true);
      expect(sessionRedis.setex).toHaveBeenCalled();
    });

    it('should return false when session does not exist', async () => {
      // Arrange
      (sessionRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await sessionService.extendSession('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserSessions', () => {
    it('should return all user sessions', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionIds = ['session-1', 'session-2'];
      const sessionData1 = {
        sessionId: 'session-1',
        userId,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      const sessionData2 = {
        sessionId: 'session-2',
        userId,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.smembers as jest.Mock).mockResolvedValue(sessionIds);
      (sessionRedis.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(sessionData1))
        .mockResolvedValueOnce(JSON.stringify(sessionData2));

      // Act
      const sessions = await sessionService.getUserSessions(userId);

      // Assert
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe('session-1');
      expect(sessions[1].sessionId).toBe('session-2');
    });

    it('should return empty array when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const sessions = await sessionService.getUserSessions('user-123');

      // Assert
      expect(sessions).toEqual([]);
    });
  });

  describe('validateSession', () => {
    it('should return true for valid active session', async () => {
      // Arrange
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const isValid = await sessionService.validateSession('session-123');

      // Assert
      expect(isValid).toBe(true);
    });

    it('should return false for inactive session', async () => {
      // Arrange
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: false,
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      // Act
      const isValid = await sessionService.validateSession('session-123');

      // Assert
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent session', async () => {
      // Arrange
      (sessionRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      const isValid = await sessionService.validateSession('non-existent');

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('updateSessionMetadata', () => {
    it('should update session metadata', async () => {
      // Arrange
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
        metadata: { existing: 'data' },
      };
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));

      const newMetadata = { newKey: 'newValue' };

      // Act
      const result = await sessionService.updateSessionMetadata('session-123', newMetadata);

      // Assert
      expect(result).toBe(true);
      expect(sessionRedis.setex).toHaveBeenCalled();
    });

    it('should return false when session does not exist', async () => {
      // Arrange
      (sessionRedis.get as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await sessionService.updateSessionMetadata('non-existent', { key: 'value' });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Arrange
      const sessionIds = ['session-1', 'session-2', 'session-3'];
      const expiredSession = {
        sessionId: 'session-1',
        userId: 'user-123',
        createdAt: Date.now() - 7200000,
        lastAccessed: Date.now() - 3600000,
        expiresAt: Date.now() - 1000, // Expired
        isActive: true,
      };
      const validSession = {
        sessionId: 'session-2',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      };
      (sessionRedis.smembers as jest.Mock).mockResolvedValue(sessionIds);
      (sessionRedis.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(expiredSession))
        .mockResolvedValueOnce(JSON.stringify(validSession))
        .mockResolvedValueOnce(null); // session-3 not found

      // Act
      const count = await sessionService.cleanupExpiredSessions();

      // Assert
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const count = await sessionService.cleanupExpiredSessions();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      // Arrange
      (sessionRedis.scard as jest.Mock).mockResolvedValue(10);
      (sessionRedis.smembers as jest.Mock).mockResolvedValue(['session-1', 'session-2']);
      (sessionRedis.get as jest.Mock).mockResolvedValue(JSON.stringify({
        sessionId: 'session-1',
        userId: 'user-123',
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 3600000,
        isActive: true,
      }));

      // Act
      const stats = await sessionService.getSessionStats();

      // Assert
      expect(stats).toHaveProperty('totalActive');
      expect(stats).toHaveProperty('totalExpired');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats.totalActive).toBe(10);
    });

    it('should return zero stats when Redis is not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const stats = await sessionService.getSessionStats();

      // Assert
      expect(stats.totalActive).toBe(0);
      expect(stats.totalExpired).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connected', async () => {
      // Arrange
      (sessionRedis.scard as jest.Mock).mockResolvedValue(5);
      (sessionRedis.smembers as jest.Mock).mockResolvedValue([]);

      // Act
      const health = await sessionService.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health).toHaveProperty('stats');
    });

    it('should return unhealthy status when not connected', async () => {
      // Arrange
      (redisUtils.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const health = await sessionService.healthCheck();

      // Assert
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
    });
  });
});

/**
 * Test Coverage Summary:
 * - Session creation with custom options ✅
 * - Session retrieval and validation ✅
 * - Session updates and expiry management ✅
 * - Session deletion (single and bulk) ✅
 * - Session metadata management ✅
 * - User session management ✅
 * - Expired session cleanup ✅
 * - Session statistics ✅
 * - Health check ✅
 * - Redis connection handling ✅
 * - Error handling ✅
 * 
 * Target Coverage: 90%+
 * Critical Logic: Session expiry, cleanup, validation
 */

