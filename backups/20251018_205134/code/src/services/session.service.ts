/**
 * LocalEx Session Service
 * Redis-based session management with security features
 */

import { sessionRedis, CACHE_TTL, redisUtils } from '../config/redis';
import crypto from 'crypto';

interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

interface SessionOptions {
  ttl?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

class SessionService {
  private readonly defaultTTL = CACHE_TTL.USER_SESSIONS;
  private readonly sessionPrefix = 'session:';

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    options: SessionOptions = {},
    metadata: {
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<SessionData> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        throw new Error('Session Redis not connected');
      }

      const now = Date.now();
      const ttl = options.ttl || this.defaultTTL;
      
      const sessionData: SessionData = {
        sessionId: this.generateSessionId(),
        userId,
        createdAt: now,
        lastAccessed: now,
        expiresAt: now + (ttl * 1000),
        isActive: true,
        metadata: {},
      };
      
      // Add optional fields if they exist
      if (metadata.userAgent) {
        sessionData.userAgent = metadata.userAgent;
      }
      if (metadata.ipAddress) {
        sessionData.ipAddress = metadata.ipAddress;
      }

      const sessionKey = this.sessionPrefix + sessionData.sessionId;
      
      // Store session data
      await sessionRedis.setex(
        sessionKey,
        ttl,
        redisUtils.serialize(sessionData)
      );

      // Add to user's active sessions set
      const userSessionsKey = `user:sessions:${userId}`;
      await sessionRedis.sadd(userSessionsKey, sessionData.sessionId);
      await sessionRedis.expire(userSessionsKey, ttl);

      // Add to active sessions set for cleanup
      await sessionRedis.sadd('active:sessions', sessionData.sessionId);

      return sessionData;
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    }
  }

  /**
   * Get session by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return null;
      }

      const sessionKey = this.sessionPrefix + sessionId;
      const sessionData = await sessionRedis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session = redisUtils.deserialize<SessionData>(sessionData);
      
      // Check if session is expired
      if (session && session.expiresAt <= Date.now()) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last accessed time
      if (session) {
        session.lastAccessed = Date.now();
        await this.updateSession(session);
      }

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(session: SessionData): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return false;
      }

      const sessionKey = this.sessionPrefix + session.sessionId;
      const ttl = Math.ceil((session.expiresAt - Date.now()) / 1000);
      
      if (ttl <= 0) {
        await this.deleteSession(session.sessionId);
        return false;
      }

      await sessionRedis.setex(
        sessionKey,
        ttl,
        redisUtils.serialize(session)
      );

      return true;
    } catch (error) {
      console.error('Update session error:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return false;
      }

      const sessionKey = this.sessionPrefix + sessionId;
      
      // Get session data to find userId
      const sessionData = await sessionRedis.get(sessionKey);
      if (sessionData) {
        const session = redisUtils.deserialize<SessionData>(sessionData);
        
        if (session) {
          // Remove from user's sessions
          const userSessionsKey = `user:sessions:${session.userId}`;
          await sessionRedis.srem(userSessionsKey, sessionId);
          
          // Remove from active sessions
          await sessionRedis.srem('active:sessions', sessionId);
        }
      }
      
      // Delete session data
      await sessionRedis.del(sessionKey);
      
      return true;
    } catch (error) {
      console.error('Delete session error:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return 0;
      }

      const userSessionsKey = `user:sessions:${userId}`;
      const sessionIds = await sessionRedis.smembers(userSessionsKey);
      
      if (sessionIds.length === 0) {
        return 0;
      }

      const pipeline = sessionRedis.pipeline();
      
      // Delete all session data
      for (const sessionId of sessionIds) {
        pipeline.del(this.sessionPrefix + sessionId);
        pipeline.srem('active:sessions', sessionId);
      }
      
      // Delete user sessions set
      pipeline.del(userSessionsKey);
      
      await pipeline.exec();
      
      return sessionIds.length;
    } catch (error) {
      console.error('Delete user sessions error:', error);
      return 0;
    }
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string, additionalTTL?: number): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const ttl = additionalTTL || this.defaultTTL;
      session.expiresAt = Date.now() + (ttl * 1000);
      
      return await this.updateSession(session);
    } catch (error) {
      console.error('Extend session error:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return [];
      }

      const userSessionsKey = `user:sessions:${userId}`;
      const sessionIds = await sessionRedis.smembers(userSessionsKey);
      
      const sessions: SessionData[] = [];
      
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Validate session (check if valid and not expired)
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      return session !== null && session.isActive;
    } catch (error) {
      console.error('Validate session error:', error);
      return false;
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      session.metadata = { ...session.metadata, ...metadata };
      return await this.updateSession(session);
    } catch (error) {
      console.error('Update session metadata error:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return 0;
      }

      const activeSessionIds = await sessionRedis.smembers('active:sessions');
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const sessionId of activeSessionIds) {
        const sessionKey = this.sessionPrefix + sessionId;
        const sessionData = await sessionRedis.get(sessionKey);
        
        if (!sessionData) {
          // Session data not found, remove from active set
          await sessionRedis.srem('active:sessions', sessionId);
          cleanedCount++;
          continue;
        }
        
        const session = redisUtils.deserialize<SessionData>(sessionData);
        if (session && session.expiresAt <= now) {
          await this.deleteSession(sessionId);
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    memoryUsage: number;
  }> {
    try {
      if (!redisUtils.isConnected(sessionRedis)) {
        return { totalActive: 0, totalExpired: 0, memoryUsage: 0 };
      }

      const activeCount = await sessionRedis.scard('active:sessions');
      const memoryUsage = await redisUtils.getMemoryUsage(sessionRedis);
      
      // Count expired sessions (this is approximate)
      const now = Date.now();
      const activeSessionIds = await sessionRedis.smembers('active:sessions');
      let expiredCount = 0;
      
      for (const sessionId of activeSessionIds) {
        const sessionKey = this.sessionPrefix + sessionId;
        const sessionData = await sessionRedis.get(sessionKey);
        
        if (sessionData) {
          const session = redisUtils.deserialize<SessionData>(sessionData);
          if (session && session.expiresAt <= now) {
            expiredCount++;
          }
        }
      }
      
      return {
        totalActive: activeCount,
        totalExpired: expiredCount,
        memoryUsage,
      };
    } catch (error) {
      console.error('Get session stats error:', error);
      return { totalActive: 0, totalExpired: 0, memoryUsage: 0 };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    stats: {
      totalActive: number;
      totalExpired: number;
      memoryUsage: number;
    };
  }> {
    const connected = redisUtils.isConnected(sessionRedis);
    const stats = await this.getSessionStats();
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      stats,
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
