/**
 * Type definitions and interfaces for application configuration
 * Includes server, database, authentication and system settings
 * @version 1.0.0
 */

// Environment and Log Level Types
export type Environment = 'development' | 'staging' | 'production' | 'test';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
export type MFAType = 'totp' | 'sms' | 'email' | 'webauthn' | 'biometric';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';

// CORS Configuration Interface
export interface CorsConfig {
  readonly origins: string[];
  readonly methods: string[];
  readonly allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  validateOrigin: boolean;
}

// Rate Limiting Configuration Interface
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  keyGenerator: string;
  handler: string;
  skipSuccessfulRequests: boolean;
  whitelist: string[];
}

// Database Pool Configuration Interface
export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// SSL Configuration Interface
export interface SSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  key?: string;
  cert?: string;
}

// Replication Configuration Interface
export interface ReplicationConfig {
  master: {
    host: string;
    port: number;
  };
  slaves: Array<{
    host: string;
    port: number;
  }>;
}

// PostgreSQL Configuration Interface
export interface PostgresConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  ssl: boolean;
  pool: PoolConfig;
  replication: ReplicationConfig;
  sslConfig: SSLConfig;
}

// ClickHouse Compression Configuration
export interface CompressionConfig {
  method: 'lz4' | 'zstd';
  level: number;
}

// ClickHouse Cluster Configuration
export interface ClusterConfig {
  name: string;
  nodes: Array<{
    host: string;
    port: number;
  }>;
}

// ClickHouse Configuration Interface
export interface ClickHouseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  pool: PoolConfig;
  compression: CompressionConfig;
  cluster: ClusterConfig;
}

// Redis Cluster Configuration
export interface RedisClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
  }>;
  options: {
    maxRedirections: number;
    retryDelayMs: number;
  };
}

// Redis Sentinel Configuration
export interface RedisSentinelConfig {
  masters: string;
  sentinels: Array<{
    host: string;
    port: number;
  }>;
}

// Redis Security Configuration
export interface RedisSecurityConfig {
  tls: boolean;
  tlsConfig?: {
    cert: string;
    key: string;
    ca: string;
  };
}

// Redis Configuration Interface
export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password: string;
  db: number;
  cluster: RedisClusterConfig;
  sentinel: RedisSentinelConfig;
  security: RedisSecurityConfig;
}

// Migration Configuration Interface
export interface MigrationConfig {
  directory: string;
  tableName: string;
  schemaName?: string;
  transactional: boolean;
}

// Backup Configuration Interface
export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: number;
  path: string;
  compress: boolean;
}

// JWT Configuration Interface
export interface JwtConfig {
  algorithm: JwtAlgorithm;
  secretKey: string;
  publicKey?: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

// OAuth Configuration Interface
export interface OAuthConfig {
  providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  scopes: string[];
}

// MFA Configuration Interface
export interface MFAConfig {
  enabled: boolean;
  types: MFAType[];
  issuer: string;
  window: number;
}

// Security Rate Limit Configuration
export interface SecurityRateLimitConfig {
  login: RateLimitConfig;
  register: RateLimitConfig;
  forgotPassword: RateLimitConfig;
}

// Encryption Configuration Interface
export interface EncryptionConfig {
  readonly algorithm: EncryptionAlgorithm;
  readonly keySize: string;
  readonly secretKey: string;
  enableAtRest: boolean;
  enableInTransit: boolean;
  sensitiveFields: string[];
}

// Logging Configuration Interface
export interface LoggingConfig {
  level: LogLevel;
  format: string;
  enableConsole: boolean;
  enableFile: boolean;
  directory: string;
  maxFiles: number;
  maxSize: number;
}

// Main Configuration Interfaces
export interface ServerConfig {
  port: number;
  host: string;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  env: Environment;
  logging: LoggingConfig;
}

export interface DatabaseConfig {
  postgres: PostgresConfig;
  clickhouse: ClickHouseConfig;
  redis: RedisConfig;
  migrations: MigrationConfig;
  backup: BackupConfig;
}

export interface SecurityConfig {
  jwt: JwtConfig;
  oauth: OAuthConfig;
  mfa: MFAConfig;
  rateLimit: SecurityRateLimitConfig;
  encryption: EncryptionConfig;
}