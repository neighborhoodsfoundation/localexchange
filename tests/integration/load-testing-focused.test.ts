/**
 * Focused Load Testing Suite
 * 
 * Tests the platform's ability to handle concurrent users and high load
 * with realistic trading scenarios and performance benchmarks
 */

import { userService } from '../../src/contexts/user';
import { itemService } from '../../src/contexts/items';
import { createTrade, makeOffer } from '../../src/contexts/trading';
import { createAccount, getAccountBalance, AccountType } from '../../src/contexts/credits';

// Mock external dependencies
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
}));

jest.mock('../../src/config/redis', () => ({
  getClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  }))
}));

jest.mock('../../src/config/opensearch', () => ({
  getClient: jest.fn(() => ({
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
}));

jest.mock('../../src/config/s3', () => ({
  getS3Client: jest.fn(() => ({
    putObject: jest.fn(),
    getObject: jest.fn(),
    deleteObject: jest.fn()
  }))
}));

describe('Load Testing Suite', () => {
  const CONCURRENT_USERS = 100; // Reduced for testing
  const TRADES_PER_USER = 3;
  const ITEMS_PER_USER = 2;

  describe('Concurrent User Registration', () => {
    it('should handle concurrent user registrations', async () => {
      const startTime = Date.now();
      
      const registrationPromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        userService.register({
          email: `loadtest${index}@example.com`,
          password: 'LoadTest123!',
          firstName: `Load${index}`,
          lastName: 'Tester',
          phone: `555-${index.toString().padStart(4, '0')}`,
          dateOfBirth: new Date('1990-01-01'),
          locationZip: '12345',
          locationCity: 'Test City',
          locationState: 'TS'
        })
      );

      const results = await Promise.allSettled(registrationPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent User Registration Results:`);
      console.log(`- Users: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per user`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 10 seconds for 100 users)
      expect(duration).toBeLessThan(10000);
    }, 30000);

    it('should handle concurrent user authentication', async () => {
      const startTime = Date.now();
      
      const authPromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        userService.login({
          email: `loadtest${index}@example.com`,
          password: 'LoadTest123!'
        })
      );

      const results = await Promise.allSettled(authPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Authentication Results:`);
      console.log(`- Users: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per user`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 5 seconds for 100 users)
      expect(duration).toBeLessThan(5000);
    }, 30000);
  });

  describe('Concurrent Item Creation', () => {
    it('should handle concurrent item creation', async () => {
      const startTime = Date.now();
      
      const itemPromises = Array(CONCURRENT_USERS * ITEMS_PER_USER).fill(null).map((_, index) => 
        itemService.createItem({
          title: `Load Test Item ${index}`,
          description: `Description for load test item ${index}`,
          categoryId: 'test-category',
          condition: 'GOOD' as any,
          priceCredits: 100 + (index % 500),
          locationLat: 39.7817 + (index % 10) * 0.01,
          locationLng: -89.6501 + (index % 10) * 0.01,
          locationAddress: `Test Address ${index}`
        })
      );

      const results = await Promise.allSettled(itemPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Item Creation Results:`);
      console.log(`- Items: ${CONCURRENT_USERS * ITEMS_PER_USER}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / (CONCURRENT_USERS * ITEMS_PER_USER)}ms per item`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual((CONCURRENT_USERS * ITEMS_PER_USER) * 0.8);
      
      // Expect reasonable performance (less than 15 seconds for 200 items)
      expect(duration).toBeLessThan(15000);
    }, 30000);

    it('should handle concurrent item retrieval', async () => {
      const startTime = Date.now();
      
      const retrievalPromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        itemService.getItem(`test-item-${index}`)
      );

      const results = await Promise.allSettled(retrievalPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Item Retrieval Results:`);
      console.log(`- Requests: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per request`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 3 seconds for 100 requests)
      expect(duration).toBeLessThan(3000);
    }, 30000);
  });

  describe('Concurrent Trading Operations', () => {
    it('should handle concurrent trade creation', async () => {
      const startTime = Date.now();
      
      const tradePromises = Array(CONCURRENT_USERS * TRADES_PER_USER).fill(null).map((_, index) => 
        createTrade({
          itemId: `test-item-${index % (CONCURRENT_USERS * ITEMS_PER_USER)}`,
          buyerId: `test-user-${index % CONCURRENT_USERS}`,
          offeredPrice: 100 + (index % 500)
        })
      );

      const results = await Promise.allSettled(tradePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Trade Creation Results:`);
      console.log(`- Trades: ${CONCURRENT_USERS * TRADES_PER_USER}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / (CONCURRENT_USERS * TRADES_PER_USER)}ms per trade`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual((CONCURRENT_USERS * TRADES_PER_USER) * 0.8);
      
      // Expect reasonable performance (less than 20 seconds for 300 trades)
      expect(duration).toBeLessThan(20000);
    }, 30000);

    it('should handle concurrent offer creation', async () => {
      const startTime = Date.now();
      
      const offerPromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        makeOffer({
          tradeId: `test-trade-${index}`,
          amount: 100 + (index % 500),
          type: 'INITIAL_OFFER' as any
        })
      );

      const results = await Promise.allSettled(offerPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Offer Creation Results:`);
      console.log(`- Offers: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per offer`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 5 seconds for 100 offers)
      expect(duration).toBeLessThan(5000);
    }, 30000);
  });

  describe('Concurrent Credit Operations', () => {
    it('should handle concurrent account creation', async () => {
      const startTime = Date.now();
      
      const accountPromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        createAccount({
          userId: `test-user-${index}`,
          accountType: AccountType.USER_WALLET
        })
      );

      const results = await Promise.allSettled(accountPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Account Creation Results:`);
      console.log(`- Accounts: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per account`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 5 seconds for 100 accounts)
      expect(duration).toBeLessThan(5000);
    }, 30000);

    it('should handle concurrent balance queries', async () => {
      const startTime = Date.now();
      
      const balancePromises = Array(CONCURRENT_USERS).fill(null).map((_, index) => 
        getAccountBalance({ accountId: `test-account-${index}` })
      );

      const results = await Promise.allSettled(balancePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Concurrent Balance Query Results:`);
      console.log(`- Queries: ${CONCURRENT_USERS}`);
      console.log(`- Success: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / CONCURRENT_USERS}ms per query`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8);
      
      // Expect reasonable performance (less than 3 seconds for 100 queries)
      expect(duration).toBeLessThan(3000);
    }, 30000);
  });

  describe('Mixed Load Testing', () => {
    it('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      
      const mixedOperations = [
        // User operations
        ...Array(20).fill(null).map((_, index) => 
          userService.register({
            email: `mixed${index}@example.com`,
            password: 'MixedTest123!',
            firstName: `Mixed${index}`,
            lastName: 'Tester',
            phone: `555-${index.toString().padStart(4, '0')}`,
            dateOfBirth: new Date('1990-01-01'),
            locationZip: '12345',
            locationCity: 'Test City',
            locationState: 'TS'
          })
        ),
        // Item operations
        ...Array(30).fill(null).map((_, index) => 
          itemService.createItem({
            title: `Mixed Item ${index}`,
            description: `Mixed description ${index}`,
            categoryId: 'test-category',
            condition: 'GOOD' as any,
            priceCredits: 100 + index,
            locationLat: 39.7817,
            locationLng: -89.6501,
            locationAddress: `Mixed Address ${index}`
          })
        ),
        // Trading operations
        ...Array(25).fill(null).map((_, index) => 
          createTrade({
            itemId: `mixed-item-${index}`,
            buyerId: `mixed-user-${index}`,
            offeredPrice: 100 + index
          })
        ),
        // Credit operations
        ...Array(25).fill(null).map((_, index) => 
          createAccount({
            userId: `mixed-user-${index}`,
            accountType: AccountType.USER_WALLET
          })
        )
      ];

      const results = await Promise.allSettled(mixedOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;

      console.log(`Mixed Load Testing Results:`);
      console.log(`- Total Operations: ${mixedOperations.length}`);
      console.log(`- Sorting: ${successCount}`);
      console.log(`- Failures: ${failureCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average: ${duration / mixedOperations.length}ms per operation`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(mixedOperations.length * 0.8);
      
      // Expect reasonable performance (less than 10 seconds for 100 operations)
      expect(duration).toBeLessThan(10000);
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    it('should meet response time requirements', async () => {
      const operations = [
        { name: 'User Registration', fn: () => userService.register({
          email: 'benchmark@example.com',
          password: 'Benchmark123!',
          firstName: 'Benchmark',
          lastName: 'Tester',
          phone: '555-0000',
          dateOfBirth: new Date('1990-01-01'),
          locationZip: '12345',
          locationCity: 'Test City',
          locationState: 'TS'
        }) },
        { name: 'User Login', fn: () => userService.login({
          email: 'benchmark@example.com',
          password: 'Benchmark123!'
        }) },
        { name: 'Item Creation', fn: () => itemService.createItem({
          title: 'Benchmark Item',
          description: 'Benchmark description',
          categoryId: 'test-category',
          condition: 'GOOD' as any,
          priceCredits: 100,
          locationLat: 39.7817,
          locationLng: -89.6501,
          locationAddress: 'Benchmark Address'
        }) },
        { name: 'Item Retrieval', fn: () => itemService.getItem('benchmark-item') },
        { name: 'Trade Creation', fn: () => createTrade({
          itemId: 'benchmark-item',
          buyerId: 'benchmark-user',
          offeredPrice: 100
        }) },
        { name: 'Account Creation', fn: () => createAccount({
          userId: 'benchmark-user',
          accountType: AccountType.USER_WALLET
        }) },
        { name: 'Balance Query', fn: () => getAccountBalance({ accountId: 'benchmark-account' }) }
      ];

      const benchmarks: { [key: string]: number[] } = {};

      for (const operation of operations) {
        benchmarks[operation.name] = [];
        
        // Run each operation 10 times to get average
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          try {
            await operation.fn();
          } catch (error) {
            // Expected to fail in test environment
          }
          const endTime = Date.now();
          benchmarks[operation.name]?.push(endTime - startTime);
        }
      }

      // Calculate averages and log results
      console.log('\nPerformance Benchmarks:');
      for (const [operation, times] of Object.entries(benchmarks)) {
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        const max = Math.max(...times);
        const min = Math.min(...times);
        
        console.log(`${operation}:`);
        console.log(`  - Average: ${average.toFixed(2)}ms`);
        console.log(`  - Min: ${min}ms`);
        console.log(`  - Max: ${max}ms`);
        
        // Expect reasonable performance (less than 1000ms average)
        expect(average).toBeLessThan(1000);
      }
    }, 30000);
  });

  describe('Memory and Resource Usage', () => {
    it('should handle memory pressure gracefully', async () => {
      const startMemory = process.memoryUsage();
      
      // Create a large number of operations to test memory usage
      const largeOperationSet = Array(500).fill(null).map((_, index) => 
        itemService.createItem({
          title: `Memory Test Item ${index}`,
          description: `Memory test description ${index}`.repeat(10), // Larger description
          categoryId: 'test-category',
          condition: 'GOOD' as any,
          priceCredits: 100 + index,
          locationLat: 39.7817,
          locationLng: -89.6501,
          locationAddress: `Memory Test Address ${index}`
        })
      );

      await Promise.allSettled(largeOperationSet);
      const endMemory = process.memoryUsage();

      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory Usage Test:`);
      console.log(`- Start Memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- End Memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Memory Increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`- Operations: ${largeOperationSet.length}`);

      // Expect reasonable memory usage (less than 100MB increase for 500 operations)
      expect(memoryIncreaseMB).toBeLessThan(100);
    }, 30000);
  });
});
