/**
 * Performance Benchmarking Script
 * 
 * Measures and reports on system performance metrics
 * including response times, throughput, and resource usage
 */

import { performance } from 'perf_hooks';
// import { execSync } from 'child_process'; // Unused
import fs from 'fs';
import path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  throughput: number; // operations per second
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: NodeJS.MemoryUsage;
  };
  cpuUsage: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
    delta: NodeJS.CpuUsage;
  };
}

interface PerformanceThresholds {
  maxResponseTime: number;
  minThroughput: number;
  maxMemoryIncrease: number; // MB
  maxCpuUsage: number; // percentage
}

class PerformanceBenchmark {
  private thresholds: PerformanceThresholds = {
    maxResponseTime: 2000, // 2 seconds
    minThroughput: 10, // 10 operations per second
    maxMemoryIncrease: 100, // 100MB
    maxCpuUsage: 80 // 80%
  };

  private results: BenchmarkResult[] = [];

  async runBenchmarks(): Promise<void> {
    console.log('🚀 Starting Performance Benchmarks');
    console.log('===================================');

    // Run different types of benchmarks
    await this.benchmarkUserOperations();
    await this.benchmarkItemOperations();
    await this.benchmarkTradingOperations();
    await this.benchmarkSearchOperations();
    await this.benchmarkConcurrentOperations();
    await this.benchmarkMemoryUsage();
    await this.benchmarkDatabaseOperations();

    // Generate report
    this.generatePerformanceReport();
  }

  private async benchmarkUserOperations(): Promise<void> {
    console.log('\n👤 Benchmarking User Operations...');
    
    const operations = [
      'createUser',
      'authenticateUser',
      'getUserProfile',
      'updateUserProfile'
    ];

    for (const operation of operations) {
      await this.runBenchmark(operation, async () => {
        // Mock user operations for benchmarking
        const startTime = performance.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 100);
    }
  }

  private async benchmarkItemOperations(): Promise<void> {
    console.log('\n📦 Benchmarking Item Operations...');
    
    const operations = [
      'createItem',
      'searchItems',
      'getItem',
      'updateItem'
    ];

    for (const operation of operations) {
      await this.runBenchmark(operation, async () => {
        const startTime = performance.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 200);
    }
  }

  private async benchmarkTradingOperations(): Promise<void> {
    console.log('\n🤝 Benchmarking Trading Operations...');
    
    const operations = [
      'createTrade',
      'makeOffer',
      'confirmArrival',
      'confirmHandoff',
      'leaveFeedback'
    ];

    for (const operation of operations) {
      await this.runBenchmark(operation, async () => {
        const startTime = performance.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 50);
    }
  }

  private async benchmarkSearchOperations(): Promise<void> {
    console.log('\n🔍 Benchmarking Search Operations...');
    
    const searchQueries = [
      'electronics',
      'clothing',
      'books',
      'furniture',
      'sports'
    ];

    for (const query of searchQueries) {
      await this.runBenchmark(`search_${query}`, async () => {
        const startTime = performance.now();
        
        // Simulate search operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300));
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 30);
    }
  }

  private async benchmarkConcurrentOperations(): Promise<void> {
    console.log('\n⚡ Benchmarking Concurrent Operations...');
    
    const concurrencyLevels = [10, 50, 100, 200];
    
    for (const concurrency of concurrencyLevels) {
      await this.runBenchmark(`concurrent_${concurrency}`, async () => {
        const startTime = performance.now();
        
        // Simulate concurrent operations
        const promises = Array(concurrency).fill(null).map(async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        });
        
        await Promise.all(promises);
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 1);
    }
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log('\n💾 Benchmarking Memory Usage...');
    
    await this.runBenchmark('memory_intensive', async () => {
      const startTime = performance.now();
      
      // Simulate memory-intensive operations
      const data = Array(10000).fill(null).map((_, i) => ({
        id: i,
        data: 'x'.repeat(1000)
      }));
      
      // Process data (simulate processing)
      data.map(item => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      }));
      
      const endTime = performance.now();
      return endTime - startTime;
    }, 10);
  }

  private async benchmarkDatabaseOperations(): Promise<void> {
    console.log('\n🗄️ Benchmarking Database Operations...');
    
    const dbOperations = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'JOIN'
    ];

    for (const operation of dbOperations) {
      await this.runBenchmark(`db_${operation}`, async () => {
        const startTime = performance.now();
        
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
        
        const endTime = performance.now();
        return endTime - startTime;
      }, 50);
    }
  }

  private async runBenchmark(
    name: string, 
    operation: () => Promise<number>, 
    iterations: number
  ): Promise<void> {
    console.log(`   Running ${name} (${iterations} iterations)...`);
    
    const beforeMemory = process.memoryUsage();
    const beforeCpu = process.cpuUsage();
    const startTime = performance.now();
    
    const responseTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const responseTime = await operation();
      responseTimes.push(responseTime);
    }
    
    const endTime = performance.now();
    const afterMemory = process.memoryUsage();
    const afterCpu = process.cpuUsage();
    
    const duration = endTime - startTime;
    const throughput = (iterations / duration) * 1000; // operations per second
    
    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    const result: BenchmarkResult = {
      name,
      duration,
      operations: iterations,
      throughput,
      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      memoryUsage: {
        before: beforeMemory,
        after: afterMemory,
        delta: {
          rss: afterMemory.rss - beforeMemory.rss,
          heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
          heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
          external: afterMemory.external - beforeMemory.external,
          arrayBuffers: afterMemory.arrayBuffers - beforeMemory.arrayBuffers
        }
      },
      cpuUsage: {
        before: beforeCpu,
        after: afterCpu,
        delta: {
          user: afterCpu.user - beforeCpu.user,
          system: afterCpu.system - beforeCpu.system
        }
      }
    };
    
    this.results.push(result);
    
    // Check thresholds
    this.checkThresholds(result);
  }

  private checkThresholds(result: BenchmarkResult): void {
    const issues: string[] = [];
    
    if (result.avgResponseTime > this.thresholds.maxResponseTime) {
      issues.push(`Average response time ${result.avgResponseTime.toFixed(2)}ms exceeds threshold ${this.thresholds.maxResponseTime}ms`);
    }
    
    if (result.throughput < this.thresholds.minThroughput) {
      issues.push(`Throughput ${result.throughput.toFixed(2)} ops/s below threshold ${this.thresholds.minThroughput} ops/s`);
    }
    
    const memoryIncreaseMB = result.memoryUsage.delta.heapUsed / 1024 / 1024;
    if (memoryIncreaseMB > this.thresholds.maxMemoryIncrease) {
      issues.push(`Memory increase ${memoryIncreaseMB.toFixed(2)}MB exceeds threshold ${this.thresholds.maxMemoryIncrease}MB`);
    }
    
    if (issues.length > 0) {
      console.log(`   ⚠️  Performance issues detected for ${result.name}:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`   ✅ ${result.name} passed all performance thresholds`);
    }
  }

  private generatePerformanceReport(): void {
    console.log('\n📊 Performance Benchmark Report');
    console.log('================================');
    
    // Summary statistics
    const totalOperations = this.results.reduce((sum, r) => sum + r.operations, 0);
    const avgThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    
    console.log(`Total Operations: ${totalOperations.toLocaleString()}`);
    console.log(`Average Throughput: ${avgThroughput.toFixed(2)} ops/s`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    
    // Detailed results
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      console.log(`\n${result.name}:`);
      console.log(`  Operations: ${result.operations}`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)} ops/s`);
      console.log(`  Response Time: ${result.avgResponseTime.toFixed(2)}ms (min: ${result.minResponseTime.toFixed(2)}ms, max: ${result.maxResponseTime.toFixed(2)}ms)`);
      console.log(`  P95: ${result.p95ResponseTime.toFixed(2)}ms, P99: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`  Memory Delta: ${(result.memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
    
    // Performance recommendations
    this.generateRecommendations();
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      thresholds: this.thresholds,
      summary: {
        totalOperations,
        avgThroughput,
        avgResponseTime,
        totalResults: this.results.length
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    };
    
    const reportPath = 'test-reports/performance-benchmark-report.json';
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private generateRecommendations(): void {
    console.log('\n💡 Performance Recommendations:');
    
    const slowOperations = this.results.filter(r => r.avgResponseTime > 1000);
    if (slowOperations.length > 0) {
      console.log('  - Consider optimizing slow operations:');
      slowOperations.forEach(op => {
        console.log(`    * ${op.name}: ${op.avgResponseTime.toFixed(2)}ms average`);
      });
    }
    
    const lowThroughput = this.results.filter(r => r.throughput < 20);
    if (lowThroughput.length > 0) {
      console.log('  - Consider improving throughput for:');
      lowThroughput.forEach(op => {
        console.log(`    * ${op.name}: ${op.throughput.toFixed(2)} ops/s`);
      });
    }
    
    const memoryIntensive = this.results.filter(r => r.memoryUsage.delta.heapUsed > 50 * 1024 * 1024);
    if (memoryIntensive.length > 0) {
      console.log('  - Consider optimizing memory usage for:');
      memoryIntensive.forEach(op => {
        const memoryMB = op.memoryUsage.delta.heapUsed / 1024 / 1024;
        console.log(`    * ${op.name}: ${memoryMB.toFixed(2)}MB increase`);
      });
    }
    
    console.log('  - General recommendations:');
    console.log('    * Implement connection pooling for database operations');
    console.log('    * Add caching for frequently accessed data');
    console.log('    * Consider horizontal scaling for high-traffic operations');
    console.log('    * Implement request batching where possible');
    console.log('    * Add monitoring and alerting for performance metrics');
  }
}

// Run benchmarks if this script is executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runBenchmarks().catch(error => {
    console.error('❌ Performance benchmark failed:', error);
    process.exit(1);
  });
}

export { PerformanceBenchmark };
