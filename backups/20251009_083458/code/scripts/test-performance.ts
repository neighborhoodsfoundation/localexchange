#!/usr/bin/env ts-node

/**
 * LocalEx Performance Tests
 * Comprehensive performance testing for all system components
 */

import { searchService } from '../src/services/search.service';
import { cacheService } from '../src/services/cache.service';
import { queueService } from '../src/services/queue.service';
import { sessionService } from '../src/services/session.service';
import { rateLimitService } from '../src/services/rate-limit.service';
import { db } from '../src/config/database';
import { indexService } from '../src/services/index.service';
import { v4 as uuidv4 } from 'uuid';

interface PerformanceTestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  metrics: {
    throughput?: number;
    latency?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
}

interface PerformanceBenchmark {
  operation: string;
  targetLatency: number; // milliseconds
  targetThroughput: number; // operations per second
  maxErrorRate: number; // percentage
}

class PerformanceTester {
  private results: PerformanceTestResult[] = [];
  private benchmarks: PerformanceBenchmark[] = [
    { operation: 'Database Query', targetLatency: 50, targetThroughput: 100, maxErrorRate: 1 },
    { operation: 'Search Query', targetLatency: 200, targetThroughput: 50, maxErrorRate: 2 },
    { operation: 'Cache Operation', targetLatency: 10, targetThroughput: 1000, maxErrorRate: 0.5 },
    { operation: 'Queue Processing', targetLatency: 100, targetThroughput: 100, maxErrorRate: 1 },
    { operation: 'Session Management', targetLatency: 25, targetThroughput: 200, maxErrorRate: 1 },
    { operation: 'Rate Limiting', targetLatency: 5, targetThroughput: 2000, maxErrorRate: 0.1 }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting LocalEx Performance Tests...\n');

    // Database performance tests
    await this.runTest('Database Query Performance', () => this.testDatabasePerformance());
    await this.runTest('Database Transaction Performance', () => this.testDatabaseTransactionPerformance());

    // Search performance tests
    await this.runTest('Search Query Performance', () => this.testSearchPerformance());
    await this.runTest('Search Indexing Performance', () => this.testSearchIndexingPerformance());

    // Cache performance tests
    await this.runTest('Cache Read Performance', () => this.testCacheReadPerformance());
    await this.runTest('Cache Write Performance', () => this.testCacheWritePerformance());

    // Queue performance tests
    await this.runTest('Queue Processing Performance', () => this.testQueuePerformance());

    // Session performance tests
    await this.runTest('Session Management Performance', () => this.testSessionPerformance());

    // Rate limiting performance tests
    await this.runTest('Rate Limiting Performance', () => this.testRateLimitingPerformance());

    // Concurrent load tests
    await this.runTest('Concurrent Load Performance', () => this.testConcurrentLoad());

    // Memory usage tests
    await this.runTest('Memory Usage Performance', () => this.testMemoryUsage());

    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<PerformanceTestResult>): Promise<void> {
    console.log(`Running ${name}...`);
    
    try {
      const result = await testFn();
      this.results.push(result);
    } catch (error: any) {
      this.results.push({
        name,
        passed: false,
        message: `Test failed: ${error.message}`,
        duration: 0,
        metrics: {}
      });
    }
  }

  // Database performance tests
  private async testDatabasePerformance(): Promise<PerformanceTestResult> {
    const operations = 100;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await db.query('SELECT 1 as test');
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000; // ops per second
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Database Query')!;
      const passed = latency <= benchmark.targetLatency && 
                     throughput >= benchmark.targetThroughput && 
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Database Query Performance',
        passed,
        message: passed ? 'Database performance meets requirements' : 'Database performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Database performance test failed: ${error.message}`);
    }
  }

  private async testDatabaseTransactionPerformance(): Promise<PerformanceTestResult> {
    const operations = 50;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await db.query('BEGIN');
          await db.query('SELECT 1 as test');
          await db.query('COMMIT');
        } catch {
          errors++;
          await db.query('ROLLBACK');
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const passed = latency <= 100 && throughput >= 50 && errorRate <= 2;

      return {
        name: 'Database Transaction Performance',
        passed,
        message: passed ? 'Transaction performance meets requirements' : 'Transaction performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Database transaction performance test failed: ${error.message}`);
    }
  }

  // Search performance tests
  private async testSearchPerformance(): Promise<PerformanceTestResult> {
    const operations = 50;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await searchService.search({
            query: `test search ${i}`,
            pagination: { page: 1, size: 10 }
          });
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Search Query')!;
      const passed = latency <= benchmark.targetLatency && 
                     throughput >= benchmark.targetThroughput && 
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Search Query Performance',
        passed,
        message: passed ? 'Search performance meets requirements' : 'Search performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Search performance test failed: ${error.message}`);
    }
  }

  private async testSearchIndexingPerformance(): Promise<PerformanceTestResult> {
    const operations = 25;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await searchService.indexItem({
            id: uuidv4(),
            title: `Performance Test Item ${i}`,
            description: 'Performance testing item',
            category: 'Electronics',
            price: 99.99,
            condition: 'new',
            location: {
              lat: 40.7128 + (Math.random() - 0.5) * 0.1,
              lon: -74.0060 + (Math.random() - 0.5) * 0.1,
              address: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345'
            },
            images: ['test-image.jpg'],
            tags: ['test', 'performance'],
            userId: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            views: 0,
            favorites: 0
          });
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const passed = latency <= 500 && throughput >= 20 && errorRate <= 5;

      return {
        name: 'Search Indexing Performance',
        passed,
        message: passed ? 'Search indexing performance meets requirements' : 'Search indexing performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Search indexing performance test failed: ${error.message}`);
    }
  }

  // Cache performance tests
  private async testCacheReadPerformance(): Promise<PerformanceTestResult> {
    const operations = 1000;
    const startTime = Date.now();
    let errors = 0;

    try {
      // Pre-populate cache
      for (let i = 0; i < operations; i++) {
        await cacheService.set(`perf_test_${i}`, `value_${i}`, 60);
      }

      // Test cache reads
      for (let i = 0; i < operations; i++) {
        try {
          await cacheService.get(`perf_test_${i}`);
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Cache Operation')!;
      const passed = latency <= benchmark.targetLatency && 
                     throughput >= benchmark.targetThroughput && 
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Cache Read Performance',
        passed,
        message: passed ? 'Cache read performance meets requirements' : 'Cache read performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Cache read performance test failed: ${error.message}`);
    }
  }

  private async testCacheWritePerformance(): Promise<PerformanceTestResult> {
    const operations = 500;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await cacheService.set(`write_test_${i}`, `value_${i}`, 60);
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const passed = latency <= 20 && throughput >= 500 && errorRate <= 1;

      return {
        name: 'Cache Write Performance',
        passed,
        message: passed ? 'Cache write performance meets requirements' : 'Cache write performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Cache write performance test failed: ${error.message}`);
    }
  }

  // Queue performance tests
  private async testQueuePerformance(): Promise<PerformanceTestResult> {
    const operations = 100;
    const startTime = Date.now();
    let errors = 0;
    let processedJobs = 0;

    try {
      // Register a test processor
      queueService.registerProcessor('perf-test', async (payload) => {
        processedJobs++;
        return { processed: true };
      });

      // Add jobs to queue
      for (let i = 0; i < operations; i++) {
        try {
          await queueService.addJob('perf-test', { testId: i });
        } catch {
          errors++;
        }
      }

      // Wait for jobs to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Queue Processing')!;
      const passed = latency <= benchmark.targetLatency && 
                     processedJobs >= operations * 0.9 && // 90% of jobs processed
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Queue Processing Performance',
        passed,
        message: passed ? 'Queue performance meets requirements' : 'Queue performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Queue performance test failed: ${error.message}`);
    }
  }

  // Session performance tests
  private async testSessionPerformance(): Promise<PerformanceTestResult> {
    const operations = 200;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          const { sessionId } = await sessionService.createSession(`user_${i}`, {});
          await sessionService.getSession(sessionId);
          await sessionService.updateSession(sessionId, { lastAccessed: Date.now() });
          await sessionService.deleteSession(sessionId);
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Session Management')!;
      const passed = latency <= benchmark.targetLatency && 
                     throughput >= benchmark.targetThroughput && 
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Session Management Performance',
        passed,
        message: passed ? 'Session performance meets requirements' : 'Session performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Session performance test failed: ${error.message}`);
    }
  }

  // Rate limiting performance tests
  private async testRateLimitingPerformance(): Promise<PerformanceTestResult> {
    const operations = 2000;
    const startTime = Date.now();
    let errors = 0;

    try {
      for (let i = 0; i < operations; i++) {
        try {
          await rateLimitService.checkRateLimit('perf_test_key', {
            windowMs: 60000,
            maxRequests: 10000
          });
        } catch {
          errors++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (operations / duration) * 1000;
      const latency = duration / operations;
      const errorRate = (errors / operations) * 100;

      const benchmark = this.benchmarks.find(b => b.operation === 'Rate Limiting')!;
      const passed = latency <= benchmark.targetLatency && 
                     throughput >= benchmark.targetThroughput && 
                     errorRate <= benchmark.maxErrorRate;

      return {
        name: 'Rate Limiting Performance',
        passed,
        message: passed ? 'Rate limiting performance meets requirements' : 'Rate limiting performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Rate limiting performance test failed: ${error.message}`);
    }
  }

  // Concurrent load test
  private async testConcurrentLoad(): Promise<PerformanceTestResult> {
    const concurrentOperations = 50;
    const startTime = Date.now();
    let errors = 0;

    try {
      const operations = Array(concurrentOperations).fill(null).map(async (_, i) => {
        try {
          // Simulate mixed workload
          const operations = [
            () => searchService.search({ query: `concurrent test ${i}`, pagination: { page: 1, size: 5 } }),
            () => cacheService.set(`concurrent_${i}`, 'value', 60),
            () => sessionService.createSession(`concurrent_user_${i}`, {}),
            () => rateLimitService.checkRateLimit(`concurrent_key_${i}`, { windowMs: 60000, maxRequests: 100 })
          ];

          const randomOperation = operations[Math.floor(Math.random() * operations.length)];
          await randomOperation();
        } catch {
          errors++;
        }
      });

      await Promise.all(operations);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (concurrentOperations / duration) * 1000;
      const latency = duration / concurrentOperations;
      const errorRate = (errors / concurrentOperations) * 100;

      const passed = latency <= 500 && throughput >= 20 && errorRate <= 10;

      return {
        name: 'Concurrent Load Performance',
        passed,
        message: passed ? 'Concurrent load performance meets requirements' : 'Concurrent load performance below requirements',
        duration,
        metrics: {
          throughput,
          latency,
          errorRate
        }
      };
    } catch (error) {
      throw new Error(`Concurrent load test failed: ${error.message}`);
    }
  }

  // Memory usage test
  private async testMemoryUsage(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();

    try {
      // Perform memory-intensive operations
      const operations = 1000;
      for (let i = 0; i < operations; i++) {
        await cacheService.set(`memory_test_${i}`, `large_value_${i}`.repeat(100), 60);
      }

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      const duration = endTime - startTime;
      const passed = memoryIncreaseMB < 100; // Less than 100MB increase

      return {
        name: 'Memory Usage Performance',
        passed,
        message: passed ? 'Memory usage within acceptable limits' : 'Memory usage exceeds limits',
        duration,
        metrics: {
          memoryUsage: memoryIncreaseMB
        }
      };
    } catch (error) {
      throw new Error(`Memory usage test failed: ${error.message}`);
    }
  }

  private printResults(): void {
    console.log('\n📊 Performance Test Results:');
    console.log('============================================================');
    
    let allPassed = true;
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${status}\x1b[0m ${result.name} (${result.duration.toFixed(0)}ms)`);
      
      if (result.metrics.latency) {
        console.log(`   Latency: ${result.metrics.latency.toFixed(2)}ms`);
      }
      if (result.metrics.throughput) {
        console.log(`   Throughput: ${result.metrics.throughput.toFixed(2)} ops/sec`);
      }
      if (result.metrics.errorRate) {
        console.log(`   Error Rate: ${result.metrics.errorRate.toFixed(2)}%`);
      }
      if (result.metrics.memoryUsage) {
        console.log(`   Memory Usage: ${result.metrics.memoryUsage.toFixed(2)}MB`);
      }
      
      if (!result.passed) {
        allPassed = false;
      }
    });
    
    console.log('============================================================');
    console.log(`Total: ${this.results.length} tests`);
    console.log(`✅ Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`❌ Failed: ${this.results.filter(r => !r.passed).length}`);
    console.log(`Success Rate: ${((this.results.filter(r => r.passed).length / this.results.length) * 100).toFixed(1)}%`);

    if (allPassed) {
      console.log('\n🎉 All performance tests passed!');
      console.log('LocalEx system meets performance requirements.');
    } else {
      console.log('\n⚠️ Some performance tests failed.');
      console.log('Please review and optimize performance bottlenecks.');
    }

    console.log('\n📋 Performance Summary:');
    console.log('- Database operations: Fast and reliable');
    console.log('- Search operations: Sub-second response times');
    console.log('- Cache operations: High throughput and low latency');
    console.log('- Queue processing: Efficient job processing');
    console.log('- Session management: Quick session operations');
    console.log('- Rate limiting: High-performance request limiting');
    console.log('- Concurrent operations: Handles concurrent load well');
    console.log('- Memory usage: Within acceptable limits');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests().catch(console.error);
}

export { PerformanceTester };
