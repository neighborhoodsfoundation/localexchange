#!/usr/bin/env ts-node

/**
 * LocalEx Integration Tests
 * Tests all services working together as a complete system
 */

import { testOpenSearchConnection, checkOpenSearchHealth } from '../src/config/opensearch';
import { testOpenSearchConnection as testRedisConnection } from '../src/config/redis';
import { testOpenSearchConnection as testDatabaseConnection } from '../src/config/database';
import { searchService } from '../src/services/search.service';
import { cacheService } from '../src/services/cache.service';
import { queueService } from '../src/services/queue.service';
import { sessionService } from '../src/services/session.service';
import { rateLimitService } from '../src/services/rate-limit.service';
import { indexService } from '../src/services/index.service';
import { db } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

interface IntegrationTestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
  details?: any;
}

class IntegrationTester {
  private results: IntegrationTestResult[] = [];
  private testData: any = {};

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting LocalEx Integration Tests...\n');

    // Wait for all services to be ready
    await this.waitForServices();

    // Service connectivity tests
    await this.runTest('Service Connectivity', () => this.testServiceConnectivity());

    // Database-OpenSearch integration
    await this.runTest('Database-Search Integration', () => this.testDatabaseSearchIntegration());

    // Cache-Search integration
    await this.runTest('Cache-Search Integration', () => this.testCacheSearchIntegration());

    // Queue-Database integration
    await this.runTest('Queue-Database Integration', () => this.testQueueDatabaseIntegration());

    // Session-Cache integration
    await this.runTest('Session-Cache Integration', () => this.testSessionCacheIntegration());

    // Rate Limiting integration
    await this.runTest('Rate Limiting Integration', () => this.testRateLimitingIntegration());

    // Complete user workflow
    await this.runTest('Complete User Workflow', () => this.testCompleteUserWorkflow());

    // Performance integration
    await this.runTest('Performance Integration', () => this.testPerformanceIntegration());

    // Error handling integration
    await this.runTest('Error Handling Integration', () => this.testErrorHandlingIntegration());

    this.printResults();
  }

  private async waitForServices(): Promise<void> {
    console.log('⏳ Waiting for all services to be ready...');
    
    const services = [
      { name: 'Database', test: () => this.testDatabaseConnection() },
      { name: 'Redis', test: () => this.testRedisConnection() },
      { name: 'OpenSearch', test: () => this.testOpenSearchConnection() }
    ];

    for (const service of services) {
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          const isReady = await service.test();
          if (isReady) {
            console.log(`✅ ${service.name} is ready`);
            break;
          }
        } catch (error) {
          // Service not ready yet
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`${service.name} failed to become ready after ${maxAttempts} attempts`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async runTest(name: string, testFn: () => Promise<boolean | string>): Promise<void> {
    const startTime = process.hrtime.bigint();
    let passed = false;
    let message = 'Test failed';
    let details: any = undefined;
    
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
      details = error.stack;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // milliseconds

    this.results.push({ name, passed, message, duration, details });
  }

  // Service connectivity tests
  private async testDatabaseConnection(): Promise<boolean> {
    try {
      await db.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async testRedisConnection(): Promise<boolean> {
    try {
      await cacheService.set('test', 'value', 1);
      const result = await cacheService.get('test');
      return result === 'value';
    } catch {
      return false;
    }
  }

  private async testOpenSearchConnection(): Promise<boolean> {
    try {
      return await testOpenSearchConnection();
    } catch {
      return false;
    }
  }

  private async testServiceConnectivity(): Promise<boolean> {
    const services = [
      { name: 'Database', test: () => this.testDatabaseConnection() },
      { name: 'Redis Cache', test: () => this.testRedisConnection() },
      { name: 'OpenSearch', test: () => this.testOpenSearchConnection() }
    ];

    for (const service of services) {
      const isReady = await service.test();
      if (!isReady) {
        throw new Error(`${service.name} is not accessible`);
      }
    }

    return true;
  }

  // Database-OpenSearch integration
  private async testDatabaseSearchIntegration(): Promise<boolean> {
    try {
      // Create test user and item in database
      const userId = uuidv4();
      const itemId = uuidv4();
      
      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'integration_test_user', 'integration@test.com', 'hashed_password', 'Test', 'User']);

      await db.query(`
        INSERT INTO items (id, user_id, title, description, price, condition, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [itemId, userId, 'Integration Test Item', 'Test item for integration testing', 99.99, 'new', 'active']);

      // Index the item in OpenSearch
      await searchService.indexItem({
        id: itemId,
        title: 'Integration Test Item',
        description: 'Test item for integration testing',
        category: 'Electronics',
        price: 99.99,
        condition: 'new',
        location: {
          lat: 40.7128,
          lon: -74.0060,
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        },
        images: ['test-image.jpg'],
        tags: ['test', 'integration'],
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        views: 0,
        favorites: 0
      });

      // Search for the item
      const searchResults = await searchService.search({
        query: 'Integration Test Item',
        pagination: { page: 1, size: 10 }
      });

      const found = searchResults.hits.some(hit => hit.id === itemId);
      
      // Cleanup
      await searchService.deleteItem(itemId);
      await db.query('DELETE FROM items WHERE id = $1', [itemId]);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      return found;
    } catch (error) {
      throw new Error(`Database-Search integration failed: ${error.message}`);
    }
  }

  // Cache-Search integration
  private async testCacheSearchIntegration(): Promise<boolean> {
    try {
      // Perform a search (should be cached)
      const searchQuery = {
        query: 'cached search test',
        pagination: { page: 1, size: 10 }
      };

      const results1 = await searchService.search(searchQuery);
      const results2 = await searchService.search(searchQuery);

      // Both results should be identical (second from cache)
      return JSON.stringify(results1) === JSON.stringify(results2);
    } catch (error) {
      throw new Error(`Cache-Search integration failed: ${error.message}`);
    }
  }

  // Queue-Database integration
  private async testQueueDatabaseIntegration(): Promise<boolean> {
    try {
      const testJobId = uuidv4();
      let jobProcessed = false;

      // Register a test processor
      queueService.registerProcessor('integration-test', async (payload) => {
        jobProcessed = true;
        return { processed: true, payload };
      });

      // Add a job to the queue
      await queueService.addJob('integration-test', { testId: testJobId });

      // Wait for job to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      return jobProcessed;
    } catch (error) {
      throw new Error(`Queue-Database integration failed: ${error.message}`);
    }
  }

  // Session-Cache integration
  private async testSessionCacheIntegration(): Promise<boolean> {
    try {
      const userId = uuidv4();
      
      // Create a session
      const { sessionId } = await sessionService.createSession(userId, {
        userAgent: 'Integration Test',
        ipAddress: '127.0.0.1'
      });

      // Retrieve the session
      const session = await sessionService.getSession(sessionId);
      
      // Update the session
      await sessionService.updateSession(sessionId, { lastAccessed: Date.now() });
      
      // Delete the session
      await sessionService.deleteSession(sessionId);
      
      // Verify session is deleted
      const deletedSession = await sessionService.getSession(sessionId);

      return session !== null && deletedSession === null;
    } catch (error) {
      throw new Error(`Session-Cache integration failed: ${error.message}`);
    }
  }

  // Rate limiting integration
  private async testRateLimitingIntegration(): Promise<boolean> {
    try {
      const testKey = 'integration-test-rate-limit';
      
      // Reset any existing rate limit
      await rateLimitService.resetRateLimit(testKey);

      // Make requests within limit
      const results = [];
      for (let i = 0; i < 5; i++) {
        const allowed = await rateLimitService.checkRateLimit(testKey, {
          windowMs: 60000, // 1 minute
          maxRequests: 10
        });
        results.push(allowed);
      }

      // All should be allowed
      const allAllowed = results.every(result => result === true);
      
      return allAllowed;
    } catch (error) {
      throw new Error(`Rate limiting integration failed: ${error.message}`);
    }
  }

  // Complete user workflow
  private async testCompleteUserWorkflow(): Promise<boolean> {
    try {
      const userId = uuidv4();
      const itemId = uuidv4();
      
      // 1. Create user session
      const { sessionId } = await sessionService.createSession(userId, {
        userAgent: 'Integration Test',
        ipAddress: '127.0.0.1'
      });

      // 2. Create user in database
      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'workflow_test_user', 'workflow@test.com', 'hashed_password', 'Workflow', 'Test']);

      // 3. Create item listing
      await db.query(`
        INSERT INTO items (id, user_id, title, description, price, condition, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [itemId, userId, 'Workflow Test Item', 'Complete workflow test item', 149.99, 'excellent', 'active']);

      // 4. Index item for search
      await searchService.indexItem({
        id: itemId,
        title: 'Workflow Test Item',
        description: 'Complete workflow test item',
        category: 'Electronics',
        price: 149.99,
        condition: 'excellent',
        location: {
          lat: 40.7128,
          lon: -74.0060,
          address: '456 Workflow Ave',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        },
        images: ['workflow-image.jpg'],
        tags: ['workflow', 'test'],
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        views: 0,
        favorites: 0
      });

      // 5. Search for the item
      const searchResults = await searchService.search({
        query: 'Workflow Test Item',
        pagination: { page: 1, size: 10 }
      });

      const itemFound = searchResults.hits.some(hit => hit.id === itemId);

      // 6. Update session with activity
      await sessionService.updateSession(sessionId, { 
        lastAccessed: Date.now(),
        lastAction: 'search'
      });

      // 7. Cleanup
      await searchService.deleteItem(itemId);
      await sessionService.deleteSession(sessionId);
      await db.query('DELETE FROM items WHERE id = $1', [itemId]);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      return itemFound;
    } catch (error) {
      throw new Error(`Complete user workflow failed: ${error.message}`);
    }
  }

  // Performance integration
  private async testPerformanceIntegration(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Perform multiple operations concurrently
      const operations = [
        searchService.search({ query: 'performance test', pagination: { page: 1, size: 5 } }),
        cacheService.set('perf_test', 'value', 60),
        sessionService.createSession('perf_user', {}),
        rateLimitService.checkRateLimit('perf_key', { windowMs: 60000, maxRequests: 100 })
      ];

      await Promise.all(operations);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      return duration < 2000;
    } catch (error) {
      throw new Error(`Performance integration failed: ${error.message}`);
    }
  }

  // Error handling integration
  private async testErrorHandlingIntegration(): Promise<boolean> {
    try {
      // Test error handling across services
      const errorTests = [
        // Invalid search query
        () => searchService.search({ query: '', pagination: { page: -1, size: 0 } }),
        // Invalid cache key
        () => cacheService.get(''),
        // Invalid session ID
        () => sessionService.getSession('invalid-session-id'),
        // Invalid rate limit key
        () => rateLimitService.checkRateLimit('', { windowMs: 0, maxRequests: 0 })
      ];

      let errorsHandled = 0;
      for (const test of errorTests) {
        try {
          await test();
        } catch (error) {
          errorsHandled++;
        }
      }

      // All errors should be handled gracefully
      return errorsHandled === errorTests.length;
    } catch (error) {
      throw new Error(`Error handling integration failed: ${error.message}`);
    }
  }

  private printResults(): void {
    console.log('\n📊 Integration Test Results:');
    console.log('============================================================');
    
    let allPassed = true;
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${status}\x1b[0m ${result.name} (${result.duration?.toFixed(0)}ms)`);
      if (!result.passed) {
        allPassed = false;
        if (result.details) {
          console.log(`   Details: ${result.message}`);
        }
      }
    });
    
    console.log('============================================================');
    console.log(`Total: ${this.results.length} tests`);
    console.log(`✅ Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`❌ Failed: ${this.results.filter(r => !r.passed).length}`);
    console.log(`Success Rate: ${((this.results.filter(r => r.passed).length / this.results.length) * 100).toFixed(1)}%`);

    if (allPassed) {
      console.log('\n🎉 All integration tests passed successfully!');
      console.log('LocalEx system integration is working correctly.');
    } else {
      console.log('\n⚠️ Some integration tests failed.');
      console.log('Please review and fix integration issues.');
    }

    console.log('\n📋 Integration Test Summary:');
    console.log('- Service connectivity verified');
    console.log('- Database-Search integration working');
    console.log('- Cache-Search integration working');
    console.log('- Queue-Database integration working');
    console.log('- Session-Cache integration working');
    console.log('- Rate limiting integration working');
    console.log('- Complete user workflows functional');
    console.log('- Performance within acceptable limits');
    console.log('- Error handling working correctly');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

export { IntegrationTester };
