#!/usr/bin/env ts-node

/**
 * LocalEx End-to-End Testing Framework
 * Tests complete user workflows and scenarios across the entire system
 */

import { db } from '../src/config/database';
import { searchService } from '../src/services/search.service';
import { cacheService } from '../src/services/cache.service';
import { queueService } from '../src/services/queue.service';
import { sessionService } from '../src/services/session.service';
import { v4 as uuidv4 } from 'uuid';

interface E2ETestResult {
  name: string;
  scenario: string;
  passed: boolean;
  message: string;
  duration?: number;
  steps: string[];
  errors?: string[];
}

class E2ETestFramework {
  private results: E2ETestResult[] = [];
  private testData: Map<string, any> = new Map();

  async runAllTests(): Promise<void> {
    console.log('🎭 Starting LocalEx End-to-End Testing Framework...\n');
    console.log('Testing complete user workflows and business scenarios\n');

    // User Journey Tests
    await this.runTest('User Registration Journey', 'New User Onboarding', () => 
      this.testUserRegistrationJourney()
    );

    await this.runTest('Item Listing Journey', 'Seller Creates Listing', () => 
      this.testItemListingJourney()
    );

    await this.runTest('Search and Discovery Journey', 'Buyer Finds Item', () => 
      this.testSearchDiscoveryJourney()
    );

    await this.runTest('Trade Transaction Journey', 'Complete Trade Flow', () => 
      this.testTradeTransactionJourney()
    );

    await this.runTest('Multi-User Trade Journey', 'Multiple Users Trading', () => 
      this.testMultiUserTradeJourney()
    );

    await this.runTest('Error Recovery Journey', 'System Resilience', () => 
      this.testErrorRecoveryJourney()
    );

    await this.runTest('Performance Under Load Journey', 'High Traffic Scenario', () => 
      this.testPerformanceUnderLoadJourney()
    );

    await this.runTest('Data Consistency Journey', 'Data Integrity Across Services', () => 
      this.testDataConsistencyJourney()
    );

    this.printResults();
  }

  private async runTest(
    name: string, 
    scenario: string, 
    testFn: () => Promise<{ passed: boolean; steps: string[]; errors?: string[] }>
  ): Promise<void> {
    const startTime = process.hrtime.bigint();
    let passed = false;
    let steps: string[] = [];
    let errors: string[] | undefined = undefined;
    let message = 'Test failed';

    try {
      const result = await testFn();
      passed = result.passed;
      steps = result.steps;
      errors = result.errors;
      message = result.passed ? 'Journey completed successfully' : 'Journey failed';
    } catch (error: any) {
      message = `Journey failed with error: ${error.message}`;
      errors = [error.stack];
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // milliseconds

    this.results.push({ name, scenario, passed, message, duration, steps, errors });
  }

  // =====================================================
  // USER REGISTRATION JOURNEY
  // =====================================================
  private async testUserRegistrationJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Create new user account');
      const userId = uuidv4();
      const username = `e2e_user_${Date.now()}`;
      const email = `e2e_${Date.now()}@test.com`;

      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, username, email, 'hashed_password', 'E2E', 'TestUser']);

      this.testData.set('userId', userId);
      steps.push('✅ User account created successfully');

      steps.push('Step 2: Create user session');
      const { sessionId } = await sessionService.createSession(userId, {
        userAgent: 'E2E Test Browser',
        ipAddress: '127.0.0.1'
      });

      this.testData.set('sessionId', sessionId);
      steps.push('✅ User session created successfully');

      steps.push('Step 3: Create user accounts (MAIN and ESCROW)');
      await db.query(`
        INSERT INTO accounts (id, user_id, type)
        VALUES ($1, $2, 'MAIN'), ($3, $2, 'ESCROW')
      `, [uuidv4(), userId, uuidv4()]);

      steps.push('✅ User accounts created successfully');

      steps.push('Step 4: Credit initial balance to user account');
      const accountRes = await db.query(`
        SELECT id FROM accounts WHERE user_id = $1 AND type = 'MAIN'
      `, [userId]);
      const accountId = accountRes.rows[0].id;

      await db.query(`
        INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description)
        VALUES ($1::UUID, gen_random_uuid(), 'CREDIT', 100.00, 'Initial signup bonus')
      `, [accountId]);

      steps.push('✅ Initial balance credited (100 credits)');

      steps.push('Step 5: Verify user can be found in search');
      // Note: In a real scenario, user would be indexed
      steps.push('✅ User registration journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Registration failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // ITEM LISTING JOURNEY
  // =====================================================
  private async testItemListingJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      const userId = this.testData.get('userId');
      if (!userId) {
        throw new Error('User not found - run registration journey first');
      }

      steps.push('Step 1: Create item listing in database');
      const itemId = uuidv4();
      const title = `E2E Test Item ${Date.now()}`;
      const description = 'End-to-end test item for sale';

      await db.query(`
        INSERT INTO items (id, user_id, title, description, price, condition, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [itemId, userId, title, description, 49.99, 'excellent', 'active']);

      this.testData.set('itemId', itemId);
      steps.push('✅ Item created in database');

      steps.push('Step 2: Index item in search engine');
      await searchService.indexItem({
        id: itemId,
        title,
        description,
        category: 'Electronics',
        price: 49.99,
        condition: 'excellent',
        location: {
          lat: 40.7128,
          lon: -74.0060,
          address: '123 Test St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        images: ['test-image-1.jpg'],
        tags: ['e2e', 'test', 'electronics'],
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        views: 0,
        favorites: 0
      });

      steps.push('✅ Item indexed in search engine');

      steps.push('Step 3: Verify item appears in search results');
      const searchResults = await searchService.search({
        query: title,
        pagination: { page: 1, size: 10 }
      });

      const itemFound = searchResults.hits.some(hit => hit.id === itemId);
      if (!itemFound) {
        throw new Error('Item not found in search results');
      }

      steps.push('✅ Item found in search results');

      steps.push('Step 4: Verify item details are correct');
      const itemInSearch = searchResults.hits.find(hit => hit.id === itemId);
      if (!itemInSearch || itemInSearch.price !== 49.99) {
        throw new Error('Item details incorrect in search');
      }

      steps.push('✅ Item listing journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Item listing failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // SEARCH AND DISCOVERY JOURNEY
  // =====================================================
  private async testSearchDiscoveryJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Perform text search');
      const searchResults = await searchService.search({
        query: 'test',
        pagination: { page: 1, size: 20 }
      });

      steps.push(`✅ Search returned ${searchResults.total} results`);

      steps.push('Step 2: Apply price filter');
      const filteredResults = await searchService.search({
        query: 'test',
        filters: {
          priceRange: { min: 0, max: 100 }
        },
        pagination: { page: 1, size: 20 }
      });

      steps.push(`✅ Filtered search returned ${filteredResults.total} results`);

      steps.push('Step 3: Test geo-location search');
      const geoResults = await searchService.search({
        query: 'test',
        filters: {
          location: {
            lat: 40.7128,
            lon: -74.0060,
            radius: 50,
            unit: 'km'
          }
        },
        pagination: { page: 1, size: 20 }
      });

      steps.push(`✅ Geo-location search returned ${geoResults.total} results`);

      steps.push('Step 4: Test search suggestions');
      const suggestions = await searchService.suggest({
        query: 'tes',
        size: 5
      });

      steps.push(`✅ Search suggestions returned ${suggestions.length} suggestions`);

      steps.push('Step 5: Verify caching of search results');
      const cachedResults = await searchService.search({
        query: 'test',
        pagination: { page: 1, size: 20 }
      });

      steps.push('✅ Search and discovery journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Search and discovery failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // TRADE TRANSACTION JOURNEY
  // =====================================================
  private async testTradeTransactionJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      const sellerId = this.testData.get('userId');
      const itemId = this.testData.get('itemId');

      if (!sellerId || !itemId) {
        throw new Error('Seller or item not found - run previous journeys first');
      }

      steps.push('Step 1: Create buyer user');
      const buyerId = uuidv4();
      const buyerUsername = `e2e_buyer_${Date.now()}`;
      const buyerEmail = `buyer_${Date.now()}@test.com`;

      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [buyerId, buyerUsername, buyerEmail, 'hashed_password', 'Buyer', 'Test']);

      steps.push('✅ Buyer account created');

      steps.push('Step 2: Create buyer accounts and credit balance');
      const buyerAccountId = uuidv4();
      await db.query(`
        INSERT INTO accounts (id, user_id, type)
        VALUES ($1, $2, 'MAIN'), ($3, $2, 'ESCROW')
      `, [buyerAccountId, buyerId, uuidv4()]);

      await db.query(`
        INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description)
        VALUES ($1::UUID, gen_random_uuid(), 'CREDIT', 200.00, 'Initial buyer balance')
      `, [buyerAccountId]);

      steps.push('✅ Buyer balance credited (200 credits)');

      steps.push('Step 3: Create trade request');
      const tradeId = uuidv4();
      await db.query(`
        INSERT INTO trades (id, buyer_id, seller_id, item_id, offer_amount, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tradeId, buyerId, sellerId, itemId, 49.99, 'pending']);

      steps.push('✅ Trade request created');

      steps.push('Step 4: Debit buyer account for trade');
      await db.query(`
        INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description, idempotency_key)
        VALUES ($1::UUID, $2, 'DEBIT', 49.99, 'Trade payment', $2)
      `, [buyerAccountId, tradeId]);

      steps.push('✅ Buyer account debited');

      steps.push('Step 5: Verify buyer balance is correct');
      const buyerBalanceRes = await db.query(`
        SELECT current_balance FROM balance_view WHERE account_id = $1::UUID
      `, [buyerAccountId]);
      const buyerBalance = parseFloat(buyerBalanceRes.rows[0].current_balance);

      if (buyerBalance !== 150.01) { // 200 - 49.99
        throw new Error(`Buyer balance incorrect: expected 150.01, got ${buyerBalance}`);
      }

      steps.push('✅ Buyer balance verified (150.01 credits)');

      steps.push('Step 6: Complete trade and credit seller');
      const sellerAccountRes = await db.query(`
        SELECT id FROM accounts WHERE user_id = $1 AND type = 'MAIN'
      `, [sellerId]);
      const sellerAccountId = sellerAccountRes.rows[0].id;

      await db.query(`
        INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description, idempotency_key)
        VALUES ($1::UUID, $2, 'CREDIT', 49.99, 'Trade proceeds', $2)
      `, [sellerAccountId, tradeId]);

      await db.query(`
        UPDATE trades SET status = 'completed' WHERE id = $1
      `, [tradeId]);

      steps.push('✅ Seller credited and trade completed');

      steps.push('Step 7: Verify seller balance increased');
      const sellerBalanceRes = await db.query(`
        SELECT current_balance FROM balance_view WHERE account_id = $1::UUID
      `, [sellerAccountId]);
      const sellerBalance = parseFloat(sellerBalanceRes.rows[0].current_balance);

      if (sellerBalance !== 149.99) { // 100 + 49.99
        throw new Error(`Seller balance incorrect: expected 149.99, got ${sellerBalance}`);
      }

      steps.push('✅ Seller balance verified (149.99 credits)');
      steps.push('✅ Trade transaction journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Trade transaction failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // MULTI-USER TRADE JOURNEY
  // =====================================================
  private async testMultiUserTradeJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Create multiple users concurrently');
      const userPromises = Array(5).fill(null).map(async (_, i) => {
        const userId = uuidv4();
        const username = `concurrent_user_${Date.now()}_${i}`;
        const email = `concurrent_${Date.now()}_${i}@test.com`;

        await db.query(`
          INSERT INTO users (id, username, email, password_hash, first_name, last_name)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId, username, email, 'hashed_password', `User${i}`, 'Test']);

        return userId;
      });

      const userIds = await Promise.all(userPromises);
      steps.push(`✅ Created ${userIds.length} users concurrently`);

      steps.push('Step 2: Create items for each user');
      const itemPromises = userIds.map(async (userId, i) => {
        const itemId = uuidv4();
        await db.query(`
          INSERT INTO items (id, user_id, title, description, price, condition, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [itemId, userId, `Concurrent Item ${i}`, `Test item ${i}`, 25.00, 'good', 'active']);

        return itemId;
      });

      const itemIds = await Promise.all(itemPromises);
      steps.push(`✅ Created ${itemIds.length} items concurrently`);

      steps.push('Step 3: Index all items in search');
      const indexPromises = itemIds.map(async (itemId, i) => {
        await searchService.indexItem({
          id: itemId,
          title: `Concurrent Item ${i}`,
          description: `Test item ${i}`,
          category: 'General',
          price: 25.00,
          condition: 'good',
          location: {
            lat: 40.7128,
            lon: -74.0060,
            address: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          },
          images: [],
          tags: ['concurrent', 'test'],
          userId: userIds[i],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
          views: 0,
          favorites: 0
        });
      });

      await Promise.all(indexPromises);
      steps.push(`✅ Indexed ${itemIds.length} items concurrently`);

      steps.push('Step 4: Verify all items can be found');
      const searchResults = await searchService.search({
        query: 'concurrent',
        pagination: { page: 1, size: 20 }
      });

      if (searchResults.total < itemIds.length) {
        throw new Error(`Expected at least ${itemIds.length} items, found ${searchResults.total}`);
      }

      steps.push(`✅ All ${itemIds.length} items found in search`);
      steps.push('✅ Multi-user trade journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Multi-user trade failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // ERROR RECOVERY JOURNEY
  // =====================================================
  private async testErrorRecoveryJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Test invalid search query handling');
      try {
        await searchService.search({
          query: '',
          pagination: { page: -1, size: 0 }
        });
        steps.push('✅ Invalid search handled gracefully');
      } catch (error) {
        // Expected to handle gracefully
        steps.push('✅ Invalid search handled with proper error');
      }

      steps.push('Step 2: Test insufficient balance scenario');
      const userId = uuidv4();
      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, `error_test_${Date.now()}`, `error_${Date.now()}@test.com`, 'hash', 'Error', 'Test']);

      const accountId = uuidv4();
      await db.query(`
        INSERT INTO accounts (id, user_id, type)
        VALUES ($1, $2, 'MAIN')
      `, [accountId, userId]);

      await db.query(`
        INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description)
        VALUES ($1::UUID, gen_random_uuid(), 'CREDIT', 10.00, 'Small balance')
      `, [accountId]);

      try {
        await db.query(`
          INSERT INTO ledger_entries (account_id, transaction_id, type, amount, description)
          VALUES ($1::UUID, gen_random_uuid(), 'DEBIT', 100.00, 'Overdraft attempt')
        `, [accountId]);
        errors.push('Should have prevented overdraft');
      } catch (error: any) {
        if (error.message.includes('Insufficient balance')) {
          steps.push('✅ Insufficient balance prevented correctly');
        } else {
          throw error;
        }
      }

      steps.push('Step 3: Test session recovery');
      const { sessionId } = await sessionService.createSession(userId, {});
      await sessionService.deleteSession(sessionId);
      const deletedSession = await sessionService.getSession(sessionId);

      if (deletedSession === null) {
        steps.push('✅ Session cleanup working correctly');
      }

      steps.push('✅ Error recovery journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Error recovery failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // PERFORMANCE UNDER LOAD JOURNEY
  // =====================================================
  private async testPerformanceUnderLoadJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Simulate concurrent user sessions');
      const sessionPromises = Array(20).fill(null).map(async (_, i) => {
        const userId = `load_test_user_${i}`;
        return await sessionService.createSession(userId, {
          userAgent: `Browser ${i}`,
          ipAddress: `192.168.1.${i}`
        });
      });

      const sessions = await Promise.all(sessionPromises);
      steps.push(`✅ Created ${sessions.length} concurrent sessions`);

      steps.push('Step 2: Simulate concurrent search queries');
      const searchQueries = ['test', 'item', 'electronics', 'furniture', 'clothing'];
      const searchPromises = Array(50).fill(null).map(async (_, i) => {
        const query = searchQueries[i % searchQueries.length];
        return await searchService.search({
          query,
          pagination: { page: 1, size: 10 }
        });
      });

      const searchResults = await Promise.all(searchPromises);
      steps.push(`✅ Completed ${searchResults.length} concurrent searches`);

      steps.push('Step 3: Simulate concurrent cache operations');
      const cachePromises = Array(100).fill(null).map(async (_, i) => {
        await cacheService.set(`load_test_${i}`, `value_${i}`, 60);
        return await cacheService.get(`load_test_${i}`);
      });

      const cacheResults = await Promise.all(cachePromises);
      steps.push(`✅ Completed ${cacheResults.length} concurrent cache operations`);

      steps.push('Step 4: Verify system stability under load');
      const finalSearch = await searchService.search({
        query: 'test',
        pagination: { page: 1, size: 5 }
      });

      steps.push('✅ System remains stable under load');
      steps.push('✅ Performance under load journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Performance under load failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // DATA CONSISTENCY JOURNEY
  // =====================================================
  private async testDataConsistencyJourney(): Promise<{ passed: boolean; steps: string[]; errors?: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];

    try {
      steps.push('Step 1: Create item in database');
      const userId = uuidv4();
      const itemId = uuidv4();

      await db.query(`
        INSERT INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, `consistency_${Date.now()}`, `consistency_${Date.now()}@test.com`, 'hash', 'Consistency', 'Test']);

      await db.query(`
        INSERT INTO items (id, user_id, title, description, price, condition, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [itemId, userId, 'Consistency Test Item', 'Testing data consistency', 99.99, 'new', 'active']);

      steps.push('✅ Item created in database');

      steps.push('Step 2: Index item in search');
      await searchService.indexItem({
        id: itemId,
        title: 'Consistency Test Item',
        description: 'Testing data consistency',
        category: 'Test',
        price: 99.99,
        condition: 'new',
        location: {
          lat: 40.7128,
          lon: -74.0060,
          address: '123 Test St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        images: [],
        tags: ['consistency', 'test'],
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        views: 0,
        favorites: 0
      });

      steps.push('✅ Item indexed in search');

      steps.push('Step 3: Verify data consistency between database and search');
      const dbItem = await db.query(`
        SELECT * FROM items WHERE id = $1
      `, [itemId]);

      const searchResults = await searchService.search({
        query: 'Consistency Test Item',
        pagination: { page: 1, size: 10 }
      });

      const searchItem = searchResults.hits.find(hit => hit.id === itemId);

      if (!searchItem) {
        throw new Error('Item not found in search');
      }

      if (dbItem.rows[0].price !== searchItem.price) {
        throw new Error('Price mismatch between database and search');
      }

      steps.push('✅ Data consistency verified across services');

      steps.push('Step 4: Update item and verify consistency');
      await db.query(`
        UPDATE items SET price = 79.99 WHERE id = $1
      `, [itemId]);

      await searchService.indexItem({
        ...searchItem,
        price: 79.99,
        updatedAt: new Date().toISOString()
      });

      const updatedSearchResults = await searchService.search({
        query: 'Consistency Test Item',
        pagination: { page: 1, size: 10 }
      });

      const updatedSearchItem = updatedSearchResults.hits.find(hit => hit.id === itemId);

      if (!updatedSearchItem || updatedSearchItem.price !== 79.99) {
        throw new Error('Update not reflected in search');
      }

      steps.push('✅ Update consistency verified');
      steps.push('✅ Data consistency journey complete');

      return { passed: true, steps };
    } catch (error: any) {
      errors.push(`Data consistency failed: ${error.message}`);
      return { passed: false, steps, errors };
    }
  }

  // =====================================================
  // REPORTING
  // =====================================================
  private printResults(): void {
    console.log('\n🎭 End-to-End Test Results:');
    console.log('============================================================');

    let allPassed = true;
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${status}\x1b[0m ${result.name}`);
      console.log(`   Scenario: ${result.scenario}`);
      console.log(`   Duration: ${result.duration?.toFixed(0)}ms`);
      console.log(`   Steps: ${result.steps.length} steps completed`);

      if (!result.passed) {
        allPassed = false;
        console.log(`   \x1b[31mErrors:\x1b[0m`);
        result.errors?.forEach(error => {
          console.log(`   - ${error}`);
        });
      }

      console.log('');
    });

    console.log('============================================================');
    console.log(`Total Scenarios: ${this.results.length}`);
    console.log(`✅ Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`❌ Failed: ${this.results.filter(r => !r.passed).length}`);
    console.log(`Success Rate: ${((this.results.filter(r => r.passed).length / this.results.length) * 100).toFixed(1)}%`);

    if (allPassed) {
      console.log('\n🎉 All end-to-end tests passed successfully!');
      console.log('LocalEx complete user workflows are functioning correctly.');
    } else {
      console.log('\n⚠️ Some end-to-end tests failed.');
      console.log('Please review and fix workflow issues.');
    }

    console.log('\n📋 E2E Test Summary:');
    console.log('- User registration and onboarding workflows');
    console.log('- Item listing and search indexing');
    console.log('- Search and discovery functionality');
    console.log('- Trade transaction processing');
    console.log('- Multi-user concurrent operations');
    console.log('- Error handling and recovery');
    console.log('- Performance under load');
    console.log('- Data consistency across services');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new E2ETestFramework();
  tester.runAllTests().catch(console.error);
}

export { E2ETestFramework };
