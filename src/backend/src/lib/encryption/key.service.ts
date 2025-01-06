import { KMS } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { retry } from 'retry';
import CircuitBreaker from 'opossum';
import { Logger } from 'winston';
import { injectable, singleton } from 'tsyringe';
import { ApiResponse } from '../../types/common.types';

/**
 * Service responsible for encryption key management using AWS KMS
 * Implements secure key rotation, versioning, and caching
 * @version 1.0.0
 */
@injectable()
@singleton()
export class KeyService {
  private readonly kmsClient: KMS;
  private readonly keyCache: Map<string, Buffer>;
  private readonly kmsCircuitBreaker: CircuitBreaker;
  private readonly logger: Logger;
  private rotationTimer: NodeJS.Timer;

  // Global constants
  private readonly KEY_ROTATION_INTERVAL_DAYS = 90;
  private readonly KEY_ALIAS = 'attribution-analytics-key';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CACHE_MAX_SIZE = 100;
  private readonly CIRCUIT_BREAKER_OPTIONS = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  };

  constructor(logger: Logger) {
    this.logger = logger;
    this.keyCache = new Map();
    
    // Initialize AWS KMS client
    this.kmsClient = new KMS({
      apiVersion: '2014-11-01',
      region: process.env.AWS_REGION,
      maxRetries: this.MAX_RETRY_ATTEMPTS
    });

    // Setup circuit breaker for KMS operations
    this.kmsCircuitBreaker = new CircuitBreaker(
      this.kmsClient.generateDataKey.bind(this.kmsClient),
      this.CIRCUIT_BREAKER_OPTIONS
    );

    // Setup key rotation schedule
    this.setupKeyRotation();
    
    // Setup circuit breaker event handlers
    this.setupCircuitBreakerMonitoring();
  }

  /**
   * Generates a unique key identifier with version information
   * @returns {string} Unique key identifier
   */
  private generateKeyId(): string {
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `key-${uuid}-${timestamp}`;
  }

  /**
   * Retrieves the current active encryption key
   * @returns {Promise<{key: Buffer, version: string}>} Current key and version
   */
  public async getCurrentKey(): Promise<{ key: Buffer; version: string }> {
    try {
      const currentVersion = await this.kmsClient
        .listAliases({
          KeyId: this.KEY_ALIAS
        })
        .promise();

      const keyId = currentVersion.Aliases?.[0]?.TargetKeyId;
      
      if (!keyId) {
        throw new Error('No active key found');
      }

      // Check cache first
      const cachedKey = this.keyCache.get(keyId);
      if (cachedKey) {
        return { key: cachedKey, version: keyId };
      }

      // Generate new data key if not in cache
      const keyData = await this.kmsCircuitBreaker.fire({
        KeyId: keyId,
        KeySpec: 'AES_256'
      });

      const keyBuffer = Buffer.from(keyData.Plaintext as Buffer);
      
      // Cache the key
      this.keyCache.set(keyId, keyBuffer);
      
      // Maintain cache size limit
      if (this.keyCache.size > this.CACHE_MAX_SIZE) {
        const oldestKey = this.keyCache.keys().next().value;
        this.keyCache.delete(oldestKey);
      }

      this.logger.info('Generated new current key', { keyId });
      
      return { key: keyBuffer, version: keyId };
    } catch (error) {
      this.logger.error('Error retrieving current key', { error });
      throw error;
    }
  }

  /**
   * Retrieves a specific key version
   * @param {string} keyVersion - Version of the key to retrieve
   * @returns {Promise<Buffer>} Encryption key
   */
  public async getKeyVersion(keyVersion: string): Promise<Buffer> {
    try {
      // Validate key version format
      if (!/^key-[\w-]+-\d+$/.test(keyVersion)) {
        throw new Error('Invalid key version format');
      }

      // Check cache first
      const cachedKey = this.keyCache.get(keyVersion);
      if (cachedKey) {
        return cachedKey;
      }

      // Setup retry operation
      const operation = retry.operation({
        retries: this.MAX_RETRY_ATTEMPTS,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000
      });

      return new Promise((resolve, reject) => {
        operation.attempt(async (currentAttempt) => {
          try {
            const keyData = await this.kmsClient
              .generateDataKey({
                KeyId: keyVersion,
                KeySpec: 'AES_256'
              })
              .promise();

            const keyBuffer = Buffer.from(keyData.Plaintext as Buffer);
            this.keyCache.set(keyVersion, keyBuffer);
            
            this.logger.info('Retrieved specific key version', { 
              keyVersion, 
              attempt: currentAttempt 
            });
            
            resolve(keyBuffer);
          } catch (error) {
            if (operation.retry(error as Error)) {
              return;
            }
            reject(operation.mainError());
          }
        });
      });
    } catch (error) {
      this.logger.error('Error retrieving key version', { keyVersion, error });
      throw error;
    }
  }

  /**
   * Rotates the current encryption key
   * @returns {Promise<void>}
   */
  public async rotateKey(): Promise<void> {
    try {
      // Generate new key
      const newKeyId = this.generateKeyId();
      
      // Create new key in KMS
      const newKey = await this.kmsClient
        .createKey({
          Description: `Attribution Analytics Key - Created ${new Date().toISOString()}`,
          KeyUsage: 'ENCRYPT_DECRYPT',
          Origin: 'AWS_KMS'
        })
        .promise();

      if (!newKey.KeyMetadata?.KeyId) {
        throw new Error('Failed to create new key');
      }

      // Update alias to point to new key
      await this.kmsClient
        .updateAlias({
          AliasName: this.KEY_ALIAS,
          TargetKeyId: newKey.KeyMetadata.KeyId
        })
        .promise();

      // Generate and cache new data key
      const newDataKey = await this.kmsClient
        .generateDataKey({
          KeyId: newKey.KeyMetadata.KeyId,
          KeySpec: 'AES_256'
        })
        .promise();

      const keyBuffer = Buffer.from(newDataKey.Plaintext as Buffer);
      this.keyCache.set(newKey.KeyMetadata.KeyId, keyBuffer);

      this.logger.info('Successfully rotated encryption key', { 
        newKeyId: newKey.KeyMetadata.KeyId 
      });
    } catch (error) {
      this.logger.error('Error rotating encryption key', { error });
      throw error;
    }
  }

  /**
   * Sets up automatic key rotation schedule
   */
  private setupKeyRotation(): void {
    const rotationInterval = this.KEY_ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
    
    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateKey();
      } catch (error) {
        this.logger.error('Scheduled key rotation failed', { error });
      }
    }, rotationInterval);
  }

  /**
   * Sets up circuit breaker monitoring
   */
  private setupCircuitBreakerMonitoring(): void {
    this.kmsCircuitBreaker.on('open', () => {
      this.logger.warn('KMS circuit breaker opened');
    });

    this.kmsCircuitBreaker.on('halfOpen', () => {
      this.logger.info('KMS circuit breaker half-open');
    });

    this.kmsCircuitBreaker.on('close', () => {
      this.logger.info('KMS circuit breaker closed');
    });

    this.kmsCircuitBreaker.on('fallback', () => {
      this.logger.error('KMS operation fallback triggered');
    });
  }
}