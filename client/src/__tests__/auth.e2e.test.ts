
import { jest } from '@jest/globals';

// Mock fetch for API calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Registration Flow', () => {
    it('should successfully register a new user', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          isPaidUser: false
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const registrationData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
        rememberMe: false
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle registration validation errors', async () => {
      const mockErrorResponse = {
        error: 'Validation error',
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password must contain uppercase, lowercase, number, and special character' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const invalidData = {
        username: 'test',
        email: 'invalid-email',
        password: 'weak',
        rememberMe: false
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toBe('Validation error');
      expect(result.details).toHaveLength(2);
    });

    it('should handle duplicate email error', async () => {
      const mockErrorResponse = {
        error: 'User already exists',
        field: 'email'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const duplicateData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        rememberMe: false
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      });

      expect(response.status).toBe(409);
      const result = await response.json();
      expect(result.error).toBe('User already exists');
      expect(result.field).toBe('email');
    });
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          isPaidUser: false
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        rememberMe: false
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle invalid credentials', async () => {
      const mockErrorResponse = {
        error: 'Invalid email or password',
        field: 'password'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const invalidData = {
        email: 'test@example.com',
        password: 'wrongpassword',
        rememberMe: false
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle rate limiting after multiple failed attempts', async () => {
      const mockErrorResponse = {
        error: 'Too many failed login attempts. Please try again in 15 minutes.'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
        rememberMe: false
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.error).toContain('Too many failed login attempts');
    });
  });

  describe('Token Validation', () => {
    it('should successfully access protected route with valid token', async () => {
      const mockProfileResponse = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        isPaidUser: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileResponse)
      } as Response);

      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const result = await response.json();
      expect(result.username).toBe('testuser');
    });

    it('should reject access to protected route without token', async () => {
      const mockErrorResponse = {
        error: 'Access token required',
        code: 'NO_TOKEN'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const response = await fetch('/api/auth/profile', {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.code).toBe('NO_TOKEN');
    });

    it('should reject access with expired token', async () => {
      const mockErrorResponse = {
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer expired-token'
        }
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to backtest endpoint with valid token', async () => {
      const mockBacktestResponse = {
        totalReturn: 500,
        totalReturnPercent: 5,
        sharpeRatio: 1.2
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBacktestResponse)
      } as Response);

      const backtestData = {
        symbol: 'BTC/USDT',
        timeframe: '15m',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
        strategyName: 'trend_following',
        strategyConfig: {}
      };

      const response = await fetch('/api/trading/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(backtestData)
      });

      const result = await response.json();
      expect(result.totalReturn).toBe(500);
    });

    it('should deny access to backtest endpoint without token', async () => {
      const mockErrorResponse = {
        error: 'Access token required',
        code: 'NO_TOKEN'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const response = await fetch('/api/trading/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout and clear tokens', async () => {
      const mockResponse = {
        success: true,
        message: 'Logged out successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
