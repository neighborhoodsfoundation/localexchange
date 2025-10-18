#!/usr/bin/env ts-node

/**
 * LocalEx Database Integrity and Performance Tests
 * Tests the database schema, triggers, and performance
 */

import { Pool } from 'pg';
import { databaseConfig } from '../src/config/database';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number | undefined;
}

class DatabaseTester {
  private db: Pool;
  private results: TestResult[] = [];

  constructor() {
    this.db = new Pool(databaseConfig);
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting LocalEx Database Tests...\n');

    // Schema Tests
    await this.testSchemaExists();
    await this.testTablesExist();
    await this.testIndexesExist();
    await this.testTriggersExist();

    // Integrity Tests
    await this.testDoubleEntryLedger();
    await this.testBalanceValidation();
    await this.testTransactionConsistency();

    // Performance Tests
    await this.testInsertPerformance();
    await this.testQueryPerformance();
    await this.testBalanceCalculationPerformance();

    // Helper Function Tests
    await this.testHelperFunctions();

    this.printResults();
    await this.db.end();
  }

  private async testSchemaExists(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.db.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'public'
      `);
      
      this.addResult('Schema Exists', result.rows.length > 0, 
        result.rows.length > 0 ? 'Public schema exists' : 'Public schema not found', 
        Date.now() - start);
    } catch (error) {
      this.addResult('Schema Exists', false, `Error: ${error}`);
    }
  }

  private async testTablesExist(): Promise<void> {
    const start = Date.now();
    const requiredTables = [
      'users', 'accounts', 'ledger_entries', 'items', 'trades', 
      'categories', 'system_settings', 'audit_log', 'migrations'
    ];

    try {
      const result = await this.db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);

      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      this.addResult('Required Tables Exist', missingTables.length === 0,
        missingTables.length === 0 
          ? `All ${requiredTables.length} required tables exist`
          : `Missing tables: ${missingTables.join(', ')}`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Required Tables Exist', false, `Error: ${error}`);
    }
  }

  private async testIndexesExist(): Promise<void> {
    const start = Date.now();
    const requiredIndexes = [
      'idx_users_email',
      'idx_accounts_user_id',
      'idx_ledger_entries_account_id',
      'idx_ledger_entries_transaction_id'
    ];

    try {
      const result = await this.db.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

      const existingIndexes = result.rows.map(row => row.indexname);
      const missingIndexes = requiredIndexes.filter(index => !existingIndexes.includes(index));
      
      this.addResult('Required Indexes Exist', missingIndexes.length === 0,
        missingIndexes.length === 0 
          ? `All ${requiredIndexes.length} required indexes exist`
          : `Missing indexes: ${missingIndexes.join(', ')}`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Required Indexes Exist', false, `Error: ${error}`);
    }
  }

  private async testTriggersExist(): Promise<void> {
    const start = Date.now();
    const requiredTriggers = [
      'trigger_validate_debit_balance',
      'trigger_validate_transaction_consistency'
    ];

    try {
      const result = await this.db.query(`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
      `);

      const existingTriggers = result.rows.map(row => row.trigger_name);
      const missingTriggers = requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));
      
      this.addResult('Required Triggers Exist', missingTriggers.length === 0,
        missingTriggers.length === 0 
          ? `All ${requiredTriggers.length} required triggers exist`
          : `Missing triggers: ${missingTriggers.join(', ')}`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Required Triggers Exist', false, `Error: ${error}`);
    }
  }

  private async testDoubleEntryLedger(): Promise<void> {
    const start = Date.now();
    try {
      // Create test accounts
      const timestamp = Date.now();
      const userResult = await this.db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Test', 'User') 
        RETURNING id
      `, [`test-${timestamp}@example.com`]);
      const userId = userResult.rows[0].id;

      const accountResult = await this.db.query(`
        INSERT INTO accounts (user_id, type) 
        VALUES ($1, 'MAIN'), ($1, 'ESCROW') 
        RETURNING id
      `, [userId]);
      const account1Id = accountResult.rows[0].id;
      const account2Id = accountResult.rows[1].id;

      // Test balanced transaction
      const transactionId = 'test-transaction-' + Date.now();
      
      await this.db.query(`
        INSERT INTO ledger_entries (transaction_id, account_id, type, amount, description, idempotency_key)
        VALUES 
          ($1, $2, 'CREDIT', 100.00, 'Test credit', $1 || '_credit'),
          ($1, $3, 'DEBIT', 100.00, 'Test debit', $1 || '_debit')
      `, [transactionId, account1Id, account2Id]);

      // Verify balances
      const balanceResult = await this.db.query(`
        SELECT get_account_balance($1::UUID) as balance1, get_account_balance($2::UUID) as balance2
      `, [account1Id, account2Id]);

      const balance1 = parseFloat(balanceResult.rows[0].balance1);
      const balance2 = parseFloat(balanceResult.rows[0].balance2);

      // Clean up
      await this.db.query('DELETE FROM ledger_entries WHERE transaction_id = $1', [transactionId]);
      await this.db.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      this.addResult('Double Entry Ledger', 
        Math.abs(balance1 - balance2) < 0.01, // Should be equal (100 and -100)
        `Account 1 balance: ${balance1}, Account 2 balance: ${balance2}`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Double Entry Ledger', false, `Error: ${error}`);
    }
  }

  private async testBalanceValidation(): Promise<void> {
    const start = Date.now();
    try {
      // Create test user and account
      const timestamp = Date.now();
      const userResult = await this.db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Test', 'User') 
        RETURNING id
      `, [`test2-${timestamp}@example.com`]);
      const userId = userResult.rows[0].id;

      const accountResult = await this.db.query(`
        INSERT INTO accounts (user_id, type) 
        VALUES ($1, 'MAIN') 
        RETURNING id
      `, [userId]);
      const accountId = accountResult.rows[0].id;

      // Try to create a debit without sufficient balance (should fail)
      let failed = false;
      try {
        await this.db.query(`
          INSERT INTO ledger_entries (transaction_id, account_id, type, amount, description, idempotency_key)
          VALUES ($1, $2, 'DEBIT', 100.00, 'Test overdraft', $1)
        `, ['test-overdraft-' + Date.now(), accountId]);
      } catch (error) {
        failed = true; // Expected to fail
      }

      // Clean up
      await this.db.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      this.addResult('Balance Validation', failed,
        failed ? 'Correctly prevented overdraft' : 'Failed to prevent overdraft',
        Date.now() - start);
    } catch (error) {
      this.addResult('Balance Validation', false, `Error: ${error}`);
    }
  }

  private async testTransactionConsistency(): Promise<void> {
    const start = Date.now();
    try {
      // Test the transfer_credits function
      const timestamp = Date.now();
      const userResult = await this.db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Test', 'User') 
        RETURNING id
      `, [`test3-${timestamp}@example.com`]);
      const userId = userResult.rows[0].id;

      const accountResult = await this.db.query(`
        INSERT INTO accounts (user_id, type) 
        VALUES ($1, 'MAIN'), ($1, 'ESCROW') 
        RETURNING id
      `, [userId]);
      const account1Id = accountResult.rows[0].id;
      const account2Id = accountResult.rows[1].id;

      // Give account1 some credits first
      await this.db.query(`
        INSERT INTO ledger_entries (transaction_id, account_id, type, amount, description, idempotency_key)
        VALUES ($1, $2, 'CREDIT', 200.00, 'Initial credit', $1)
      `, ['initial-' + Date.now(), account1Id]);

      // Test transfer
      await this.db.query(`
        SELECT transfer_credits($1::UUID, $2::UUID, 50.00, 'Test transfer')
      `, [account1Id, account2Id]);

      // Check final balances
      const balanceResult = await this.db.query(`
        SELECT get_account_balance($1::UUID) as balance1, get_account_balance($2::UUID) as balance2
      `, [account1Id, account2Id]);

      const balance1 = parseFloat(balanceResult.rows[0].balance1);
      const balance2 = parseFloat(balanceResult.rows[0].balance2);

      // Clean up
      await this.db.query('DELETE FROM ledger_entries WHERE account_id IN ($1, $2)', [account1Id, account2Id]);
      await this.db.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      this.addResult('Transaction Consistency',
        balance1 === 150 && balance2 === 50,
        `Account 1 balance: ${balance1} (expected 150), Account 2 balance: ${balance2} (expected 50)`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Transaction Consistency', false, `Error: ${error}`);
    }
  }

  private async testInsertPerformance(): Promise<void> {
    const start = Date.now();
    try {
      const timestamp = Date.now();
      const userResult = await this.db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Perf', 'Test') 
        RETURNING id
      `, [`perf-${timestamp}@example.com`]);
      const userId = userResult.rows[0].id;

      const insertStart = Date.now();
      // Insert 100 ledger entries
      for (let i = 0; i < 100; i++) {
        const accountResult = await this.db.query(`
          INSERT INTO accounts (user_id, type) 
          VALUES ($1, 'MAIN') 
          RETURNING id
        `, [userId]);
        const accountId = accountResult.rows[0].id;

        await this.db.query(`
          INSERT INTO ledger_entries (transaction_id, account_id, type, amount, description, idempotency_key)
          VALUES ($1, $2, 'CREDIT', 10.00, 'Perf test', $1)
        `, [`perf-${i}-${Date.now()}`, accountId]);
      }
      const insertTime = Date.now() - insertStart;

      // Clean up
      await this.db.query('DELETE FROM ledger_entries WHERE description = $1', ['Perf test']);
      await this.db.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      this.addResult('Insert Performance',
        insertTime < 5000, // Should complete in under 5 seconds
        `Inserted 100 entries in ${insertTime}ms`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Insert Performance', false, `Error: ${error}`);
    }
  }

  private async testQueryPerformance(): Promise<void> {
    const start = Date.now();
    try {
      const queryStart = Date.now();
      
      // Test various queries
      await this.db.query('SELECT COUNT(*) FROM users');
      await this.db.query('SELECT COUNT(*) FROM accounts');
      await this.db.query('SELECT COUNT(*) FROM ledger_entries');
      await this.db.query('SELECT * FROM account_balances LIMIT 10');
      await this.db.query('SELECT * FROM transaction_summaries LIMIT 10');
      
      const queryTime = Date.now() - queryStart;

      this.addResult('Query Performance',
        queryTime < 1000, // Should complete in under 1 second
        `Executed 5 queries in ${queryTime}ms`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Query Performance', false, `Error: ${error}`);
    }
  }

  private async testBalanceCalculationPerformance(): Promise<void> {
    const start = Date.now();
    try {
      // Create test data
      const timestamp = Date.now();
      const userResult = await this.db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Balance', 'Test') 
        RETURNING id
      `, [`balance-${timestamp}@example.com`]);
      const userId = userResult.rows[0].id;

      const accountResult = await this.db.query(`
        INSERT INTO accounts (user_id, type) 
        VALUES ($1, 'MAIN') 
        RETURNING id
      `, [userId]);
      const accountId = accountResult.rows[0].id;

      // Insert multiple entries
      for (let i = 0; i < 50; i++) {
        await this.db.query(`
          INSERT INTO ledger_entries (transaction_id, account_id, type, amount, description, idempotency_key)
          VALUES ($1, $2, 'CREDIT', 1.00, 'Balance test', $1)
        `, [`balance-${i}-${Date.now()}`, accountId]);
      }

      const calcStart = Date.now();
      // Test balance calculation
      await this.db.query(`
        SELECT get_account_balance($1::UUID)
      `, [accountId]);
      const calcTime = Date.now() - calcStart;

      // Clean up
      await this.db.query('DELETE FROM ledger_entries WHERE description = $1', ['Balance test']);
      await this.db.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      this.addResult('Balance Calculation Performance',
        calcTime < 100, // Should complete in under 100ms
        `Calculated balance in ${calcTime}ms`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Balance Calculation Performance', false, `Error: ${error}`);
    }
  }

  private async testHelperFunctions(): Promise<void> {
    const start = Date.now();
    try {
      // Test if helper functions exist
      const result = await this.db.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_account_balance', 'transfer_credits', 'create_balanced_transaction')
      `);

      const existingFunctions = result.rows.map(row => row.routine_name);
      const requiredFunctions = ['get_account_balance', 'transfer_credits', 'create_balanced_transaction'];
      const missingFunctions = requiredFunctions.filter(func => !existingFunctions.includes(func));

      this.addResult('Helper Functions',
        missingFunctions.length === 0,
        missingFunctions.length === 0 
          ? `All ${requiredFunctions.length} helper functions exist`
          : `Missing functions: ${missingFunctions.join(', ')}`,
        Date.now() - start);
    } catch (error) {
      this.addResult('Helper Functions', false, `Error: ${error}`);
    }
  }

  private addResult(name: string, passed: boolean, message: string, duration?: number): void {
    this.results.push({ name, passed, message, duration });
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));

    let passed = 0;
    let failed = 0;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${status} ${result.name}${duration}`);
      console.log(`    ${result.message}\n`);
      
      if (result.passed) passed++;
      else failed++;
    });

    console.log('=' .repeat(60));
    console.log(`Total: ${this.results.length} tests`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Database is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DatabaseTester();
  tester.runAllTests().catch(console.error);
}

export { DatabaseTester };
