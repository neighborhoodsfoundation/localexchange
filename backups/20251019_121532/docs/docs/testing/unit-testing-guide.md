# Unit Testing Guide - Phase 2.0+

## 🎯 **Testing Philosophy**

Starting with Phase 2.0, we're implementing **comprehensive unit testing with real coverage metrics** for all new code. This guide establishes our testing standards and practices.

---

## 📋 **Testing Standards**

### **Coverage Requirements**

**Minimum Coverage Targets** (enforced by Jest):
- **Lines**: 85%
- **Branches**: 85%
- **Functions**: 85%
- **Statements**: 85%

**When to Exceed 85%**:
- Critical business logic (aim for 95%+)
- Security-related code (aim for 100%)
- Financial transactions (aim for 100%)
- Data validation (aim for 95%+)

---

## 🏗️ **Test Structure**

### **File Organization**

```
src/
├── contexts/
│   ├── user/
│   │   ├── user.service.ts
│   │   ├── user.controller.ts
│   │   ├── user.model.ts
│   │   └── __tests__/
│   │       ├── user.service.test.ts
│   │       ├── user.controller.test.ts
│   │       └── user.model.test.ts
│   └── item/
│       └── __tests__/
└── services/
    ├── storage.service.ts
    └── __tests__/
        └── storage.service.test.ts

tests/
├── setup.ts                    # Jest setup
├── helpers/                    # Test utilities
├── fixtures/                   # Test data
├── integration/               # Integration tests
└── e2e/                       # End-to-end tests
```

---

## ✍️ **Writing Unit Tests**

### **Basic Test Template**

```typescript
/**
 * Service Name Unit Tests
 */

import { ServiceName } from '../service-name.service';
import { dependency } from '../dependency';

// Mock dependencies
jest.mock('../dependency');

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<typeof dependency>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize service
    mockDependency = dependency as jest.Mocked<typeof dependency>;
    service = new ServiceName(mockDependency);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = { test: 'data' };
      const expected = { result: 'success' };
      mockDependency.method.mockResolvedValue(expected);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
      expect(mockDependency.method).toHaveBeenCalledWith(input);
      expect(mockDependency.method).toHaveBeenCalledTimes(1);
    });

    it('should handle errors correctly', async () => {
      // Arrange
      const input = { test: 'data' };
      const error = new Error('Test error');
      mockDependency.method.mockRejectedValue(error);

      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow('Test error');
    });

    it('should validate input', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(service.methodName(invalidInput)).rejects.toThrow('Invalid input');
    });
  });
});
```

---

## 🧪 **Test Types & When to Use Them**

### **1. Unit Tests** (70% of tests)
**Purpose**: Test individual functions/methods in isolation

**When**: Every service, controller, model, utility function

**Example**:
```typescript
describe('UserService.createUser', () => {
  it('should create a user with hashed password', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    const result = await userService.createUser(userData);
    
    expect(result.email).toBe('test@example.com');
    expect(result.password).not.toBe('password123'); // Should be hashed
  });
});
```

---

### **2. Integration Tests** (20% of tests)
**Purpose**: Test how multiple components work together

**When**: Testing workflows that span multiple services

**Example**:
```typescript
describe('User Registration Flow', () => {
  it('should register user, send verification email, and create profile', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    
    // Create user
    const user = await userService.createUser(userData);
    
    // Should have sent verification email
    expect(emailService.sendVerification).toHaveBeenCalledWith(user.email);
    
    // Should have created profile
    const profile = await profileService.getProfile(user.id);
    expect(profile).toBeDefined();
  });
});
```

---

### **3. End-to-End Tests** (10% of tests)
**Purpose**: Test complete user journeys through the API

**When**: Critical user workflows

**Example**:
```typescript
describe('Complete Trading Flow', () => {
  it('should allow user to list item, negotiate, and complete trade', async () => {
    // 1. Create user
    const user = await createTestUser();
    
    // 2. List item
    const item = await api.post('/items').send({ title: 'Test Item' });
    
    // 3. Create trade offer
    const trade = await api.post('/trades').send({ itemId: item.id });
    
    // 4. Complete trade
    const result = await api.post(`/trades/${trade.id}/complete`);
    
    expect(result.status).toBe(200);
  });
});
```

---

## 🎭 **Mocking Strategies**

### **Mock External Dependencies**

```typescript
// Mock database
jest.mock('../config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

// Mock Redis
jest.mock('../services/cache.service', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));

// Mock S3
jest.mock('../services/storage.service', () => ({
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
}));
```

### **Create Test Doubles**

```typescript
// Test fixture
const createTestUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  createdAt: new Date('2024-01-01'),
});

// Mock implementation
const mockUserRepository = {
  findById: jest.fn().mockResolvedValue(createTestUser()),
  create: jest.fn().mockResolvedValue(createTestUser()),
};
```

---

## 📊 **Running Tests**

### **Commands**

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- user.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Run tests for changed files only
npm test -- --onlyChanged
```

### **Coverage Reports**

After running `npm run test:coverage`, view reports:
- **Terminal**: Summary in console
- **HTML**: Open `coverage/index.html` in browser
- **JSON**: `coverage/coverage-summary.json` for CI/CD

---

## ✅ **Test Checklist**

For each new feature/service, ensure:

- [ ] Unit tests for all public methods
- [ ] Tests for error cases and edge cases
- [ ] Tests for input validation
- [ ] Integration tests for workflows
- [ ] Mocks for external dependencies
- [ ] Test coverage ≥ 85%
- [ ] All tests passing
- [ ] No skipped tests in committed code

---

## 🎯 **Best Practices**

### **DO:**
✅ Write tests BEFORE or DURING implementation (TDD)
✅ Test behavior, not implementation details
✅ Use descriptive test names (should...)
✅ Follow Arrange-Act-Assert pattern
✅ Mock external dependencies
✅ Test edge cases and error conditions
✅ Keep tests fast (< 100ms per test)
✅ Make tests independent (no shared state)

### **DON'T:**
❌ Skip writing tests
❌ Test private methods directly
❌ Use real databases/APIs in unit tests
❌ Write tests that depend on execution order
❌ Leave commented-out test code
❌ Commit failing or skipped tests
❌ Test framework code (e.g., Express, PostgreSQL)

---

## 🔧 **Jest Configuration**

Our `jest.config.js` enforces:
- 85% minimum coverage on all metrics
- TypeScript support via ts-jest
- Path aliases for clean imports
- HTML, LCOV, and JSON coverage reports
- 10-second timeout for async tests

---

## 📈 **Coverage Reporting**

### **After Each Phase**

1. Run full coverage report:
   ```bash
   npm run test:coverage
   ```

2. Review coverage by context:
   ```bash
   # View detailed coverage
   open coverage/index.html
   ```

3. Document results in phase completion:
   - Overall coverage %
   - Coverage by context/service
   - Any gaps identified
   - Plan to address gaps

### **Coverage Goals by Phase**

- **Phase 2.1** (User Context): 85%+ coverage
- **Phase 2.2** (Item Context): 85%+ coverage
- **Phase 2.3** (Trading Context): 90%+ coverage (critical)
- **Phase 2.4** (Credits Context): 95%+ coverage (financial)

---

## 🚀 **CI/CD Integration** (Coming Soon)

Tests will run automatically on:
- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before deployment (CI pipeline)

Coverage reports will be:
- Posted to PR as comments
- Tracked over time
- Block merges if below threshold

---

## 📚 **Resources**

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://github.com/jest-community/ts-jest)

---

*Testing Guide for Phase 2.0+*  
*Established: October 8, 2024*  
*Updated: As standards evolve*

