# LocalEx Database Documentation

## Overview

LocalEx uses PostgreSQL as its primary database with a sophisticated double-entry ledger system for financial transactions. The database is designed for high integrity, performance, and scalability.

## Architecture

### Database Components

1. **Core Tables**
   - `users` - User account information
   - `accounts` - Financial accounts (MAIN, ESCROW, GIFT)
   - `ledger_entries` - Immutable financial transaction records
   - `items` - Marketplace listings
   - `trades` - Trading transactions
   - `categories` - Item categorization

2. **System Tables**
   - `migrations` - Database schema version control
   - `system_settings` - Application configuration
   - `audit_log` - Change tracking and compliance

3. **Views**
   - `account_balances` - Real-time balance calculations
   - `transaction_summaries` - Transaction overviews

### Double-Entry Ledger System

The financial system implements strict double-entry accounting:

- **No Stored Balances**: Balances are calculated from ledger entries
- **Immutable Records**: All financial transactions are append-only
- **Balance Validation**: Triggers prevent negative balances
- **Transaction Consistency**: All transactions must balance (debits = credits)

## Key Features

### Financial Integrity

- **BEFORE INSERT Triggers**: Prevent overdrafts and invalid transactions
- **Balance Validation**: Real-time balance checking
- **Idempotency**: Duplicate transaction prevention
- **Audit Trail**: Complete transaction history

### Performance Optimizations

- **Strategic Indexes**: Optimized for common queries
- **Connection Pooling**: Efficient database connections
- **Prepared Statements**: SQL injection prevention
- **Query Optimization**: Efficient balance calculations

## Database Schema

### Core Tables Structure

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    -- ... additional fields
);

-- Accounts table (NO stored balance)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type account_type NOT NULL DEFAULT 'MAIN',
    -- ... additional fields
);

-- Ledger entries (immutable financial records)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL,
    type ledger_entry_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    -- ... additional fields
);
```

### Critical Functions

1. **`get_account_balance(account_uuid)`**
   - Calculates real-time account balance
   - Used by triggers and application logic

2. **`transfer_credits(from_account, to_account, amount, description)`**
   - Safely transfers credits between accounts
   - Includes balance validation

3. **`create_balanced_transaction(transaction_id, entries)`**
   - Creates multi-entry transactions
   - Ensures double-entry compliance

## Migration System

### Migration Files

- `001_simple_schema.sql` - Initial database schema
- `002_balance_triggers.sql` - Financial integrity triggers

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:status

# Rollback last migration
npm run db:rollback
```

## Security Considerations

### Data Protection

- **Password Hashing**: bcrypt with salt
- **SQL Injection Prevention**: Parameterized queries
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete change tracking

### Financial Security

- **Balance Validation**: Server-side enforcement
- **Transaction Atomicity**: All-or-nothing transactions
- **Idempotency Keys**: Duplicate prevention
- **Audit Trail**: Immutable transaction logs

## Performance Monitoring

### Key Metrics

- **Query Performance**: Response times for common queries
- **Balance Calculations**: Speed of balance computations
- **Connection Pool**: Database connection utilization
- **Index Usage**: Query optimization effectiveness

### Monitoring Queries

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;

-- Monitor connection pool
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

## Backup and Recovery

### Backup Strategy

1. **Daily Full Backups**: Complete database dumps
2. **Transaction Log Backups**: Point-in-time recovery
3. **Schema Backups**: Structure-only backups
4. **Configuration Backups**: Database settings

### Recovery Procedures

1. **Point-in-Time Recovery**: Restore to specific timestamp
2. **Schema Recovery**: Restore database structure
3. **Data Recovery**: Restore specific tables
4. **Configuration Recovery**: Restore database settings

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check PostgreSQL service status
   - Verify connection parameters
   - Check firewall settings

2. **Performance Issues**
   - Analyze slow queries
   - Check index usage
   - Monitor connection pool

3. **Data Integrity Issues**
   - Verify trigger functions
   - Check constraint violations
   - Validate transaction logs

### Diagnostic Queries

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('localex_db'));

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';

-- Check active connections
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;
```

## Development Guidelines

### Best Practices

1. **Always Use Transactions**: Wrap related operations
2. **Parameterized Queries**: Prevent SQL injection
3. **Proper Indexing**: Optimize query performance
4. **Error Handling**: Graceful failure management
5. **Testing**: Comprehensive test coverage

### Code Examples

```typescript
// Safe balance transfer
const transactionId = await db.query(`
  SELECT transfer_credits($1, $2, $3, $4)
`, [fromAccountId, toAccountId, amount, description]);

// Get account balance
const balance = await db.query(`
  SELECT get_account_balance($1)
`, [accountId]);
```

## API Reference

### Database Configuration

```typescript
// src/config/database.ts
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
```

### Connection Management

```typescript
import { Pool } from 'pg';
import { databaseConfig } from './config/database';

const db = new Pool(databaseConfig);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database connections...');
  await db.end();
});
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check database statistics and performance
2. **Monthly**: Review and optimize slow queries
3. **Quarterly**: Analyze and update indexes
4. **Annually**: Review and update security policies

### Contact Information

- **Database Administrator**: [Contact Info]
- **Development Team**: [Contact Info]
- **Emergency Support**: [Contact Info]

---

*Last Updated: October 2024*
*Version: 1.0.0*
