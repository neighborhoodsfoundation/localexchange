# LocalEx Engineer Setup Guide

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **Node.js**: Version 18+ (LTS recommended)
- **PostgreSQL**: Version 15+ (Version 18 installed)
- **Git**: Latest version
- **IDE**: VS Code (recommended) with TypeScript support

### Development Tools

- **Database Client**: pgAdmin, DBeaver, or VS Code PostgreSQL extension
- **API Testing**: Postman, Insomnia, or VS Code REST Client
- **Version Control**: Git with GitHub access

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/neighborhoodsfoundation/localexchange.git
cd localexchange
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Run PostgreSQL setup script (Windows)
.\scripts\fix-postgresql-path.ps1

# Run database migrations
npm run db:migrate

# Verify database setup
npm run db:status
```

### 4. Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=localex_db
DB_USER=localex_user
DB_PASSWORD=LocalEx123!
DB_SSL=false
```

### 5. Verify Installation

```bash
# Run database tests
npx ts-node scripts/simple-db-test.ts

# Check project status
npm run dev
```

## Development Environment

### Project Structure

```
localex/
├── src/
│   ├── config/          # Configuration files
│   ├── contexts/        # Domain contexts (User, Item, Trading, etc.)
│   ├── database/        # Database schemas and migrations
│   └── shared/          # Shared utilities and types
├── scripts/             # Build and utility scripts
├── tests/               # Test suites
├── docs/                # Documentation
└── dist/                # Build output
```

### Key Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode

# Database
npm run db:migrate       # Run database migrations
npm run db:status        # Check migration status
npm run db:rollback      # Rollback last migration

# Utilities
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run sync             # Sync with GitHub
```

### Database Management

#### Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: localex_db
- **Username**: localex_user
- **Password**: LocalEx123!

#### Useful Queries

```sql
-- Check database status
SELECT version();

-- View all tables
\dt

-- Check account balances
SELECT * FROM account_balances;

-- View recent transactions
SELECT * FROM transaction_summaries LIMIT 10;
```

## Development Workflow

### 1. Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow TypeScript best practices
   - Write tests for new functionality
   - Update documentation

3. **Test Changes**
   ```bash
   npm run test
   npm run lint
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

### 2. Database Changes

1. **Create Migration**
   ```bash
   # Create new migration file
   touch src/database/migrations/003_your_migration.sql
   ```

2. **Write Migration**
   ```sql
   -- Add your SQL changes
   ALTER TABLE users ADD COLUMN new_field VARCHAR(100);
   ```

3. **Test Migration**
   ```bash
   npm run db:migrate
   npm run db:status
   ```

### 3. Testing

#### Unit Tests

```typescript
// tests/unit/user.test.ts
import { UserService } from '../../src/contexts/user/user.service';

describe('UserService', () => {
  it('should create user successfully', async () => {
    // Test implementation
  });
});
```

#### Integration Tests

```typescript
// tests/integration/database.test.ts
import { db } from '../../src/config/database';

describe('Database Integration', () => {
  it('should connect to database', async () => {
    const result = await db.query('SELECT 1');
    expect(result.rows[0]).toEqual({ '?column?': 1 });
  });
});
```

## Architecture Overview

### Domain-Driven Design

The application is organized around business domains:

- **User Context**: User management, authentication, profiles
- **Item Context**: Marketplace listings, categories, search
- **Trading Context**: Trade negotiations, transactions
- **Credits Context**: Financial transactions, balances
- **Search Context**: Item discovery, filtering
- **Policy Context**: Business rules, compliance
- **Admin Context**: System administration
- **Worker Context**: Background jobs, notifications

### Technology Stack

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL with double-entry ledger
- **Cache**: Redis (Phase 1.2)
- **Search**: OpenSearch (Phase 1.3)
- **Storage**: AWS S3 (Phase 1.4)
- **Testing**: Jest with supertest
- **Linting**: ESLint with TypeScript rules

## Common Issues and Solutions

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:
1. Check PostgreSQL service is running
2. Verify connection parameters in `.env`
3. Check firewall settings
4. Ensure database user has proper permissions

```bash
# Check PostgreSQL status (Windows)
Get-Service postgresql*

# Test connection
psql -U localex_user -d localex_db -h localhost
```

### Migration Issues

**Problem**: Migration fails or database is out of sync

**Solutions**:
1. Check migration status: `npm run db:status`
2. Rollback problematic migration: `npm run db:rollback`
3. Reset database (development only):
   ```bash
   # Drop and recreate database
   dropdb -U localex_user localex_db
   createdb -U localex_user localex_db
   npm run db:migrate
   ```

### TypeScript Compilation Issues

**Problem**: TypeScript compilation errors

**Solutions**:
1. Check TypeScript version: `npx tsc --version`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check tsconfig.json configuration
4. Verify import paths and type definitions

### Performance Issues

**Problem**: Slow database queries or application performance

**Solutions**:
1. Analyze slow queries:
   ```sql
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC;
   ```
2. Check database indexes
3. Monitor connection pool usage
4. Profile application code

## Debugging

### Database Debugging

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Monitor slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Application Debugging

```typescript
// Enable debug logging
process.env.DEBUG = 'localex:*';

// Database query logging
db.on('query', (query) => {
  console.log('Query:', query.text);
  console.log('Parameters:', query.values);
});
```

### VS Code Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug LocalEx",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Best Practices

### Code Standards

1. **TypeScript**: Use strict mode, proper typing
2. **Error Handling**: Comprehensive error handling with proper logging
3. **Security**: Input validation, SQL injection prevention
4. **Performance**: Efficient queries, proper indexing
5. **Testing**: Unit tests, integration tests, end-to-end tests

### Database Best Practices

1. **Transactions**: Always use transactions for related operations
2. **Indexes**: Strategic indexing for query performance
3. **Constraints**: Proper foreign keys and check constraints
4. **Migrations**: Incremental, reversible migrations
5. **Backups**: Regular backups and recovery testing

### Git Workflow

1. **Branch Naming**: `feature/`, `bugfix/`, `hotfix/`
2. **Commit Messages**: Conventional commits format
3. **Pull Requests**: Descriptive PR descriptions
4. **Code Review**: Peer review for all changes
5. **Documentation**: Update docs with code changes

## Resources

### Documentation

- [Database Documentation](../database/README.md)
- [API Documentation](../api/README.md)
- [Architecture Overview](../architecture/system-overview.md)
- [Deployment Guide](../deployment/README.md)

### External Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Support

- **Team Chat**: [Slack/Discord Channel]
- **Issue Tracker**: [GitHub Issues]
- **Documentation**: [Internal Wiki]
- **Emergency Contact**: [Contact Information]

---

*Last Updated: October 2024*
*Version: 1.0.0*
