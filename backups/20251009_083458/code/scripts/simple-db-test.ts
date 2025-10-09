#!/usr/bin/env ts-node

/**
 * Simple LocalEx Database Test
 * Basic functionality verification
 */

import { Pool } from 'pg';
import { databaseConfig } from '../src/config/database';

async function runSimpleTests(): Promise<void> {
  const db = new Pool(databaseConfig);
  
  console.log('🧪 Running Simple Database Tests...\n');

  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    const result = await db.query('SELECT version()');
    console.log('✅ Database connected:', result.rows[0].version.split(' ')[0]);

    // Test 2: Check tables exist
    console.log('\n2. Checking required tables...');
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`✅ Found ${tables.rows.length} tables:`, tables.rows.map(r => r.table_name).join(', '));

    // Test 3: Check triggers exist
    console.log('\n3. Checking triggers...');
    const triggers = await db.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    `);
    console.log(`✅ Found ${triggers.rows.length} triggers:`, triggers.rows.map(r => r.trigger_name).join(', '));

    // Test 4: Check functions exist
    console.log('\n4. Checking functions...');
    const functions = await db.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
    `);
    console.log(`✅ Found ${functions.rows.length} functions:`, functions.rows.map(r => r.routine_name).join(', '));

    // Test 5: Check views exist
    console.log('\n5. Checking views...');
    const views = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log(`✅ Found ${views.rows.length} views:`, views.rows.map(r => r.table_name).join(', '));

    // Test 6: Test balance calculation function
    console.log('\n6. Testing balance calculation function...');
    try {
      // Create a test user and account
      const timestamp = Date.now();
      const userResult = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name) 
        VALUES ($1, 'hash', 'Test', 'User') 
        RETURNING id
      `, [`test-${timestamp}@example.com`]);
      
      const accountResult = await db.query(`
        INSERT INTO accounts (user_id, type) 
        VALUES ($1, 'MAIN') 
        RETURNING id
      `, [userResult.rows[0].id]);
      
      const accountId = accountResult.rows[0].id;
      
      // Test balance calculation
      const balanceResult = await db.query(`
        SELECT get_account_balance($1)
      `, [accountId]);
      
      console.log(`✅ Balance calculation works: ${balanceResult.rows[0].get_account_balance}`);
      
      // Clean up
      await db.query('DELETE FROM accounts WHERE user_id = $1', [userResult.rows[0].id]);
      await db.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
      
    } catch (error) {
      console.log('❌ Balance calculation test failed:', (error as Error).message);
    }

    console.log('\n🎉 Basic database tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  runSimpleTests().catch(console.error);
}

export { runSimpleTests };
