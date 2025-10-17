/**
 * User Context Tests
 * 
 * Tests for the User Context including authentication, profile management,
 * and privacy controls.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from '../UserContext';
import { LoginRequest, RegisterRequest } from '../user.types';

// ============================================================================
// TEST COMPONENTS
// ============================================================================

const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, login, logout } = useUser();

  return (
    <div>
      <div data-testid="user">{user ? user.displayName : 'No user'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{error ? error.message : 'No error'}</div>
      <button 
        data-testid="login-button" 
        onClick={() => login({ email: 'test@example.com', password: 'password123' })}
      >
        Login
      </button>
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserProvider>{children}</UserProvider>
);

// ============================================================================
// USER CONTEXT TESTS
// ============================================================================

describe('UserContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      render(
        <TestProvider>
          <TestComponent />
        </TestProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Authentication', () => {
    it('should handle login successfully', async () => {
      render(
        <TestProvider>
          <TestComponent />
        </TestProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('BlueBird_7432');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });
    });

    it('should handle logout', async () => {
      render(
        <TestProvider>
          <TestComponent />
        </TestProvider>
      );

      // First login
      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Then logout
      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle login errors', async () => {
      render(
        <TestProvider>
          <TestComponent />
        </TestProvider>
      );

      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);

      // Wait for error to appear (mock implementation will show error)
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No error');
      });
    });
  });
});

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('useUser Hook', () => {
  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useUser must be used within a UserProvider');
    
    consoleSpy.mockRestore();
  });

  it('should provide user context when used within provider', () => {
    render(
      <TestProvider>
        <TestComponent />
      </TestProvider>
    );

    expect(screen.getByTestId('user')).toBeInTheDocument();
    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('User Context Integration', () => {
  it('should maintain state across re-renders', () => {
    const { rerender } = render(
      <TestProvider>
        <TestComponent />
      </TestProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

    // Re-render with same props
    rerender(
      <TestProvider>
        <TestComponent />
      </TestProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('should handle multiple providers', () => {
    render(
      <TestProvider>
        <TestProvider>
          <TestComponent />
        </TestProvider>
      </TestProvider>
    );

    expect(screen.getByTestId('user')).toBeInTheDocument();
  });
});

// ============================================================================
// MOCK TESTS
// ============================================================================

describe('Mock Implementation', () => {
  it('should use mock user data', async () => {
    render(
      <TestProvider>
        <TestComponent />
      </TestProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('BlueBird_7432');
    });
  });

  it('should handle mock authentication flow', async () => {
    render(
      <TestProvider>
        <TestComponent />
      </TestProvider>
    );

    // Initial state
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

    // Login
    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    // Logout
    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });
});
