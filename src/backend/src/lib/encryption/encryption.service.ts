import { injectable } from 'tsyringe';
import { crypto } from 'crypto';
import { Logger } from 'winston';
import { Meter, Counter, Histogram } from '@opentelemetry/metrics';
import LRU from 'lru-cache';
import { KeyService } from './key.service';
import { ApiResponse } from '../../types/common.types';

// Constants for encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL = 300000; // 5 minutes

/**
 * Interface for encryption operation options
 */
interface EncryptionOptions {
  readonly context?: string;
  readonly ttl?: number;
}

/**
 * Interface for encrypted field metadata
 */
interface EncryptedFieldMetadata {
  readonly version: string;
  readonly iv: string;
  readonly authTag: string;
  readonly context?: string;
}

/**
 * Generates a cryptographically secure random initialization vector
 * @returns {Buffer} Random initialization vector
 */
function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Service responsible for data encryption and decryption operations
 * Implements FIPS 140-2 compliant encryption with comprehensive monitoring
 * @version 1.0.0
 */
@injectable()
export class EncryptionService {
  private readonly operationCache: LRU<string, Buffer>;
  private readonly encryptionCounter: Counter;
  private readonly decryptionCounter: Counter;
  private readonly operationDuration: Histogram;
  private readonly logger: Logger;

  constructor(
    private readonly keyService: KeyService,
    private readonly metrics: Meter,
    logger: Logger
  ) {
    // Verify FIPS mode is enabled
    if (!crypto.getFips()) {
      throw new Error('FIPS mode is required but not enabled');
    }

    this.logger = logger;
    this.operationCache = new LRU({
      max: MAX_CACHE_SIZE,
      ttl: CACHE_TTL,
      updateAgeOnGet: true
    });

    // Initialize metrics
    this.encryptionCounter = this.metrics.createCounter('encryption_operations_total');
    this.decryptionCounter = this.metrics.createCounter('decryption_operations_total');
    this.operationDuration = this.metrics.createHistogram('encryption_operation_duration_ms');
  }

  /**
   * Encrypts data using AES-256-GCM with comprehensive monitoring
   * @param {Buffer | string} data - Data to encrypt
   * @returns {Promise<ApiResponse>} Encrypted data with metadata
   */
  public async encrypt(data: Buffer | string): Promise<ApiResponse<{
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
    keyVersion: string;
  }>> {
    const startTime = process.hrtime();

    try {
      // Convert string to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      // Get current encryption key
      const { key, version } = await this.keyService.getCurrentKey();
      
      // Generate IV
      const iv = generateIV();

      // Create cipher
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

      // Encrypt data
      const ciphertext = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.operationDuration.record(seconds * 1000 + nanoseconds / 1e6);
      this.encryptionCounter.add(1);

      this.logger.debug('Data encrypted successfully', { keyVersion: version });

      return {
        success: true,
        data: { ciphertext, iv, authTag, keyVersion: version },
        error: null,
        metadata: {
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: crypto.randomUUID()
        }
      };
    } catch (error) {
      this.logger.error('Encryption failed', { error });
      throw error;
    }
  }

  /**
   * Decrypts data using AES-256-GCM with validation and monitoring
   * @param {Buffer} ciphertext - Encrypted data
   * @param {Buffer} iv - Initialization vector
   * @param {Buffer} authTag - Authentication tag
   * @param {string} keyVersion - Version of the key used for encryption
   * @returns {Promise<ApiResponse>} Decrypted data
   */
  public async decrypt(
    ciphertext: Buffer,
    iv: Buffer,
    authTag: Buffer,
    keyVersion: string
  ): Promise<ApiResponse<Buffer>> {
    const startTime = process.hrtime();
    const cacheKey = `${keyVersion}:${iv.toString('hex')}`;

    try {
      // Check cache
      const cachedResult = this.operationCache.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          error: null,
          metadata: {
            apiVersion: '1.0.0',
            timestamp: Date.now(),
            requestId: crypto.randomUUID()
          }
        };
      }

      // Get key for version
      const key = await this.keyService.getKeyVersion(keyVersion);

      // Create decipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      // Cache result
      this.operationCache.set(cacheKey, decrypted);

      // Record metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.operationDuration.record(seconds * 1000 + nanoseconds / 1e6);
      this.decryptionCounter.add(1);

      this.logger.debug('Data decrypted successfully', { keyVersion });

      return {
        success: true,
        data: decrypted,
        error: null,
        metadata: {
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: crypto.randomUUID()
        }
      };
    } catch (error) {
      this.logger.error('Decryption failed', { error, keyVersion });
      throw error;
    }
  }

  /**
   * Encrypts a single field value with metadata
   * @param {string} value - Value to encrypt
   * @param {EncryptionOptions} options - Encryption options
   * @returns {Promise<ApiResponse>} Encrypted value with metadata
   */
  public async encryptField(
    value: string,
    options: EncryptionOptions = {}
  ): Promise<ApiResponse<string>> {
    try {
      const buffer = Buffer.from(value);
      const encrypted = await this.encrypt(buffer);

      if (!encrypted.success) {
        throw new Error('Encryption failed');
      }

      // Create metadata
      const metadata: EncryptedFieldMetadata = {
        version: encrypted.data.keyVersion,
        iv: encrypted.data.iv.toString('base64'),
        authTag: encrypted.data.authTag.toString('base64'),
        ...(options.context && { context: options.context })
      };

      // Combine metadata and encrypted data
      const result = Buffer.concat([
        Buffer.from(JSON.stringify(metadata)),
        Buffer.from('|'),
        encrypted.data.ciphertext
      ]);

      return {
        success: true,
        data: result.toString('base64'),
        error: null,
        metadata: encrypted.metadata
      };
    } catch (error) {
      this.logger.error('Field encryption failed', { error });
      throw error;
    }
  }

  /**
   * Decrypts a single field value
   * @param {string} encryptedValue - Encrypted field value
   * @returns {Promise<ApiResponse>} Decrypted field value
   */
  public async decryptField(encryptedValue: string): Promise<ApiResponse<string>> {
    try {
      // Decode base64
      const buffer = Buffer.from(encryptedValue, 'base64');
      
      // Split metadata and ciphertext
      const [metadataStr, ciphertext] = buffer.toString().split('|');
      
      // Parse metadata
      const metadata: EncryptedFieldMetadata = JSON.parse(metadataStr);

      // Decrypt data
      const decrypted = await this.decrypt(
        Buffer.from(ciphertext, 'base64'),
        Buffer.from(metadata.iv, 'base64'),
        Buffer.from(metadata.authTag, 'base64'),
        metadata.version
      );

      if (!decrypted.success) {
        throw new Error('Decryption failed');
      }

      return {
        success: true,
        data: decrypted.data.toString(),
        error: null,
        metadata: decrypted.metadata
      };
    } catch (error) {
      this.logger.error('Field decryption failed', { error });
      throw error;
    }
  }
}