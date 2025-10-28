# LocalEx End-to-End Testing Guide

## Overview

This guide provides comprehensive instructions for running end-to-end (E2E) tests in the LocalEx platform. E2E tests validate complete user workflows and business scenarios across the entire system, ensuring all components work together seamlessly.

## Table of Contents

- [What is E2E Testing?](#what-is-e2e-testing)
- [E2E Testing Framework](#e2e-testing-framework)
- [Test Scenarios](#test-scenarios)
- [Running E2E Tests](#running-e2e-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## What is E2E Testing?

End-to-end testing validates complete user journeys through the application, testing:
- Multiple system components working together
- Real-world user workflows and scenarios
- Data flow across different services
- System behavior under realistic conditions
- Error handling and recovery mechanisms

### E2E vs Other Testing Types

| Test Type | Scope | Speed | Coverage |
|-----------|-------|-------|----------|
| **Unit Tests** | Single function/method | Very Fast | Code logic |
| **Integration Tests** | Multiple components | Fast | Service integration |
| **E2E Tests** | Complete workflows | Slow | User journeys |

## E2E Testing Framework

### Architecture

```
LocalEx E2E Testing Framework
├── Test Runner (test-e2e.ts)
├── Test Scenarios
│   ├── User Registration Journey
│   ├── Item Listing Journey
│   ├── Search and Discovery Journey
│   ├── Trade Transaction Journey
│   ├── Multi-User Trade Journey
│   ├── Error Recovery Journey
│   ├── Performance Under Load Journey
│   └── Data Consistency Journey
└── Test Utilities
    ├── Test Data Management
    ├── Service Mocking
    └── Cleanup Procedures
```

### Technology Stack

- **TypeScript**: Type-safe test development
- **ts-node**: Direct TypeScript execution
- **Database Integration**: PostgreSQL with real data
- **Service Integration**: Redis, OpenSearch, and all services
- **Async Testing**: Full async/await support

## Test Scenarios

### 1. User Registration Journey

**Scenario**: New user signs up and gets onboarded

**Steps**:
1. Create new user account
2. Create user session
3. Create user accounts (MAIN and ESCROW)
4. Credit initial balance to user account
5. Verify user can be found in search

**Success Criteria**:
- User account created successfully
- Session established and active
- Accounts created with proper types
- Initial balance credited correctly

---

### 2. Item Listing Journey

**Scenario**: Seller creates a new item listing

**Steps**:
1. Create item listing in database
2. Index item in search engine
3. Verify item appears in search results
4. Verify item details are correct

**Success Criteria**:
- Item created with all required fields
- Item indexed in OpenSearch
- Item discoverable via search
- All item data consistent

---

### 3. Search and Discovery Journey

**Scenario**: Buyer searches for and finds items

**Steps**:
1. Perform text search
2. Apply price filter
3. Test geo-location search
4. Test search suggestions
5. Verify caching of search results

**Success Criteria**:
- Search returns relevant results
- Filters work correctly
- Geo-location search functional
- Suggestions provided
- Caching improves performance

---

### 4. Trade Transaction Journey

**Scenario**: Complete trade flow from offer to completion

**Steps**:
1. Create buyer user
2. Create buyer accounts and credit balance
3. Create trade request
4. Debit buyer account for trade
5. Verify buyer balance is correct
6. Complete trade and credit seller
7. Verify seller balance increased

**Success Criteria**:
- Trade created successfully
- Buyer debited correctly
- Seller credited correctly
- Balances accurate throughout
- Double-entry ledger maintained

---

### 5. Multi-User Trade Journey

**Scenario**: Multiple users trading concurrently

**Steps**:
1. Create multiple users concurrently
2. Create items for each user
3. Index all items in search
4. Verify all items can be found

**Success Criteria**:
- Concurrent operations succeed
- No data corruption
- All items indexed correctly
- Search returns all items

---

### 6. Error Recovery Journey

**Scenario**: System handles errors gracefully

**Steps**:
1. Test invalid search query handling
2. Test insufficient balance scenario
3. Test session recovery

**Success Criteria**:
- Invalid inputs handled gracefully
- Overdraft prevented by triggers
- Sessions cleaned up properly
- No system crashes or data corruption

---

### 7. Performance Under Load Journey

**Scenario**: System performs well under high traffic

**Steps**:
1. Simulate concurrent user sessions (20+)
2. Simulate concurrent search queries (50+)
3. Simulate concurrent cache operations (100+)
4. Verify system stability under load

**Success Criteria**:
- System handles concurrent load
- Response times acceptable
- No errors or timeouts
- Resources properly managed

---

### 8. Data Consistency Journey

**Scenario**: Data remains consistent across services

**Steps**:
1. Create item in database
2. Index item in search
3. Verify data consistency between database and search
4. Update item and verify consistency

**Success Criteria**:
- Data synchronized across services
- Updates reflected in all systems
- No data discrepancies
- Consistency maintained

## Running E2E Tests

### Prerequisites

Ensure all services are running:

```bash
# Check database
npm run db:status

# Start Redis
npm run redis:start

# Start OpenSearch
npm run search:start
npm run search:setup
```

### Execute E2E Tests

```bash
# Run complete E2E test suite
npm run test:e2e

# Or run directly with ts-node
ts-node scripts/test-e2e.ts
```

### Expected Output

```
🎭 Starting LocalEx End-to-End Testing Framework...

Testing complete user workflows and business scenarios

🎭 End-to-End Test Results:
============================================================
✅ PASS User Registration Journey
   Scenario: New User Onboarding
   Duration: 1234ms
   Steps: 5 steps completed

✅ PASS Item Listing Journey
   Scenario: Seller Creates Listing
   Duration: 2345ms
   Steps: 4 steps completed

✅ PASS Search and Discovery Journey
   Scenario: Buyer Finds Item
   Duration: 3456ms
   Steps: 5 steps completed

✅ PASS Trade Transaction Journey
   Scenario: Complete Trade Flow
   Duration: 4567ms
   Steps: 7 steps completed

✅ PASS Multi-User Trade Journey
   Scenario: Multiple Users Trading
   Duration: 5678ms
   Steps: 4 steps completed

✅ PASS Error Recovery Journey
   Scenario: System Resilience
   Duration: 1234ms
   Steps: 3 steps completed

✅ PASS Performance Under Load Journey
   Scenario: High Traffic Scenario
   Duration: 6789ms
   Steps: 4 steps completed

✅ PASS Data Consistency Journey
   Scenario: Data Integrity Across Services
   Duration: 2345ms
   Steps: 4 steps completed

============================================================
Total Scenarios: 8
✅ Passed: 8
❌ Failed: 0
Success Rate: 100.0%

🎉 All end-to-end tests passed successfully!
LocalEx complete user workflows are functioning correctly.
```

## Test Coverage

### User Workflows Covered

- **Registration**: Complete user onboarding process
- **Item Management**: Creating, listing, and managing items
- **Search**: Discovery and filtering of items
- **Trading**: Complete trade lifecycle
- **Payments**: Credit transfers and balance management
- **Concurrency**: Multi-user operations
- **Error Handling**: System resilience and recovery
- **Performance**: System behavior under load
- **Data Integrity**: Cross-service consistency

### Services Tested

- ✅ **Database Layer**: PostgreSQL with double-entry ledger
- ✅ **Cache Layer**: Redis caching and performance
- ✅ **Queue Layer**: Job processing and idempotency
- ✅ **Search Layer**: OpenSearch indexing and querying
- ✅ **Session Layer**: User session management
- ✅ **Integration**: All services working together

## Best Practices

### 1. Test Data Management

```typescript
// Use unique identifiers for test data
const userId = uuidv4();
const timestamp = Date.now();
const username = `e2e_test_${timestamp}`;
const email = `test_${timestamp}@example.com`;

// Clean up test data after tests
// (Currently handled by test isolation)
```

### 2. Test Isolation

- Each test scenario should be independent
- Tests should not rely on previous test state
- Use unique identifiers to avoid conflicts
- Clean up test data appropriately

### 3. Realistic Scenarios

- Test real user workflows
- Use realistic data values
- Include error conditions
- Test edge cases and boundaries

### 4. Performance Considerations

- E2E tests are slower than unit/integration tests
- Run E2E tests less frequently (e.g., before deployment)
- Use parallel execution where possible
- Monitor test execution time

### 5. Maintenance

- Keep tests up-to-date with application changes
- Refactor tests to reduce duplication
- Document complex test scenarios
- Review test failures promptly

## Troubleshooting

### Common Issues

#### 1. Service Connection Failures

**Symptoms**: Tests fail with "Connection refused" errors

**Solutions**:
```bash
# Verify all services are running
npm run db:status
npm run redis:test
npm run search:test

# Restart services if needed
npm run redis:start
npm run search:start
```

#### 2. Test Data Conflicts

**Symptoms**: Tests fail with duplicate key errors

**Solutions**:
- Ensure using unique identifiers (uuidv4(), Date.now())
- Check for leftover test data
- Review test isolation

#### 3. Timing Issues

**Symptoms**: Tests fail intermittently

**Solutions**:
- Add appropriate delays for async operations
- Increase timeouts for slow operations
- Check for race conditions

#### 4. Search Index Delays

**Symptoms**: Items not found in search immediately after indexing

**Solutions**:
- OpenSearch indexing is near real-time (1 second default)
- Add small delay after indexing
- Refresh index explicitly if needed

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment variables
export LOG_LEVEL=debug
export DEBUG=localex:*

# Run tests with verbose output
npm run test:e2e
```

### Manual Verification

If tests fail, verify manually:

```bash
# Check database
psql -U localex_user -d localex_db -c "SELECT * FROM users LIMIT 5;"

# Check Redis
redis-cli KEYS "e2e_*"

# Check OpenSearch
curl -X GET "http://localhost:9200/localex_items/_search?q=e2e"
```

## Continuous Integration

### CI/CD Pipeline Integration

```yaml
# Example GitHub Actions workflow
e2e-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:13
    redis:
      image: redis:7
    opensearch:
      image: opensearchproject/opensearch:2.11.0

  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'

    - run: npm ci
    - run: npm run db:migrate
    - run: npm run search:setup
    - run: npm run test:e2e
```

### When to Run E2E Tests

- **Pre-deployment**: Always run before deploying to production
- **Pull Requests**: Run on major feature branches
- **Nightly**: Schedule nightly E2E test runs
- **Release**: Run complete suite before releases

## Metrics and Reporting

### Success Metrics

- **Pass Rate**: Target 100% pass rate
- **Coverage**: All critical user journeys covered
- **Performance**: Tests complete in reasonable time
- **Reliability**: No flaky or intermittent failures

### Test Reports

E2E test results include:
- Scenario name and description
- Number of steps completed
- Execution duration
- Pass/fail status
- Detailed error messages if failed

## Next Steps

After E2E tests pass:

1. **Review Results**: Check all test outputs
2. **Address Failures**: Fix any failing scenarios
3. **Update Coverage**: Add tests for new features
4. **Monitor Trends**: Track test performance over time
5. **Deploy Confidently**: E2E tests validate production readiness

---

This comprehensive E2E testing guide ensures LocalEx maintains high quality and reliability through thorough end-to-end validation of all user workflows and business scenarios.
