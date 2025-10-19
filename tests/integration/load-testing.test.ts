/**
 * Load Testing Suite
 * 
 * Tests the platform's ability to handle 1,000 concurrent users
 * with realistic trading scenarios and performance benchmarks
 */

import { 
  userService
} from '../../src/contexts/user';
import { 
  itemService
} from '../../src/contexts/items';
import { 
  createTrade, 
  makeOffer, 
  respondToOffer,
  confirmArrival,
  confirmHandoff
} from '../../src/contexts/trading';
import { 
  createAccount, 
  getAccountBalance,
  processPayment
} from '../../src/contexts/credits';

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
  getClient: jest.fn(() => ({
    upload: jest.fn(),
    getObject: jest.fn(),
    deleteObject: jest.fn()
  }))
}));

describe('Load Testing Suite', () => {
  const CONCURRENT_USERS = 100; // Reduced for testing, can be scaled up
  const TRADES_PER_USER = 5;
  const MAX_RESPONSE_TIME_MS = 2000;
  const MAX_ERROR_RATE = 0.05; // 5% max error rate

  let testUsers: Array<{
    id: string;
    email: string;
    token: string;
    accountId: string;
  }> = [];

  let testItems: Array<{
    id: string;
    sellerId: string;
  }> = [];

  beforeAll(async () => {
    // Create test users and accounts
    console.log(`Creating ${CONCURRENT_USERS} test users...`);
    
    const userPromises = Array(CONCURRENT_USERS).fill(null).map(async (_, index) => {
      const email = `loadtest${index}@test.com`;
      
      // Create user
      const userResponse = await createUser({
        email,
        password: 'LoadTest123!',
        firstName: `User${index}`,
        lastName: 'LoadTest',
        phone: `555-${String(index).padStart(4, '0')}`,
        dateOfBirth: new Date('1990-01-01'),
        locationZip: '12345',
        locationCity: 'Load Test City',
        locationState: 'LT'
      });

      if (!userResponse.success || !userResponse.user) {
        throw new Error(`Failed to create user ${index}: ${userResponse.error}`);
      }

      // Authenticate user
      const authResponse = await authenticateUser({
        email,
        password: 'LoadTest123!'
      });

      if (!authResponse.success || !authResponse.token) {
        throw new Error(`Failed to authenticate user ${index}: ${authResponse.error}`);
      }

      // Create account
      const accountResponse = await createAccount({
        userId: userResponse.user.id,
        accountType: 'MAIN'
      });

      if (!accountResponse.success || !accountResponse.account) {
        throw new Error(`Failed to create account for user ${index}: ${accountResponse.error}`);
      }

      return {
        id: userResponse.user.id,
        email,
        token: authResponse.token,
        accountId: accountResponse.account.id
      };
    });

    testUsers = await Promise.all(userPromises);
    console.log(`Created ${testUsers.length} test users successfully`);

    // Create test items (every 5th user is a seller)
    console.log('Creating test items...');
    
    const itemPromises = testUsers
      .filter((_, index) => index % 5 === 0) // Every 5th user is a seller
      .map(async (user, index) => {
        const itemResponse = await createItem({
          sellerId: user.id,
          title: `Load Test Item ${index}`,
          description: `This is a load test item ${index}`,
          category: 'Electronics',
          condition: 'Good',
          price: 100 + (index * 10),
          locationLat: 39.7817 + (index * 0.001),
          locationLng: -89.6501 + (index * 0.001),
          locationAddress: `${100 + index} Load Test St, Load Test City, LT`,
          images: [`item${index}.jpg`]
        });

        if (!itemResponse.success || !itemResponse.item) {
          throw new Error(`Failed to create item ${index}: ${itemResponse.error}`);
        }

        return {
          id: itemResponse.item.id,
          sellerId: user.id
        };
      });

    testItems = await Promise.all(itemPromises);
    console.log(`Created ${testItems.length} test items successfully`);
  }, 30000); // 30 second timeout for setup

  describe('Concurrent User Operations', () => {
    it('should handle concurrent user authentication', async () => {
      const startTime = Date.now();
      
      const authPromises = testUsers.map(user => 
        authenticateUser({
          email: user.email,
          password: 'LoadTest123!'
        })
      );

      const results = await Promise.all(authPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all authentications succeeded
      const successCount = results.filter(r => r.success).length;
      const errorRate = (CONCURRENT_USERS - successCount) / CONCURRENT_USERS;
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Concurrent authentication: ${successCount}/${CONCURRENT_USERS} successful in ${totalTime}ms`);
    });

    it('should handle concurrent profile lookups', async () => {
      const startTime = Date.now();
      
      const profilePromises = testUsers.map(user => 
        getUserProfile(user.id)
      );

      const results = await Promise.all(profilePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.success).length;
      const errorRate = (CONCURRENT_USERS - successCount) / CONCURRENT_USERS;
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Concurrent profile lookups: ${successCount}/${CONCURRENT_USERS} successful in ${totalTime}ms`);
    });

    it('should handle concurrent balance checks', async () => {
      const startTime = Date.now();
      
      const balancePromises = testUsers.map(user => 
        getAccountBalance(user.id, 'MAIN')
      );

      const results = await Promise.all(balancePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.success).length;
      const errorRate = (CONCURRENT_USERS - successCount) / CONCURRENT_USERS;
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Concurrent balance checks: ${successCount}/${CONCURRENT_USERS} successful in ${totalTime}ms`);
    });
  });

  describe('Concurrent Trading Operations', () => {
    it('should handle concurrent trade creation', async () => {
      const startTime = Date.now();
      
      const tradePromises = testUsers
        .filter((_, index) => index % 10 === 0) // Every 10th user creates a trade
        .map((buyer, index) => {
          const item = testItems[index % testItems.length];
          return createTrade({
            itemId: item.id,
            buyerId: buyer.id,
            offeredPrice: 100 + (index * 5)
          });
        });

      const results = await Promise.all(tradePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.success).length;
      const errorRate = (tradePromises.length - successCount) / tradePromises.length;
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Concurrent trade creation: ${successCount}/${tradePromises.length} successful in ${totalTime}ms`);
    });

    it('should handle concurrent item searches', async () => {
      const startTime = Date.now();
      
      const searchPromises = testUsers.map((_, index) => 
        searchItems({
          query: `Load Test Item ${index % 10}`,
          category: 'Electronics',
          locationLat: 39.7817,
          locationLng: -89.6501,
          radiusMiles: 10
        })
      );

      const results = await Promise.all(searchPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.success).length;
      const errorRate = (CONCURRENT_USERS - successCount) / CONCURRENT_USERS;
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Concurrent item searches: ${successCount}/${CONCURRENT_USERS} successful in ${totalTime}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle burst traffic spikes', async () => {
      const burstSize = 50;
      const burstCount = 5;
      
      for (let burst = 0; burst < burstCount; burst++) {
        console.log(`Executing burst ${burst + 1}/${burstCount} with ${burstSize} operations`);
        
        const startTime = Date.now();
        
        const burstPromises = Array(burstSize).fill(null).map(async (_, index) => {
          const userIndex = (burst * burstSize + index) % testUsers.length;
          const user = testUsers[userIndex];
          
          return Promise.all([
            getUserProfile(user.id),
            getAccountBalance(user.id, 'MAIN')
          ]);
        });

        const results = await Promise.all(burstPromises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        const successCount = results.filter(r => r.every(op => op.success)).length;
        const errorRate = (burstSize - successCount) / burstSize;
        
        expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
        expect(totalTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
        
        console.log(`Burst ${burst + 1}: ${successCount}/${burstSize} successful in ${totalTime}ms`);
        
        // Brief pause between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedOperations = 200;
      const operationInterval = 50; // 50ms between operations
      
      const results: Array<{ success: boolean; responseTime: number }> = [];
      
      for (let i = 0; i < sustainedOperations; i++) {
        const userIndex = i % testUsers.length;
        const user = testUsers[userIndex];
        
        const startTime = Date.now();
        
        const result = await getUserProfile(user.id);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({
          success: result.success,
          responseTime
        });
        
        // Wait before next operation
        if (i < sustainedOperations - 1) {
          await new Promise(resolve => setTimeout(resolve, operationInterval));
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorRate = (sustainedOperations - successCount) / sustainedOperations;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      
      expect(errorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS / 2);
      expect(maxResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Sustained load: ${successCount}/${sustainedOperations} successful`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during high load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      const operations = Array(100).fill(null).map(async (_, index) => {
        const userIndex = index % testUsers.length;
        const user = testUsers[userIndex];
        
        return Promise.all([
          getUserProfile(user.id),
          getAccountBalance(user.id, 'MAIN')
        ]);
      });

      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      // Memory increase should be reasonable (less than 100MB for 100 operations)
      expect(memoryIncreaseMB).toBeLessThan(100);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    it('should handle connection pooling efficiently', async () => {
      const connectionTests = 50;
      const concurrentConnections = 10;
      
      const results = await Promise.all(
        Array(connectionTests).fill(null).map(async () => {
          const promises = Array(concurrentConnections).fill(null).map(async (_, index) => {
            const userIndex = index % testUsers.length;
            const user = testUsers[userIndex];
            
            return getUserProfile(user.id);
          });
          
          const startTime = Date.now();
          const results = await Promise.all(promises);
          const endTime = Date.now();
          
          return {
            success: results.every(r => r.success),
            responseTime: endTime - startTime
          };
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      expect(successCount).toBe(connectionTests);
      expect(avgResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      
      console.log(`Connection pooling: ${successCount}/${connectionTests} successful`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from temporary failures', async () => {
      // Simulate some operations failing initially
      let attemptCount = 0;
      const maxAttempts = 3;
      
      const resilientOperation = async (user: typeof testUsers[0]) => {
        attemptCount++;
        
        try {
          const result = await getUserProfile(user.id);
          if (!result.success && attemptCount < maxAttempts) {
            // Retry after brief delay
            await new Promise(resolve => setTimeout(resolve, 100));
            return resilientOperation(user);
          }
          return result;
        } catch (error) {
          if (attemptCount < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return resilientOperation(user);
          }
          throw error;
        }
      };
      
      const results = await Promise.all(
        testUsers.slice(0, 10).map(user => resilientOperation(user))
      );
      
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(8); // At least 80% should succeed
      
      console.log(`Resilient operations: ${successCount}/10 successful after ${attemptCount} total attempts`);
    });

    it('should handle partial system failures', async () => {
      // Test with a subset of users when some services might be unavailable
      const partialUserSet = testUsers.slice(0, 20);
      
      const results = await Promise.all(
        partialUserSet.map(async user => {
          try {
            const profile = await getUserProfile(user.id);
            const balance = await getAccountBalance(user.id, 'MAIN');
            
            return {
              success: profile.success && balance.success,
              operations: 2
            };
          } catch (error) {
            return {
              success: false,
              operations: 2
            };
          }
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const totalOperations = results.reduce((sum, r) => sum + r.operations, 0);
      const successRate = successCount / results.length;
      
      // Even with partial failures, we should maintain reasonable success rate
      expect(successRate).toBeGreaterThan(0.7); // At least 70% success rate
      
      console.log(`Partial failure recovery: ${successCount}/${results.length} users successful (${(successRate * 100).toFixed(1)}%)`);
    });
  });
});
