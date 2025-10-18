/**
 * Database Configuration for LocalEx
 * Implements PostgreSQL connection pooling and configuration
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | object;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export const databaseConfig: DatabaseConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  database: process.env['DB_NAME'] || 'localex_db',
  user: process.env['DB_USER'] || 'localex_user',
  password: process.env['DB_PASSWORD'] || '',
  ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env['DB_POOL_MAX'] || '20'),
  min: parseInt(process.env['DB_POOL_MIN'] || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create database connection pool
export const db = new Pool(databaseConfig);

// Database connection event handlers
db.on('connect', () => {
  console.log('✅ Database client connected');
});

db.on('error', (err) => {
  console.error('❌ Database client error:', err);
});

db.on('remove', () => {
  console.log('📤 Database client removed from pool');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database connections...');
  await db.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database connections...');
  await db.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

export default db;
