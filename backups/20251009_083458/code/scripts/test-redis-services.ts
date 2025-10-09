#!/usr/bin/env ts-node

/**
 * LocalEx Redis Services Test Suite
 * Comprehensive testing for cache, queue, rate limiting, and session services
 */

import { cacheService } from '../src/services/cache.service';
import { queueService } from '../src/services/queue.service';
import { rateLimitService } from '../src/services/rate-limit.service';
import { sessionService } from '../src/services/session.service';
import { cacheRedis, queueRedis, sessionRedis } from '../src/config/redis';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

class RedisServicesTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting LocalEx Redis Services Tests...\n');

    // Redis Connection Tests
    await this.testRedisConnections();

    // Cache Service Tests
    await this.testCacheService();

    // Queue Service Tests
    await this.testQueueService();

    // Rate Limiting Tests
    await this.testRateLimitService();

    // Session Service Tests
    await this.testSessionService();

    // Performance Tests
    await this.testPerformance();

    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<boolean | string>): Promise<void> {
    const startTime = process.hrtime.bigint();
    let passed = false;
    let message = 'Test failed';
    
    try {
      const result = await testFn();
      if (typeof result === 'boolean') {
        passed = result;
        message = result ? 'Test passed' : 'Test failed';
      } else {
        passed = false;
        message = `Test failed: ${result}`;
      }
    } catch (error: any) {
      message = `Test failed with error: ${error.message}`;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // milliseconds

    this.results.push({ name, passed, message, duration });
  }

  // =====================================================
  // REDIS CONNECTION TESTS
  // =====================================================

  private async testRedisConnections(): Promise<void> {
    console.log('📡 Testing Redis Connections...');
    console.log('--------------------------------');

    await this.runTest('Cache Redis Connection', async () => {
      try {
        await cacheRedis.ping();
        return true;
      } catch (error) {
        return `Cache Redis connection failed: ${error}`;
      }
    });

    await this.runTest('Queue Redis Connection', async () => {
      try {
        await queueRedis.ping();
        return true;
      } catch (error) {
        return `Queue Redis connection failed: ${error}`;
      }
    });

    await this.runTest('Session Redis Connection', async () => {
      try {
        await sessionRedis.ping();
        return true;
      } catch (error) {
        return `Session Redis connection failed: ${error}`;
      }
    });
  }

  // =====================================================
  // CACHE SERVICE TESTS
  // =====================================================

  private async testCacheService(): Promise<void> {
    console.log('\n💾 Testing Cache Service...');
    console.log('----------------------------');

    await this.runTest('Cache Set and Get', async () => {
      const key = 'test:cache:basic';
      const value = { message: 'Hello Cache!', timestamp: Date.now() };
      
      const setResult = await cacheService.set(key, value, { ttl: 60 });
      if (!setResult) return false;
      
      const getValue = await cacheService.get(key);
      return getValue && getValue.message === value.message;
    });

    await this.runTest('Cache Exists Check', async () => {
      const key = 'test:cache:exists';
      const value = { test: 'data' };
      
      await cacheService.set(key, value, { ttl: 60 });
      const exists = await cacheService.exists(key);
      return exists === true;
    });

    await this.runTest('Cache Delete', async () => {
      const key = 'test:cache:delete';
      const value = { test: 'data' };
      
      await cacheService.set(key, value, { ttl: 60 });
      const deleteResult = await cacheService.delete(key);
      const existsAfter = await cacheService.exists(key);
      
      return deleteResult && !existsAfter;
    });

    await this.runTest('Cache Multiple Get/Set', async () => {
      const keyValuePairs = {
        'test:cache:mget:1': { id: 1, name: 'Test 1' },
        'test:cache:mget:2': { id: 2, name: 'Test 2' },
        'test:cache:mget:3': { id: 3, name: 'Test 3' },
      };
      
      const setResult = await cacheService.mset(keyValuePairs, { ttl: 60 });
      if (!setResult) return false;
      
      const getValues = await cacheService.mget(Object.keys(keyValuePairs));
      return getValues.length === 3 && getValues.every(v => v !== null);
    });

    await this.runTest('Cache Query Caching', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return { data: 'expensive query result', callCount };
      };
      
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = ['123'];
      
      // First call should execute query
      const result1 = await cacheService.cacheQuery(query, params, mockQuery, { ttl: 60 });
      
      // Second call should use cache
      const result2 = await cacheService.cacheQuery(query, params, mockQuery, { ttl: 60 });
      
      return callCount === 1 && result1.callCount === result2.callCount;
    });

    await this.runTest('Cache Health Check', async () => {
      const health = await cacheService.healthCheck();
      return health.status === 'healthy' && health.connected === true;
    });
  }

  // =====================================================
  // QUEUE SERVICE TESTS
  // =====================================================

  private async testQueueService(): Promise<void> {
    console.log('\n📋 Testing Queue Service...');
    console.log('----------------------------');

    await this.runTest('Queue Job Registration', async () => {
      let processed = false;
      
      queueService.registerProcessor('test-queue', 'test-job', async (job) => {
        processed = true;
        return Promise.resolve();
      });
      
      return true; // Registration should not throw
    });

    await this.runTest('Queue Add Job', async () => {
      const jobId = await queueService.addJob('test-queue', 'test-job', { test: 'data' });
      return typeof jobId === 'string' && jobId.length > 0;
    });

    await this.runTest('Queue Job Idempotency', async () => {
      const jobData = { test: 'idempotency', unique: Date.now() };
      
      const jobId1 = await queueService.addJob('test-queue', 'test-job', jobData);
      const jobId2 = await queueService.addJob('test-queue', 'test-job', jobData);
      
      return jobId1 === jobId2; // Should return same job ID
    });

    await this.runTest('Queue Get Job Status', async () => {
      const jobData = { test: 'status', unique: Date.now() };
      const jobId = await queueService.addJob('test-queue', 'test-job', jobData);
      
      const status = await queueService.getJobStatus(jobId);
      return status !== null && status.id === jobId;
    });

    await this.runTest('Queue Statistics', async () => {
      const stats = await queueService.getQueueStats('test-queue');
      return typeof stats.waiting === 'number' && typeof stats.total === 'number';
    });

    await this.runTest('Queue Health Check', async () => {
      const health = await queueService.healthCheck();
      return health.status === 'healthy' && health.connected === true;
    });
  }

  // =====================================================
  // RATE LIMITING TESTS
  // =====================================================

  private async testRateLimitService(): Promise<void> {
    console.log('\n🚦 Testing Rate Limit Service...');
    console.log('--------------------------------');

    await this.runTest('Rate Limit Basic Check', async () => {
      const identifier = 'test-user-' + Date.now();
      const result = await rateLimitService.checkApiRateLimit(identifier);
      
      return result.allowed === true && result.remaining >= 0;
    });

    await this.runTest('Rate Limit Exceeded', async () => {
      const identifier = 'test-user-exceeded-' + Date.now();
      
      // Make multiple requests to exceed limit
      let result;
      for (let i = 0; i < 105; i++) {
        result = await rateLimitService.checkApiRateLimit(identifier);
      }
      
      return result && !result.allowed;
    });

    await this.runTest('Rate Limit Reset', async () => {
      const identifier = 'test-user-reset-' + Date.now();
      
      // Exceed limit
      for (let i = 0; i < 105; i++) {
        await rateLimitService.checkApiRateLimit(identifier);
      }
      
      // Reset rate limit
      const resetResult = await rateLimitService.resetRateLimit(identifier, 'API_REQUESTS');
      
      // Check if reset worked
      const result = await rateLimitService.checkApiRateLimit(identifier);
      
      return resetResult && result.allowed;
    });

    await this.runTest('Rate Limit Status', async () => {
      const identifier = 'test-user-status-' + Date.now();
      
      // Make a few requests
      for (let i = 0; i < 5; i++) {
        await rateLimitService.checkApiRateLimit(identifier);
      }
      
      const status = await rateLimitService.getRateLimitStatus(identifier, 'API_REQUESTS');
      
      return status !== null && status.current > 0;
    });

    await this.runTest('Rate Limit Health Check', async () => {
      const health = await rateLimitService.healthCheck();
      return health.status === 'healthy' && health.connected === true;
    });
  }

  // =====================================================
  // SESSION SERVICE TESTS
  // =====================================================

  private async testSessionService(): Promise<void> {
    console.log('\n🔐 Testing Session Service...');
    console.log('-----------------------------');

    await this.runTest('Session Creation', async () => {
      const userId = 'test-user-' + Date.now();
      const session = await sessionService.createSession(userId, {}, {
        userAgent: 'Test Agent',
        ipAddress: '127.0.0.1',
      });
      
      return session !== null && session.userId === userId;
    });

    await this.runTest('Session Retrieval', async () => {
      const userId = 'test-user-retrieve-' + Date.now();
      const createdSession = await sessionService.createSession(userId);
      
      const retrievedSession = await sessionService.getSession(createdSession.sessionId);
      
      return retrievedSession !== null && retrievedSession.sessionId === createdSession.sessionId;
    });

    await this.runTest('Session Validation', async () => {
      const userId = 'test-user-validate-' + Date.now();
      const session = await sessionService.createSession(userId);
      
      const isValid = await sessionService.validateSession(session.sessionId);
      const isInvalid = await sessionService.validateSession('invalid-session-id');
      
      return isValid && !isInvalid;
    });

    await this.runTest('Session Deletion', async () => {
      const userId = 'test-user-delete-' + Date.now();
      const session = await sessionService.createSession(userId);
      
      const deleteResult = await sessionService.deleteSession(session.sessionId);
      const getAfterDelete = await sessionService.getSession(session.sessionId);
      
      return deleteResult && getAfterDelete === null;
    });

    await this.runTest('User Sessions Cleanup', async () => {
      const userId = 'test-user-cleanup-' + Date.now();
      
      // Create multiple sessions
      const session1 = await sessionService.createSession(userId);
      const session2 = await sessionService.createSession(userId);
      
      // Delete all user sessions
      const deletedCount = await sessionService.deleteUserSessions(userId);
      
      // Verify sessions are deleted
      const getSession1 = await sessionService.getSession(session1.sessionId);
      const getSession2 = await sessionService.getSession(session2.sessionId);
      
      return deletedCount >= 2 && getSession1 === null && getSession2 === null;
    });

    await this.runTest('Session Statistics', async () => {
      const stats = await sessionService.getSessionStats();
      return typeof stats.totalActive === 'number' && typeof stats.memoryUsage === 'number';
    });

    await this.runTest('Session Health Check', async () => {
      const health = await sessionService.healthCheck();
      return health.status === 'healthy' && health.connected === true;
    });
  }

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');
    console.log('-------------------------');

    await this.runTest('Cache Performance', async () => {
      const startTime = Date.now();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const key = `perf:cache:${i}`;
        const value = { iteration: i, timestamp: Date.now() };
        
        await cacheService.set(key, value, { ttl: 60 });
        await cacheService.get(key);
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / (iterations * 2); // Set + Get
      
      return avgTime < 10; // Less than 10ms average
    });

    await this.runTest('Rate Limit Performance', async () => {
      const startTime = Date.now();
      const iterations = 50;
      const identifier = 'perf-user-' + Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await rateLimitService.checkApiRateLimit(identifier);
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      return avgTime < 5; // Less than 5ms average
    });

    await this.runTest('Session Performance', async () => {
      const startTime = Date.now();
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        const userId = `perf-user-${i}`;
        const session = await sessionService.createSession(userId);
        await sessionService.getSession(session.sessionId);
        await sessionService.deleteSession(session.sessionId);
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / (iterations * 3); // Create + Get + Delete
      
      return avgTime < 20; // Less than 20ms average
    });
  }

  // =====================================================
  // REPORTING
  // =====================================================

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('============================================================');
    
    let allPassed = true;
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${status}\x1b[0m ${result.name} (${result.duration?.toFixed(2)}ms) - ${result.message}`);
      if (!result.passed) {
        allPassed = false;
      }
    });
    
    console.log('\n============================================================');
    console.log(`Total: ${this.results.length} tests`);
    console.log(`✅ Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`❌ Failed: ${this.results.filter(r => !r.passed).length}`);
    console.log(`Success Rate: ${((this.results.filter(r => r.passed).length / this.results.length) * 100).toFixed(1)}%`);
    
    if (allPassed) {
      console.log('\n🎉 All Redis services tests passed successfully!');
    } else {
      console.log('\n⚠️ Some Redis services tests failed. Please review the logs.');
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new RedisServicesTester();
  tester.runAllTests().catch(console.error);
}

export { RedisServicesTester };
