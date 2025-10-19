# LocalEx Test Execution Guide

## Overview

This guide provides comprehensive instructions for running all types of tests in the LocalEx platform. Our testing strategy includes unit tests, integration tests, performance tests, and coverage audits across all system components.

## Quick Start

### Run All Tests
```bash
# Execute complete test suite
npm run test:all
```

### Run Individual Test Categories
```bash
# Coverage audit
npm run test:coverage-audit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance
```

## Test Categories

### 1. Coverage Audit Tests

**Purpose**: Analyze current test coverage and identify gaps across all phases.

**Command**:
```bash
npm run test:coverage-audit
```

**What It Tests**:
- Current test coverage for each phase
- Missing test implementations
- Coverage gaps and recommendations
- Critical areas requiring attention

**Expected Output**:
```
🔍 Starting LocalEx Test Coverage Audit...

📊 Phase Coverage Summary:
---------------------------
✅ Phase 1.1 - Data Layer: 92%
   Unit: 95% | Integration: 90% | E2E: 85%
   Test Files: scripts/test-database.ts, scripts/simple-db-test.ts

✅ Phase 1.2 - Redis Services: 87%
   Unit: 90% | Integration: 85% | E2E: 80%
   Test Files: scripts/test-redis-services.ts

✅ Phase 1.3 - OpenSearch Integration: 87%
   Unit: 90% | Integration: 85% | E2E: 80%
   Test Files: scripts/test-search-services.ts, scripts/setup-search-indices.ts

❌ Phase 1.4 - AWS S3 Storage: 0%
   Unit: 0% | Integration: 0% | E2E: 0%
   Test Files: 

📄 Coverage audit report saved to: docs/testing/coverage-audit-report.json
```

### 2. Integration Tests

**Purpose**: Test all services working together as a complete system.

**Prerequisites**:
- All services must be running (Database, Redis, OpenSearch)
- Test data should be available

**Command**:
```bash
npm run test:integration
```

**What It Tests**:
- Service connectivity across all components
- Database-Search integration
- Cache-Search integration
- Queue-Database integration
- Session-Cache integration
- Rate limiting integration
- Complete user workflows
- Performance under normal load
- Error handling across services

**Expected Output**:
```
🧪 Starting LocalEx Integration Tests...

⏳ Waiting for all services to be ready...
✅ Database is ready
✅ Redis is ready
✅ OpenSearch is ready

📊 Integration Test Results:
============================================================
✅ PASS Service Connectivity (245ms)
✅ PASS Database-Search Integration (1234ms)
✅ PASS Cache-Search Integration (456ms)
✅ PASS Queue-Database Integration (789ms)
✅ PASS Session-Cache Integration (234ms)
✅ PASS Rate Limiting Integration (123ms)
✅ PASS Complete User Workflow (2345ms)
✅ PASS Performance Integration (567ms)
✅ PASS Error Handling Integration (345ms)
============================================================
Total: 9 tests
✅ Passed: 9
❌ Failed: 0
Success Rate: 100.0%

🎉 All integration tests passed successfully!
```

### 3. Performance Tests

**Purpose**: Validate system performance meets requirements under various load conditions.

**Command**:
```bash
npm run test:performance
```

**What It Tests**:
- Database query performance
- Search query performance
- Cache read/write performance
- Queue processing performance
- Session management performance
- Rate limiting performance
- Concurrent load handling
- Memory usage efficiency

**Performance Targets**:
- Database queries: <50ms, 100+ ops/sec
- Search queries: <200ms, 50+ ops/sec
- Cache operations: <10ms, 1000+ ops/sec
- Queue processing: <100ms, 100+ ops/sec
- Session management: <25ms, 200+ ops/sec
- Rate limiting: <5ms, 2000+ ops/sec

**Expected Output**:
```
🚀 Starting LocalEx Performance Tests...

📊 Performance Test Results:
============================================================
✅ PASS Database Query Performance (1250ms)
   Latency: 12.50ms
   Throughput: 80.00 ops/sec
   Error Rate: 0.00%

✅ PASS Search Query Performance (8500ms)
   Latency: 170.00ms
   Throughput: 5.88 ops/sec
   Error Rate: 0.00%

✅ PASS Cache Read Performance (125ms)
   Latency: 0.13ms
   Throughput: 8000.00 ops/sec
   Error Rate: 0.00%

✅ PASS Cache Write Performance (250ms)
   Latency: 0.50ms
   Throughput: 2000.00 ops/sec
   Error Rate: 0.00%

✅ PASS Queue Processing Performance (5000ms)
   Latency: 50.00ms
   Throughput: 20.00 ops/sec
   Error Rate: 0.00%

✅ PASS Session Management Performance (1000ms)
   Latency: 5.00ms
   Throughput: 200.00 ops/sec
   Error Rate: 0.00%

✅ PASS Rate Limiting Performance (100ms)
   Latency: 0.05ms
   Throughput: 20000.00 ops/sec
   Error Rate: 0.00%

✅ PASS Concurrent Load Performance (2500ms)
   Latency: 50.00ms
   Throughput: 20.00 ops/sec
   Error Rate: 0.00%

✅ PASS Memory Usage Performance (5000ms)
   Memory Usage: 45.23MB
============================================================
Total: 9 tests
✅ Passed: 9
❌ Failed: 0
Success Rate: 100.0%

🎉 All performance tests passed!
```

## Phase-Specific Tests

### Phase 1.1 - Database Layer Tests

**Individual Tests**:
```bash
# Database connectivity and basic operations
npm run db:migrate
npm run db:status

# Comprehensive database tests
ts-node scripts/test-database.ts

# Quick database verification
ts-node scripts/simple-db-test.ts
```

**Test Coverage**:
- ✅ Schema creation and validation
- ✅ Trigger functionality (balance validation)
- ✅ Transaction integrity
- ✅ Performance benchmarks
- ✅ Data consistency checks

### Phase 1.2 - Redis Services Tests

**Individual Tests**:
```bash
# Redis services comprehensive testing
npm run redis:test
```

**Test Coverage**:
- ✅ Cache service functionality
- ✅ Queue service with idempotency
- ✅ Rate limiting algorithms
- ✅ Session management
- ✅ Redis connection health
- ✅ Performance benchmarks

### Phase 1.3 - OpenSearch Integration Tests

**Individual Tests**:
```bash
# Search services comprehensive testing
npm run search:test

# Search indices setup and verification
npm run search:setup
```

**Test Coverage**:
- ✅ OpenSearch connection and health
- ✅ Index creation and management
- ✅ Search functionality (basic and advanced)
- ✅ Filtering and sorting
- ✅ Search suggestions
- ✅ Real-time indexing
- ✅ Performance benchmarks

## Test Environment Setup

### Prerequisites

1. **Node.js Environment**:
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

2. **Service Dependencies**:
   ```bash
   # Database (PostgreSQL)
   npm run db:migrate

   # Redis Services
   npm run redis:start

   # OpenSearch
   npm run search:start
   npm run search:setup
   ```

3. **Environment Configuration**:
   ```bash
   # Copy and configure environment
   cp env.example .env
   # Edit .env with your configuration
   ```

### Test Data Setup

Tests use isolated test data that is automatically cleaned up:

```typescript
// Test data is generated automatically
const testUser = generateTestUser();
const testItem = generateTestItem();

// Cleanup happens automatically after tests
await cleanupTestData();
```

## Continuous Integration

### GitHub Actions Integration

The test suite is designed to run in CI/CD environments:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

      opensearch:
        image: opensearchproject/opensearch:2.11.0
        env:
          discovery.type: single-node
          plugins.security.disabled: true
        options: >-
          --health-cmd "curl -f http://localhost:9200/_cluster/health"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:all
```

### Local CI Simulation

Run the complete test suite locally:

```bash
# Full test suite (simulates CI)
npm run test:all

# Individual test categories
npm run test:coverage-audit
npm run test:integration
npm run test:performance
```

## Troubleshooting

### Common Issues

#### 1. Service Connection Failures

**Symptoms**:
- "Connection refused" errors
- Tests failing with service unavailable errors

**Solutions**:
```bash
# Check service status
docker ps  # For Docker services
netstat -an | grep :5432  # PostgreSQL
netstat -an | grep :6379  # Redis
netstat -an | grep :9200  # OpenSearch

# Restart services
npm run redis:start
npm run search:start
```

#### 2. Test Timeout Issues

**Symptoms**:
- Tests timing out
- Performance tests failing

**Solutions**:
```bash
# Increase timeout in test configuration
export TEST_TIMEOUT=30000

# Check system resources
top  # Check CPU and memory usage
df -h  # Check disk space
```

#### 3. Test Data Conflicts

**Symptoms**:
- Tests interfering with each other
- Data not being cleaned up

**Solutions**:
```bash
# Clean test data manually
npm run db:reset

# Clear caches
redis-cli FLUSHALL

# Reset search indices
curl -X DELETE "http://localhost:9200/localex_*"
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set debug environment
export LOG_LEVEL=debug
export DEBUG=localex:*

# Run tests with debug output
npm run test:integration
```

## Test Reporting

### Coverage Reports

Coverage audit generates detailed reports:

```bash
# Generate coverage report
npm run test:coverage-audit

# View report
cat docs/testing/coverage-audit-report.json
```

### Performance Reports

Performance tests provide detailed metrics:

```bash
# Run performance tests with detailed output
npm run test:performance > performance-report.txt

# View performance summary
cat performance-report.txt
```

### Integration Test Reports

Integration tests provide system health status:

```bash
# Run integration tests with verbose output
npm run test:integration > integration-report.txt

# Check integration health
grep "Success Rate" integration-report.txt
```

## Best Practices

### Test Execution

1. **Run tests in order**:
   - Coverage audit first (identify gaps)
   - Integration tests second (verify system works)
   - Performance tests last (validate performance)

2. **Clean environment**:
   - Ensure all services are running
   - Clear any existing test data
   - Use fresh test environments

3. **Monitor resources**:
   - Check system resources during tests
   - Monitor service health
   - Watch for memory leaks

### Test Development

1. **Isolated tests**:
   - Each test should be independent
   - Clean up test data after each test
   - Don't rely on test execution order

2. **Realistic data**:
   - Use realistic test data
   - Test edge cases and error conditions
   - Include performance boundaries

3. **Comprehensive coverage**:
   - Test all critical paths
   - Include error handling
   - Validate performance requirements

## Next Steps

After running tests:

1. **Review Results**: Check all test outputs for failures or warnings
2. **Address Issues**: Fix any failing tests or performance issues
3. **Update Coverage**: Implement tests for identified gaps
4. **Document Changes**: Update test documentation for any changes
5. **Monitor Trends**: Track test performance over time

---

This comprehensive test execution guide ensures LocalEx maintains high quality and reliability through thorough testing across all system components.
