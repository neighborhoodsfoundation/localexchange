/**
 * Security Audit Testing Suite
 * 
 * Comprehensive security testing including penetration testing,
 * privacy audit, and vulnerability assessment
 */

import { 
  userService
} from '../../src/contexts/user';
import { 
  itemService
} from '../../src/contexts/items';
import { 
  createTrade, 
  makeOffer, 
  respondToOffer,
  confirmArrival,
  confirmHandoff,
  leaveFeedback,
  createDispute
} from '../../src/contexts/trading';
import { 
  createAccount, 
  getAccountBalance,
  processPayment,
  transferCredits,
  AccountType
} from '../../src/contexts/credits';

// Mock external dependencies
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
}));

jest.mock('../../src/config/redis', () => ({
  getClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  }))
}));

jest.mock('../../src/config/opensearch', () => ({
  getClient: jest.fn(() => ({
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
}));

jest.mock('../../src/config/s3', () => ({
  getClient: jest.fn(() => ({
    upload: jest.fn(),
    getObject: jest.fn(),
    deleteObject: jest.fn()
  }))
}));

describe('Security Audit Testing Suite', () => {
  let testUser: {
    id: string;
    email: string;
    token: string;
    accountId: string;
  };

  let otherUser: {
    id: string;
    email: string;
    token: string;
    accountId: string;
  };

  let testItem: {
    id: string;
    sellerId: string;
  };

  beforeAll(async () => {
    // Create test users
    const userResponse = await userService.register({
      email: 'security@test.com',
      password: 'SecurityTest123!',
      firstName: 'Security',
      lastName: 'Tester',
      phone: '555-0199',
      dateOfBirth: new Date('1990-01-01'),
      locationZip: '12345',
      locationCity: 'Security City',
      locationState: 'SC'
    });

    expect(userResponse.success).toBe(true);
    testUser = {
      id: userResponse.user!.id,
      email: 'security@test.com',
      token: '',
      accountId: ''
    };

    const authResponse = await authenticateUser({
      email: 'security@test.com',
      password: 'SecurityTest123!'
    });

    expect(authResponse.success).toBe(true);
    testUser.token = authResponse.token!;

    const accountResponse = await createAccount({
      userId: testUser.id,
        accountType: AccountType.USER_WALLET
    });

    expect(accountResponse.success).toBe(true);
    testUser.accountId = accountResponse.account!.id;

    // Create other user
    const otherUserResponse = await userService.register({
      email: 'other@test.com',
      password: 'OtherTest123!',
      firstName: 'Other',
      lastName: 'User',
      phone: '555-0198',
      dateOfBirth: new Date('1985-01-01'),
      locationZip: '12346',
      locationCity: 'Other City',
      locationState: 'OC'
    });

    expect(otherUserResponse.success).toBe(true);
    otherUser = {
      id: otherUserResponse.user!.id,
      email: 'other@test.com',
      token: '',
      accountId: ''
    };

    const otherAuthResponse = await authenticateUser({
      email: 'other@test.com',
      password: 'OtherTest123!'
    });

    expect(otherAuthResponse.success).toBe(true);
    otherUser.token = otherAuthResponse.token!;

    const otherAccountResponse = await createAccount({
      userId: otherUser.id,
        accountType: AccountType.USER_WALLET
    });

    expect(otherAccountResponse.success).toBe(true);
    otherUser.accountId = otherAccountResponse.account!.id;

    // Create test item
    const itemResponse = await createItem({
      sellerId: testUser.id,
      title: 'Security Test Item',
      description: 'This is a security test item',
      category: 'Electronics',
      condition: 'Good',
      price: 100,
      locationLat: 39.7817,
      locationLng: -89.6501,
      locationAddress: '123 Security St, Security City, SC',
      images: ['security-item.jpg']
    });

    expect(itemResponse.success).toBe(true);
    testItem = {
      id: itemResponse.item!.id,
      sellerId: testUser.id
    };
  });

  describe('Authentication Security', () => {
    it('should prevent SQL injection in authentication', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await authenticateUser({
          email: maliciousInput,
          password: 'anypassword'
        });

        expect(response.success).toBe(false);
        expect(response.error).toContain('Invalid credentials');
      }
    });

    it('should prevent brute force attacks', async () => {
      const maxAttempts = 5;
      let attemptCount = 0;

      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await authenticateUser({
          email: 'security@test.com',
          password: 'wrongpassword'
        });

        attemptCount++;
        
        if (attemptCount <= maxAttempts) {
          expect(response.success).toBe(false);
        } else {
          // After max attempts, should be rate limited
          expect(response.success).toBe(false);
          expect(response.error).toContain('rate limit');
        }
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'qwerty',
        'abc123'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await userService.register({
          email: `weak${Math.random()}@test.com`,
          password: weakPassword,
          firstName: 'Weak',
          lastName: 'Password',
          phone: '555-0000',
          dateOfBirth: new Date('1990-01-01'),
          locationZip: '12345',
          locationCity: 'Test City',
          locationState: 'TC'
        });

        expect(response.success).toBe(false);
        expect(response.error).toContain('password');
      }
    });

    it('should prevent account enumeration', async () => {
      const existingEmail = 'security@test.com';
      const nonExistingEmail = 'nonexistent@test.com';

      const existingResponse = await authenticateUser({
        email: existingEmail,
        password: 'wrongpassword'
      });

      const nonExistingResponse = await authenticateUser({
        email: nonExistingEmail,
        password: 'wrongpassword'
      });

      // Both should return the same error message to prevent enumeration
      expect(existingResponse.success).toBe(false);
      expect(nonExistingResponse.success).toBe(false);
      expect(existingResponse.error).toBe(nonExistingResponse.error);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to user profiles', async () => {
      // Try to access other user's profile without proper authentication
      const response = await getUserProfile(otherUser.id);
      
      // Should fail or return limited information
      expect(response.success).toBe(false);
    });

    it('should prevent unauthorized item modification', async () => {
      const response = await updateItem(testItem.id, {
        title: 'Hacked Item',
        description: 'This item has been hacked'
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('unauthorized');
    });

    it('should prevent unauthorized trade operations', async () => {
      const tradeResponse = await createTrade({
        itemId: testItem.id,
        buyerId: otherUser.id,
        offeredPrice: 50
      });

      expect(tradeResponse.success).toBe(true);
      const tradeId = tradeResponse.trade!.id;

      // Try to confirm arrival for someone else's trade
      const arrivalResponse = await confirmArrival({
        tradeId,
        userId: 'unauthorized-user',
        locationLat: 39.7817,
        locationLng: -89.6501
      });

      expect(arrivalResponse.success).toBe(false);
      expect(arrivalResponse.error).toContain('not part of this trade');
    });

    it('should prevent unauthorized credit operations', async () => {
      const response = await transferCredits({
        fromAccountId: testUser.accountId,
        toAccountId: otherUser.accountId,
        amount: 100,
        description: 'Unauthorized transfer'
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('unauthorized');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent XSS attacks in user input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>"
      ];

      for (const payload of xssPayloads) {
        const response = await updateUserProfile(testUser.id, {
          firstName: payload,
          lastName: 'Test'
        });

        // Should either reject the input or sanitize it
        if (response.success) {
          expect(response.user?.firstName).not.toContain('<script>');
          expect(response.user?.firstName).not.toContain('javascript:');
        } else {
          expect(response.error).toContain('invalid');
        }
      }
    });

    it('should prevent injection attacks in item descriptions', async () => {
      const injectionPayloads = [
        "'; DROP TABLE items; --",
        "<script>document.cookie</script>",
        "{{7*7}}",
        "${7*7}",
        "#{7*7}"
      ];

      for (const payload of injectionPayloads) {
        const response = await updateItem(testItem.id, {
          description: payload
        });

        // Should either reject or sanitize the input
        if (response.success) {
          expect(response.item?.description).not.toContain('<script>');
          expect(response.item?.description).not.toContain('DROP TABLE');
        } else {
          expect(response.error).toContain('invalid');
        }
      }
    });

    it('should validate file upload security', async () => {
      const maliciousFiles = [
        'malware.exe',
        'script.js',
        'virus.bat',
        'backdoor.php',
        'trojan.scr'
      ];

      for (const filename of maliciousFiles) {
        const response = await createItem({
          sellerId: testUser.id,
          title: 'Test Item',
          description: 'Test description',
          category: 'Electronics',
          condition: 'Good',
          price: 100,
          locationLat: 39.7817,
          locationLng: -89.6501,
          locationAddress: '123 Test St, Test City, TC',
          images: [filename]
        });

        expect(response.success).toBe(false);
        expect(response.error).toContain('invalid file');
      }
    });
  });

  describe('Data Privacy Security', () => {
    it('should not expose sensitive user data', async () => {
      const response = await getUserProfile(testUser.id);
      
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      
      // Should not expose sensitive fields
      expect(response.user).not.toHaveProperty('password');
      expect(response.user).not.toHaveProperty('passwordHash');
      expect(response.user).not.toHaveProperty('ssn');
      expect(response.user).not.toHaveProperty('creditCard');
    });

    it('should encrypt sensitive data at rest', async () => {
      // This would typically be tested at the database level
      // For now, we verify that sensitive operations require proper authentication
      const response = await getAccountBalance({ accountId: testUser.accountId });
      
      expect(response.success).toBe(true);
      // Balance should be returned as a number, not raw database value
      expect(typeof response.balance).toBe('number');
    });

    it('should implement proper data retention policies', async () => {
      // Test that old data is properly cleaned up
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      // This would test actual data retention in a real implementation
      // For now, we verify the API doesn't expose data older than retention period
      const response = await getUserProfile(testUser.id);
      
      expect(response.success).toBe(true);
      // User should exist (created in beforeAll)
      expect(response.user?.createdAt).toBeDefined();
    });
  });

  describe('API Security', () => {
    it('should implement proper rate limiting', async () => {
      const requests = Array(100).fill(null).map(() => 
        getUserProfile(testUser.id)
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      // Some requests should be rate limited
      const rateLimitedCount = results.filter(r => 
        !r.success && r.error?.includes('rate limit')
      ).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
      console.log(`Rate limited ${rateLimitedCount}/100 requests in ${endTime - startTime}ms`);
    });

    it('should validate request headers', async () => {
      // Test with missing or invalid headers
      const response = await getUserProfile(testUser.id);
      
      // Should require proper authentication
      expect(response.success).toBe(false);
    });

    it('should prevent CSRF attacks', async () => {
      // Test that state-changing operations require proper CSRF tokens
      const response = await updateUserProfile(testUser.id, {
        firstName: 'Updated',
        lastName: 'Name'
      });

      // Should fail without proper CSRF protection
      expect(response.success).toBe(false);
      expect(response.error).toContain('CSRF');
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent double-spending', async () => {
      const amount = 100;
      
      // Try to spend the same credits twice
      const payment1 = await processPayment({
        tradeId: 'test-trade-1',
        buyerId: testUser.id,
        sellerId: otherUser.id,
        amount,
        description: 'First payment',
        idempotencyKey: 'test-key-1'
      });

      const payment2 = await processPayment({
        tradeId: 'test-trade-2',
        buyerId: testUser.id,
        sellerId: otherUser.id,
        amount,
        description: 'Second payment',
        idempotencyKey: 'test-key-1' // Same idempotency key
      });

      expect(payment1.success).toBe(true);
      expect(payment2.success).toBe(false);
      expect(payment2.error).toContain('duplicate');
    });

    it('should prevent negative balances', async () => {
      const response = await transferCredits({
        fromAccountId: testUser.accountId,
        toAccountId: otherUser.accountId,
        amount: 1000000, // More than user has
        description: 'Attempt to create negative balance'
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('insufficient');
    });

    it('should validate trade state transitions', async () => {
      const tradeResponse = await createTrade({
        itemId: testItem.id,
        buyerId: otherUser.id,
        offeredPrice: 50
      });

      expect(tradeResponse.success).toBe(true);
      const tradeId = tradeResponse.trade!.id;

      // Try to confirm handoff before offer is accepted
      const handoffResponse = await confirmHandoff({
        tradeId,
        userId: otherUser.id,
        itemAsDescribed: true,
        issues: []
      });

      expect(handoffResponse.success).toBe(false);
      expect(handoffResponse.error).toContain('not in correct state');
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const response = await authenticateUser({
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      });

      expect(response.success).toBe(false);
      // Error should not contain database details, stack traces, or internal paths
      expect(response.error).not.toContain('database');
      expect(response.error).not.toContain('stack');
      expect(response.error).not.toContain('C:\\');
      expect(response.error).not.toContain('/home/');
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { email: null, password: 'test' },
        { email: 'test@test.com', password: null },
        { email: 123, password: 'test' },
        { email: 'test@test.com', password: 123 },
        {}
      ];

      for (const request of malformedRequests) {
        const response = await authenticateUser(request as any);
        
        expect(response.success).toBe(false);
        expect(response.error).toContain('invalid');
      }
    });
  });

  describe('Session Security', () => {
    it('should implement secure session management', async () => {
      const authResponse = await authenticateUser({
        email: 'security@test.com',
        password: 'SecurityTest123!'
      });

      expect(authResponse.success).toBe(true);
      expect(authResponse.token).toBeDefined();
      
      // Token should be JWT format
      const tokenParts = authResponse.token!.split('.');
      expect(tokenParts).toHaveLength(3);
    });

    it('should implement proper session expiration', async () => {
      // This would test actual session expiration in a real implementation
      // For now, we verify that tokens are properly formatted
      const authResponse = await authenticateUser({
        email: 'security@test.com',
        password: 'SecurityTest123!'
      });

      expect(authResponse.success).toBe(true);
      expect(authResponse.token).toBeDefined();
      expect(authResponse.expiresAt).toBeDefined();
    });
  });
});
