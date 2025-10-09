/**
 * Jest Test Setup
 * 
 * Global test configuration and setup that runs before all tests
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
export const mockDate = (date: Date) => {
  jest.spyOn(Date, 'now').mockReturnValue(date.getTime());
};

export const restoreDate = () => {
  jest.restoreAllMocks();
};

// Clean up after all tests
afterAll(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

