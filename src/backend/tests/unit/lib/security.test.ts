import { JwtService } from '../../src/lib/security/jwt.service';
import { AuthService } from '../../src/lib/security/auth.service';
import jwt from 'jsonwebtoken'; // v9.0.0
import winston from 'winston'; // v3.8.2

// Test constants
const TEST_TIMEOUT = 5000;
const TEST_USER_ID = 'test-user-123';
const TEST_ROLES = ['user', 'admin'];
const TEST_SCOPES = ['read:profile', 'write:data'];
const TEST_SECRET = 'test-secret-key-must-be-at-least-32-chars-long';
const TEST_ALGORITHM = 'HS256';

// Mock logger for testing
const mockLogger = winston.createLogger({
  transports: [new winston.transports.Console({ silent: true })]
});

describe('JwtService Security Tests', () => {
  let jwtService: JwtService;
  let mockToken: string;
  let mockRefreshToken: string;

  beforeEach(() => {
    jwtService = new JwtService();
    // Reset token blacklist and cache before each test
    (jwtService as any).tokenBlacklist.clear();
    (jwtService as any).tokenCache.flushAll();
  });

  describe('Token Generation Security', () => {
    it('should generate secure tokens with correct claims and expiration', async () => {
      const result = await jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.tokenType).toBe('Bearer');

      const decoded = jwt.decode(result.accessToken, { complete: true });
      expect(decoded).toBeTruthy();
      expect(decoded?.payload).toHaveProperty('userId', TEST_USER_ID);
      expect(decoded?.payload).toHaveProperty('roles');
      expect(decoded?.payload).toHaveProperty('exp');
      expect(decoded?.payload).toHaveProperty('jti');
    }, TEST_TIMEOUT);

    it('should enforce rate limiting on token generation', async () => {
      const attempts = 6; // Exceeds rate limit
      const promises = Array(attempts).fill(null).map(() => 
        jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES)
      );

      await expect(Promise.all(promises)).rejects.toThrow();
    });

    it('should use secure algorithms for token signing', async () => {
      const result = await jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES);
      const decoded = jwt.decode(result.accessToken, { complete: true });
      
      expect(decoded?.header.alg).toBe(TEST_ALGORITHM);
    });
  });

  describe('Token Verification Security', () => {
    beforeEach(async () => {
      const tokens = await jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES);
      mockToken = tokens.accessToken;
      mockRefreshToken = tokens.refreshToken;
    });

    it('should verify valid tokens with all security checks', async () => {
      const options = {
        validateAudience: true,
        validateIssuer: true,
        validateLifetime: true,
        allowedAlgorithms: [TEST_ALGORITHM]
      };

      const result = await jwtService.verifyToken(mockToken, options);
      
      expect(result).toHaveProperty('userId', TEST_USER_ID);
      expect(result.roles).toEqual(expect.arrayContaining(TEST_ROLES));
      expect(result.scopes).toEqual(expect.arrayContaining(TEST_SCOPES));
    });

    it('should reject tampered tokens', async () => {
      const tamperedToken = mockToken.slice(0, -5) + 'xxxxx';
      
      await expect(jwtService.verifyToken(tamperedToken, {
        validateAudience: true,
        validateIssuer: true,
        validateLifetime: true,
        allowedAlgorithms: [TEST_ALGORITHM]
      })).rejects.toThrow();
    });

    it('should reject expired tokens', async () => {
      // Create token with immediate expiration
      const expiredToken = jwt.sign(
        { userId: TEST_USER_ID, exp: Math.floor(Date.now() / 1000) - 1 },
        TEST_SECRET
      );

      await expect(jwtService.verifyToken(expiredToken, {
        validateAudience: true,
        validateIssuer: true,
        validateLifetime: true,
        allowedAlgorithms: [TEST_ALGORITHM]
      })).rejects.toThrow();
    });

    it('should reject tokens with invalid algorithms', async () => {
      await expect(jwtService.verifyToken(mockToken, {
        validateAudience: true,
        validateIssuer: true,
        validateLifetime: true,
        allowedAlgorithms: ['RS256'] // Different from signing algorithm
      })).rejects.toThrow();
    });
  });

  describe('Token Refresh Security', () => {
    beforeEach(async () => {
      const tokens = await jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES);
      mockRefreshToken = tokens.refreshToken;
    });

    it('should securely refresh valid tokens', async () => {
      const result = await jwtService.refreshToken(mockRefreshToken);
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(mockRefreshToken);
    });

    it('should reject reuse of refresh tokens', async () => {
      await jwtService.refreshToken(mockRefreshToken);
      await expect(jwtService.refreshToken(mockRefreshToken)).rejects.toThrow();
    });
  });

  describe('Token Revocation Security', () => {
    it('should effectively revoke tokens', async () => {
      const tokens = await jwtService.generateToken(TEST_USER_ID, TEST_ROLES, TEST_SCOPES);
      await jwtService.revokeToken(tokens.accessToken);

      await expect(jwtService.verifyToken(tokens.accessToken, {
        validateAudience: true,
        validateIssuer: true,
        validateLifetime: true,
        allowedAlgorithms: [TEST_ALGORITHM]
      })).rejects.toThrow();
    });
  });
});

describe('AuthService Security Tests', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();
    authService = new AuthService(jwtService, mockLogger);
  });

  describe('Login Security', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      deviceId: 'test-device-123'
    };

    const mockContext = {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date().toISOString(),
      sessionId: 'test-session-123'
    };

    it('should enforce rate limiting on login attempts', async () => {
      const attempts = 6; // Exceeds rate limit
      const promises = Array(attempts).fill(null).map(() => 
        authService.login(mockCredentials, mockContext)
      );

      await expect(Promise.all(promises)).rejects.toThrow();
    });

    it('should require MFA when enabled', async () => {
      const result = await authService.login(mockCredentials, mockContext);
      expect(result).toHaveProperty('mfaRequired');
    });

    it('should track suspicious login attempts', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await authService.login(
            { ...mockCredentials, password: 'wrong' },
            mockContext
          );
        } catch (error) {
          // Expected
        }
      }

      // Next attempt should be flagged as suspicious
      await expect(authService.login(mockCredentials, mockContext))
        .rejects.toThrow();
    });
  });

  describe('MFA Security', () => {
    it('should validate MFA tokens securely', async () => {
      const result = await authService.verifyMfa(
        TEST_USER_ID,
        '123456',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date().toISOString()
        }
      );

      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid MFA tokens', async () => {
      await expect(authService.verifyMfa(
        TEST_USER_ID,
        'invalid',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date().toISOString()
        }
      )).rejects.toThrow();
    });
  });

  describe('Session Security', () => {
    it('should track session metadata securely', async () => {
      const result = await authService.login(
        {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          deviceId: 'test-device-123'
        },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date().toISOString(),
          sessionId: 'test-session-123'
        }
      );

      expect(result.securityMetadata).toHaveProperty('lastLogin');
      expect(result.securityMetadata).toHaveProperty('deviceInfo');
      expect(result.securityMetadata).toHaveProperty('location');
      expect(result.securityMetadata).toHaveProperty('mfaVerified');
    });
  });
});