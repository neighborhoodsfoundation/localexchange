/**
 * Database Migration Script for LocalEx
 * Runs database migrations in order
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import db from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private db = db;

  async run(): Promise<void> {
    try {
      console.log('🚀 Starting LocalEx database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get all migration files
      const migrations = await this.getMigrationFiles();
      
      // Filter out already run migrations
      const pendingMigrations = await this.getPendingMigrations(migrations);
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      // Run each migration
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await this.db.query(createTableSQL);
    console.log('✅ Migrations table ready');
  }

  private async getMigrationFiles(): Promise<Migration[]> {
    const migrationsDir = join(__dirname, '../src/database/migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    const migrations: Migration[] = [];
    
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf8');
      const id = file.replace('.sql', '');
      
      migrations.push({
        id,
        filename: file,
        sql
      });
    }
    
    return migrations;
  }

  private async getPendingMigrations(migrations: Migration[]): Promise<Migration[]> {
    const result = await this.db.query('SELECT id FROM migrations');
    const executedIds = new Set(result.rows.map(row => row.id));
    
    return migrations.filter(migration => !executedIds.has(migration.id));
  }

  private async runMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Running migration: ${migration.filename}`);
    
    try {
      // Start transaction
      await this.db.query('BEGIN');
      
      // Execute migration SQL
      await this.db.query(migration.sql);
      
      // Record migration as executed
      await this.db.query(
        'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
        [migration.id, migration.filename]
      );
      
      // Commit transaction
      await this.db.query('COMMIT');
      
      console.log(`✅ Migration completed: ${migration.filename}`);
      
    } catch (error) {
      // Rollback transaction
      await this.db.query('ROLLBACK');
      console.error(`❌ Migration failed: ${migration.filename}`, error);
      throw error;
    }
  }

  async rollback(migrationId?: string): Promise<void> {
    try {
      console.log('🔄 Rolling back migrations...');
      
      if (migrationId) {
        // Rollback specific migration
        await this.rollbackToMigration(migrationId);
      } else {
        // Rollback last migration
        await this.rollbackLastMigration();
      }
      
      console.log('✅ Rollback completed');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }

  private async rollbackToMigration(migrationId: string): Promise<void> {
    const result = await this.db.query(
      'SELECT id, filename FROM migrations WHERE id > $1 ORDER BY executed_at DESC',
      [migrationId]
    );
    
    for (const migration of result.rows) {
      console.log(`🔄 Rolling back: ${migration.filename}`);
      await this.db.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
    }
  }

  private async rollbackLastMigration(): Promise<void> {
    const result = await this.db.query(
      'SELECT id, filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      const migration = result.rows[0];
      console.log(`🔄 Rolling back: ${migration.filename}`);
      await this.db.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
    }
  }

  async status(): Promise<void> {
    try {
      console.log('📊 Migration Status:');
      
      const result = await this.db.query(`
        SELECT 
          id,
          filename,
          executed_at
        FROM migrations 
        ORDER BY executed_at
      `);
      
      if (result.rows.length === 0) {
        console.log('No migrations have been executed');
      } else {
        console.table(result.rows);
      }
      
    } catch (error) {
      console.error('❌ Status check failed:', error);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }
}

// CLI Interface
async function main(): Promise<void> {
  const command = process.argv[2];
  const migrationRunner = new MigrationRunner();
  
  switch (command) {
    case 'migrate':
      await migrationRunner.run();
      break;
      
    case 'rollback':
      const migrationId = process.argv[3];
      await migrationRunner.rollback(migrationId);
      break;
      
    case 'status':
      await migrationRunner.status();
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run db:migrate     - Run pending migrations');
      console.log('  npm run db:rollback    - Rollback last migration');
      console.log('  npm run db:status      - Show migration status');
      console.log('');
      console.log('Examples:');
      console.log('  npm run db:migrate');
      console.log('  npm run db:rollback');
      console.log('  npm run db:rollback 001_initial_schema');
      console.log('  npm run db:status');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default MigrationRunner;
