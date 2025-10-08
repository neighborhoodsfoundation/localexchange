/**
 * LocalEx Redis Configuration
 * Redis client setup for caching, sessions, and queue management
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

// Cache Redis instance configuration
export const cacheRedisConfig: RedisConfig = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || 'LocalExRedis2024!',
  db: parseInt(process.env['REDIS_CACHE_DB'] || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Queue Redis instance configuration
export const queueRedisConfig: RedisConfig = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || 'LocalExRedis2024!',
  db: parseInt(process.env['REDIS_QUEUE_DB'] || '1'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Session Redis instance configuration
export const sessionRedisConfig: RedisConfig = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || 'LocalExRedis2024!',
  db: parseInt(process.env['REDIS_SESSION_DB'] || '2'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis instances
export const cacheRedis = new Redis(cacheRedisConfig);
export const queueRedis = new Redis(queueRedisConfig);
export const sessionRedis = new Redis(sessionRedisConfig);

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  USER_SESSIONS: 24 * 60 * 60,      // 24 hours
  QUERY_RESULTS: 5 * 60,            // 5 minutes
  API_RESPONSES: 60,                // 1 minute
  RATE_LIMITS: 60,                  // 1 minute
  USER_PROFILES: 30 * 60,           // 30 minutes
  ITEM_LISTINGS: 10 * 60,           // 10 minutes
  CATEGORIES: 60 * 60,              // 1 hour
  SYSTEM_SETTINGS: 5 * 60,          // 5 minutes
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_BALANCE: (userId: string) => `user:balance:${userId}`,
  QUERY_RESULT: (queryHash: string) => `query:${queryHash}`,
  API_RESPONSE: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
  RATE_LIMIT: (identifier: string) => `rate:${identifier}`,
  ITEM_LISTING: (itemId: string) => `item:${itemId}`,
  CATEGORIES: () => 'categories:all',
  SYSTEM_SETTING: (key: string) => `setting:${key}`,
} as const;

// Queue configurations
export const QUEUE_CONFIG = {
  CONCURRENCY: parseInt(process.env['QUEUE_CONCURRENCY'] || '5'),
  MAX_ATTEMPTS: parseInt(process.env['QUEUE_MAX_ATTEMPTS'] || '3'),
  BACKOFF_DELAY: parseInt(process.env['QUEUE_BACKOFF_DELAY'] || '5000'),
  RETRY_DELAY: parseInt(process.env['QUEUE_RETRY_DELAY'] || '1000'),
  JOB_TIMEOUT: parseInt(process.env['QUEUE_JOB_TIMEOUT'] || '30000'),
} as const;

// Queue names
export const QUEUE_NAMES = {
  EMAIL_NOTIFICATIONS: 'email:notifications',
  DATA_PROCESSING: 'data:processing',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SEARCH_INDEXING: 'search:indexing',
  IMAGE_PROCESSING: 'image:processing',
  AUDIT_LOGGING: 'audit:logging',
} as const;

// Rate limiting configurations
export const RATE_LIMITS = {
  API_REQUESTS: {
    window: 60,        // 1 minute
    max: 100,          // 100 requests per minute
  },
  LOGIN_ATTEMPTS: {
    window: 300,       // 5 minutes
    max: 5,            // 5 attempts per 5 minutes
  },
  REGISTRATION: {
    window: 3600,      // 1 hour
    max: 3,            // 3 registrations per hour per IP
  },
  PASSWORD_RESET: {
    window: 3600,      // 1 hour
    max: 3,            // 3 reset attempts per hour
  },
} as const;

// Redis event handlers
const setupRedisEventHandlers = (redis: Redis, name: string): void => {
  redis.on('connect', () => {
    console.log(`✅ Redis ${name} connected`);
  });

  redis.on('ready', () => {
    console.log(`✅ Redis ${name} ready`);
  });

  redis.on('error', (err) => {
    console.error(`❌ Redis ${name} error:`, err);
  });

  redis.on('close', () => {
    console.log(`📤 Redis ${name} connection closed`);
  });

  redis.on('reconnecting', () => {
    console.log(`🔄 Redis ${name} reconnecting...`);
  });

  redis.on('end', () => {
    console.log(`🛑 Redis ${name} connection ended`);
  });
};

// Setup event handlers for all Redis instances
setupRedisEventHandlers(cacheRedis, 'Cache');
setupRedisEventHandlers(queueRedis, 'Queue');
setupRedisEventHandlers(sessionRedis, 'Session');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down Redis connections...');
  
  await Promise.all([
    cacheRedis.quit(),
    queueRedis.quit(),
    sessionRedis.quit(),
  ]);
  
  console.log('🛑 Redis connections closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down Redis connections...');
  
  await Promise.all([
    cacheRedis.quit(),
    queueRedis.quit(),
    sessionRedis.quit(),
  ]);
  
  console.log('🛑 Redis connections closed.');
  process.exit(0);
});

// Redis utility functions
export const redisUtils = {
  /**
   * Generate a cache key with prefix
   */
  generateKey: (prefix: string, ...parts: string[]): string => {
    return `${prefix}:${parts.join(':')}`;
  },

  /**
   * Serialize data for Redis storage
   */
  serialize: (data: any): string => {
    return JSON.stringify(data);
  },

  /**
   * Deserialize data from Redis
   */
  deserialize: <T>(data: string | null): T | null => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  /**
   * Check if Redis is connected
   */
  isConnected: (redis: Redis): boolean => {
    return redis.status === 'ready';
  },

  /**
   * Get Redis memory usage
   */
  getMemoryUsage: async (redis: Redis): Promise<number> => {
    try {
      const info = await redis.info('memory');
      const lines = info.split('\r\n');
      const usedMemoryLine = lines.find(line => line.startsWith('used_memory:'));
      if (usedMemoryLine) {
        return parseInt(usedMemoryLine.split(':')[1]);
      }
      return 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get Redis info
   */
  getInfo: async (redis: Redis): Promise<any> => {
    try {
      const info = await redis.info();
      const result: any = {};
      const lines = info.split('\r\n');
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = value;
        }
      });
      
      return result;
    } catch {
      return {};
    }
  },
};

export default {
  cacheRedis,
  queueRedis,
  sessionRedis,
  CACHE_TTL,
  CACHE_KEYS,
  QUEUE_CONFIG,
  QUEUE_NAMES,
  RATE_LIMITS,
  redisUtils,
};
