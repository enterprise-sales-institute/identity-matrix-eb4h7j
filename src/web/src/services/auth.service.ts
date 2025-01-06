/**
 * @fileoverview Enhanced authentication service implementing secure user authentication,
 * token management, MFA support, and role-based authorization using Auth0
 * @version 1.0.0
 */

// External imports
import { Auth0Client } from '@auth0/auth0-spa-js'; // v2.1.0
import axios from 'axios'; // v1.4.0
import { SecurityUtils } from '@security/utils'; // v1.0.0

// Internal imports
import {
  User,
  LoginCredentials,
  AuthResponse,
  TokenData,
  SessionMetadata,
  SecurityAuditLog,
  UserRole,
  MFAConfig,
  SessionStatus,
  OAuthProvider
} from '../types/auth.types';

/**
 * Configuration interface for Auth0 client initialization
 */
interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  scope: string;
  redirectUri: string;
}

/**
 * Enhanced authentication service class implementing secure authentication operations
 */
export class AuthService {
  private auth0Client: Auth0Client;
  private readonly apiBaseUrl: string;
  private readonly securityUtils: SecurityUtils;
  private currentSession: SessionMetadata | null = null;
  private readonly TOKEN_REFRESH_THRESHOLD = 300; // 5 minutes in seconds

  constructor() {
    // Initialize Auth0 client with secure configuration
    const auth0Config: Auth0Config = {
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      audience: process.env.AUTH0_AUDIENCE!,
      scope: 'openid profile email',
      redirectUri: `${window.location.origin}/auth/callback`
    };

    this.auth0Client = new Auth0Client(auth0Config);
    this.apiBaseUrl = process.env.API_BASE_URL!;
    this.securityUtils = new SecurityUtils();

    // Configure secure axios defaults
    axios.defaults.baseURL = this.apiBaseUrl;
    axios.defaults.timeout = 10000;
    axios.interceptors.request.use(this.securityUtils.addSecurityHeaders);
    axios.interceptors.response.use(
      response => response,
      this.handleAuthError.bind(this)
    );
  }

  /**
   * Enhanced login process with MFA support and security validations
   * @param credentials User login credentials with optional MFA token
   * @returns Promise resolving to authentication response
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate input credentials
      this.validateCredentials(credentials);

      // Initiate Auth0 authentication
      const auth0Response = await this.auth0Client.loginWithCredentials({
        username: credentials.email,
        password: credentials.password,
        realm: 'Username-Password-Authentication'
      });

      // Handle MFA if enabled
      if (auth0Response.mfa_required && !credentials.mfaToken) {
        return {
          mfaRequired: true,
          user: null,
          token: null,
          sessionMetadata: null
        } as unknown as AuthResponse;
      }

      // Complete authentication with MFA
      const authResult = credentials.mfaToken
        ? await this.completeMFAAuthentication(auth0Response.mfa_token, credentials.mfaToken)
        : auth0Response;

      // Generate session and tokens
      const tokenData = await this.generateSecureTokens(authResult);
      const user = await this.fetchUserProfile(authResult.sub);
      const sessionMetadata = this.createSessionMetadata();

      // Create secure session
      this.currentSession = sessionMetadata;
      await this.storeSecureSession(tokenData, sessionMetadata);

      // Log successful authentication
      await this.logSecurityAudit({
        userId: user.id,
        action: 'LOGIN',
        timestamp: new Date(),
        ipAddress: sessionMetadata.ipAddress,
        userAgent: sessionMetadata.userAgent,
        details: { success: true }
      });

      return {
        user,
        token: tokenData,
        mfaRequired: false,
        sessionMetadata
      };
    } catch (error) {
      await this.handleAuthenticationError(error, credentials.email);
      throw error;
    }
  }

  /**
   * Validates current session security and token status
   * @returns Promise resolving to session validity status
   */
  public async validateSession(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        return false;
      }

      const tokenData = await this.securityUtils.getStoredTokens();
      if (!tokenData) {
        return false;
      }

      // Verify token validity
      const isTokenValid = await this.verifyToken(tokenData.accessToken);
      if (!isTokenValid) {
        // Attempt token refresh if close to expiration
        if (await this.shouldRefreshToken(tokenData)) {
          await this.refreshSecureToken();
          return true;
        }
        return false;
      }

      // Validate session metadata
      const isSessionValid = await this.validateSessionMetadata(this.currentSession);
      if (!isSessionValid) {
        await this.revokeSession();
        return false;
      }

      return true;
    } catch (error) {
      await this.logSecurityAudit({
        userId: 'UNKNOWN',
        action: 'SESSION_VALIDATION_ERROR',
        timestamp: new Date(),
        ipAddress: this.currentSession?.ipAddress || 'UNKNOWN',
        userAgent: this.currentSession?.userAgent || 'UNKNOWN',
        details: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Enhanced token refresh with rotation and security validation
   * @returns Promise resolving to new token data
   */
  public async refreshSecureToken(): Promise<TokenData> {
    try {
      const currentTokens = await this.securityUtils.getStoredTokens();
      if (!currentTokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Perform token refresh through Auth0
      const authResult = await this.auth0Client.refreshTokens({
        refreshToken: currentTokens.refreshToken
      });

      // Generate and validate new tokens
      const newTokenData = await this.generateSecureTokens(authResult);
      await this.validateTokenRotation(currentTokens, newTokenData);

      // Update session with new tokens
      await this.storeSecureSession(newTokenData, this.currentSession!);

      // Log token refresh
      await this.logSecurityAudit({
        userId: (await this.fetchUserProfile(authResult.sub)).id,
        action: 'TOKEN_REFRESH',
        timestamp: new Date(),
        ipAddress: this.currentSession?.ipAddress || 'UNKNOWN',
        userAgent: this.currentSession?.userAgent || 'UNKNOWN',
        details: { success: true }
      });

      return newTokenData;
    } catch (error) {
      await this.handleTokenRefreshError(error);
      throw error;
    }
  }

  /**
   * Logs out user and revokes all sessions
   */
  public async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        await this.revokeSession();
        await this.auth0Client.logout({
          returnTo: window.location.origin
        });
        
        // Clear local session data
        this.currentSession = null;
        await this.securityUtils.clearSecureStorage();
      }
    } catch (error) {
      await this.logSecurityAudit({
        userId: 'UNKNOWN',
        action: 'LOGOUT_ERROR',
        timestamp: new Date(),
        ipAddress: this.currentSession?.ipAddress || 'UNKNOWN',
        userAgent: this.currentSession?.userAgent || 'UNKNOWN',
        details: { error: error.message }
      });
      throw error;
    }
  }

  // Private helper methods

  private async validateCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Invalid credentials provided');
    }
    // Additional credential validation logic
  }

  private async completeMFAAuthentication(mfaToken: string, otp: string): Promise<any> {
    return this.auth0Client.mfaVerify({
      mfaToken,
      otp
    });
  }

  private async generateSecureTokens(authResult: any): Promise<TokenData> {
    return {
      accessToken: authResult.access_token,
      refreshToken: authResult.refresh_token,
      expiresIn: authResult.expires_in,
      tokenType: authResult.token_type
    };
  }

  private createSessionMetadata(): SessionMetadata {
    return {
      deviceId: this.securityUtils.generateDeviceId(),
      ipAddress: this.securityUtils.getClientIP(),
      userAgent: navigator.userAgent,
      lastActive: new Date(),
      isActive: true
    };
  }

  private async storeSecureSession(
    tokenData: TokenData,
    sessionMetadata: SessionMetadata
  ): Promise<void> {
    await this.securityUtils.storeTokensSecurely(tokenData);
    await this.securityUtils.storeSessionData(sessionMetadata);
  }

  private async handleAuthenticationError(error: any, email: string): Promise<void> {
    await this.logSecurityAudit({
      userId: 'UNKNOWN',
      action: 'LOGIN_ERROR',
      timestamp: new Date(),
      ipAddress: this.securityUtils.getClientIP(),
      userAgent: navigator.userAgent,
      details: { error: error.message, email }
    });
  }

  private async handleAuthError(error: any): Promise<never> {
    if (error.response?.status === 401) {
      await this.revokeSession();
    }
    throw error;
  }

  private async logSecurityAudit(logEntry: SecurityAuditLog): Promise<void> {
    try {
      await axios.post('/api/security/audit', logEntry);
    } catch (error) {
      console.error('Failed to log security audit', error);
    }
  }

  private async fetchUserProfile(userId: string): Promise<User> {
    const response = await axios.get(`/api/users/${userId}`);
    return response.data;
  }

  private async verifyToken(token: string): Promise<boolean> {
    try {
      await this.auth0Client.getTokenSilently();
      return true;
    } catch {
      return false;
    }
  }

  private async shouldRefreshToken(tokenData: TokenData): Promise<boolean> {
    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
    const now = new Date();
    return (expiresAt.getTime() - now.getTime()) / 1000 < this.TOKEN_REFRESH_THRESHOLD;
  }

  private async validateSessionMetadata(
    sessionMetadata: SessionMetadata
  ): Promise<boolean> {
    // Implement session validation logic
    return true;
  }

  private async validateTokenRotation(
    oldTokens: TokenData,
    newTokens: TokenData
  ): Promise<void> {
    if (oldTokens.accessToken === newTokens.accessToken) {
      throw new Error('Token rotation failed - tokens are identical');
    }
  }

  private async revokeSession(): Promise<void> {
    if (this.currentSession) {
      await axios.post('/api/auth/revoke', {
        sessionId: this.currentSession.deviceId
      });
    }
  }

  private async handleTokenRefreshError(error: any): Promise<void> {
    await this.logSecurityAudit({
      userId: 'UNKNOWN',
      action: 'TOKEN_REFRESH_ERROR',
      timestamp: new Date(),
      ipAddress: this.currentSession?.ipAddress || 'UNKNOWN',
      userAgent: this.currentSession?.userAgent || 'UNKNOWN',
      details: { error: error.message }
    });
  }
}