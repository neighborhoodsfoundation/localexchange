#!/usr/bin/env ts-node

/**
 * LocalEx Search Services Test Suite
 * Tests OpenSearch connection, search functionality, and index operations
 */

import { testOpenSearchConnection, checkOpenSearchHealth } from '../src/config/opensearch';
import { searchService } from '../src/services/search.service';
import { indexService } from '../src/services/index.service';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

class SearchTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting LocalEx Search Services Tests...\n');

    // Connection Tests
    await this.runTest('OpenSearch Connection', () => this.testOpenSearchConnection());
    await this.runTest('OpenSearch Health Check', () => this.testOpenSearchHealth());

    // Index Tests
    await this.runTest('Index Creation', () => this.testIndexCreation());
    await this.runTest('Index Statistics', () => this.testIndexStatistics());
    await this.runTest('Index Refresh', () => this.testIndexRefresh());

    // Search Service Tests
    await this.runTest('Search Service Health', () => this.testSearchServiceHealth());
    await this.runTest('Item Indexing', () => this.testItemIndexing());
    await this.runTest('Basic Search', () => this.testBasicSearch());
    await this.runTest('Advanced Search with Filters', () => this.testAdvancedSearch());
    await this.runTest('Search Suggestions', () => this.testSearchSuggestions());
    await this.runTest('Item Updates', () => this.testItemUpdates());
    await this.runTest('Item Deletion', () => this.testItemDeletion());
    await this.runTest('Bulk Indexing', () => this.testBulkIndexing());
    await this.runTest('Search Analytics', () => this.testSearchAnalytics());

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

  // Connection Tests
  private async testOpenSearchConnection(): Promise<boolean> {
    return await testOpenSearchConnection();
  }

  private async testOpenSearchHealth(): Promise<boolean> {
    return await checkOpenSearchHealth();
  }

  // Index Tests
  private async testIndexCreation(): Promise<boolean> {
    try {
      await indexService.createAllIndices();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testIndexStatistics(): Promise<boolean> {
    try {
      const stats = await indexService.getIndexStats();
      return stats && Object.keys(stats.indices).length > 0;
    } catch (error) {
      return false;
    }
  }

  private async testIndexRefresh(): Promise<boolean> {
    try {
      await indexService.refreshIndices();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Search Service Tests
  private async testSearchServiceHealth(): Promise<boolean> {
    try {
      const health = await searchService.healthCheck();
      return health.status !== 'error';
    } catch (error) {
      return false;
    }
  }

  private async testItemIndexing(): Promise<boolean> {
    try {
      const testItem = this.createTestItem();
      await searchService.indexItem(testItem);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testBasicSearch(): Promise<boolean> {
    try {
      const results = await searchService.search({
        query: 'test item',
        pagination: { page: 1, size: 10 }
      });
      
      return results.hits.length >= 0 && typeof results.total === 'number';
    } catch (error) {
      return false;
    }
  }

  private async testAdvancedSearch(): Promise<boolean> {
    try {
      const results = await searchService.search({
        query: 'test',
        filters: {
          priceMin: 0,
          priceMax: 1000,
          condition: ['new', 'used']
        },
        sort: [{ field: 'price', order: 'asc' }],
        pagination: { page: 1, size: 5 }
      });
      
      return results.hits.length >= 0 && typeof results.total === 'number';
    } catch (error) {
      return false;
    }
  }

  private async testSearchSuggestions(): Promise<boolean> {
    try {
      const suggestions = await searchService.getSuggestions('test', 5);
      return Array.isArray(suggestions);
    } catch (error) {
      return false;
    }
  }

  private async testItemUpdates(): Promise<boolean> {
    try {
      const testItem = this.createTestItem();
      await searchService.indexItem(testItem);
      
      // Update the item
      await searchService.updateItem(testItem.id, {
        title: 'Updated Test Item',
        price: 150
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testItemDeletion(): Promise<boolean> {
    try {
      const testItem = this.createTestItem();
      await searchService.indexItem(testItem);
      await searchService.deleteItem(testItem.id);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testBulkIndexing(): Promise<boolean> {
    try {
      const testItems = [
        this.createTestItem(),
        this.createTestItem(),
        this.createTestItem()
      ];
      
      await searchService.bulkIndexItems(testItems);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testSearchAnalytics(): Promise<boolean> {
    try {
      const timeRange = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      };
      
      const analytics = await searchService.getSearchAnalytics(timeRange);
      return Array.isArray(analytics);
    } catch (error) {
      return false;
    }
  }

  // Helper methods
  private createTestItem() {
    const id = uuidv4();
    return {
      id,
      title: `Test Item ${id.substring(0, 8)}`,
      description: 'This is a test item for search functionality testing',
      category: 'Electronics',
      price: Math.floor(Math.random() * 1000) + 10,
      condition: 'used',
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lon: -74.0060 + (Math.random() - 0.5) * 0.1,
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      images: [`https://example.com/image-${id}.jpg`],
      tags: ['test', 'electronics', 'sample'],
      userId: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active' as const,
      views: Math.floor(Math.random() * 100),
      favorites: Math.floor(Math.random() * 20)
    };
  }

  private printResults(): void {
    console.log('\n📊 Search Services Test Results:');
    console.log('============================================================');
    
    let allPassed = true;
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${status}\x1b[0m ${result.name} (${result.duration?.toFixed(0)}ms)`);
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
      console.log('\n🎉 All search services tests passed successfully!');
      console.log('LocalEx search infrastructure is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review and fix issues.');
      console.log('Search functionality may not work correctly.');
    }

    console.log('\n📋 Next Steps:');
    console.log('- Review failed tests and fix any issues');
    console.log('- Run performance tests with larger datasets');
    console.log('- Configure production OpenSearch cluster');
    console.log('- Set up monitoring and alerting');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SearchTester();
  tester.runAllTests().catch(console.error);
}

export { SearchTester };
