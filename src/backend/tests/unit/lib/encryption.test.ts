import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { randomBytes } from 'crypto';
import { EncryptionService } from '../../../src/lib/encryption/encryption.service';
import { KeyService } from '../../../src/lib/encryption/key.service';
import { Logger } from 'winston';
import { Meter } from '@opentelemetry/metrics';

/**
 * Generates cryptographically secure random test data
 * @param size Size of data to generate
 * @returns Buffer of random test data
 */
const generateTestData = (size: number): Buffer => {
  return randomBytes(size);
};

/**
 * Securely cleans up sensitive test data
 * @param data Buffer to clean
 */
const cleanupSensitiveData = (data: Buffer): void => {
  data.fill(0);
};

/**
 * Mock implementation of KeyService for testing
 */
class MockKeyService implements Partial<KeyService> {
  private currentKey: Buffer;
  private currentKeyVersion: string;
  private keyHistory: Map<string, Buffer>;

  constructor() {
    this.currentKey = randomBytes(32);
    this.currentKeyVersion = 'key-test-1';
    this.keyHistory = new Map();
    this.keyHistory.set(this.currentKeyVersion, this.currentKey);
  }

  async getCurrentKey() {
    return { key: this.currentKey, version: this.currentKeyVersion };
  }

  async getKeyVersion(version: string) {
    const key = this.keyHistory.get(version);
    if (!key) throw new Error('Key version not found');
    return key;
  }

  async rotateKey() {
    this.keyHistory.set(this.currentKeyVersion, this.currentKey);
    this.currentKey = randomBytes(32);
    this.currentKeyVersion = `key-test-${this.keyHistory.size + 1}`;
    this.keyHistory.set(this.currentKeyVersion, this.currentKey);
  }
}

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  let keyService: MockKeyService;
  let mockLogger: jest.Mocked<Logger>;
  let mockMeter: jest.Mocked<Meter>;

  beforeEach(() => {
    // Setup mocks
    keyService = new MockKeyService();
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    mockMeter = {
      createCounter: jest.fn().mockReturnValue({ add: jest.fn() }),
      createHistogram: jest.fn().mockReturnValue({ record: jest.fn() })
    } as unknown as jest.Mocked<Meter>;

    encryptionService = new EncryptionService(
      keyService as unknown as KeyService,
      mockMeter,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt/decrypt operations', () => {
    test('should encrypt and decrypt data correctly', async () => {
      // Generate test data
      const testData = generateTestData(1024);
      
      try {
        // Encrypt data
        const encrypted = await encryptionService.encrypt(testData);
        expect(encrypted.success).toBe(true);
        expect(encrypted.data.ciphertext).toBeDefined();
        expect(encrypted.data.iv.length).toBe(12); // IV length check
        expect(encrypted.data.authTag.length).toBe(16); // Auth tag length check
        
        // Verify encrypted data is different from original
        expect(Buffer.compare(testData, encrypted.data.ciphertext)).not.toBe(0);
        
        // Decrypt data
        const decrypted = await encryptionService.decrypt(
          encrypted.data.ciphertext,
          encrypted.data.iv,
          encrypted.data.authTag,
          encrypted.data.keyVersion
        );
        
        // Verify decryption
        expect(decrypted.success).toBe(true);
        expect(Buffer.compare(testData, decrypted.data)).toBe(0);
      } finally {
        cleanupSensitiveData(testData);
      }
    });

    test('should handle different data sizes correctly', async () => {
      const testSizes = [64, 1024, 1024 * 1024]; // Test different sizes
      
      for (const size of testSizes) {
        const testData = generateTestData(size);
        
        try {
          const encrypted = await encryptionService.encrypt(testData);
          const decrypted = await encryptionService.decrypt(
            encrypted.data.ciphertext,
            encrypted.data.iv,
            encrypted.data.authTag,
            encrypted.data.keyVersion
          );
          
          expect(Buffer.compare(testData, decrypted.data)).toBe(0);
        } finally {
          cleanupSensitiveData(testData);
        }
      }
    });
  });

  describe('field-level encryption', () => {
    test('should encrypt and decrypt field values with metadata', async () => {
      const testValue = 'sensitive-data-123';
      const context = 'user.email';
      
      // Encrypt field
      const encrypted = await encryptionService.encryptField(testValue, { context });
      expect(encrypted.success).toBe(true);
      
      // Verify encrypted format
      const encryptedStr = encrypted.data;
      expect(typeof encryptedStr).toBe('string');
      expect(encryptedStr).toContain('|'); // Metadata separator
      
      // Decrypt field
      const decrypted = await encryptionService.decryptField(encryptedStr);
      expect(decrypted.success).toBe(true);
      expect(decrypted.data).toBe(testValue);
    });

    test('should preserve metadata during field encryption', async () => {
      const testValue = 'test@example.com';
      const context = 'user.contact';
      
      const encrypted = await encryptionService.encryptField(testValue, { context });
      const encryptedData = Buffer.from(encrypted.data, 'base64');
      const [metadataStr] = encryptedData.toString().split('|');
      const metadata = JSON.parse(metadataStr);
      
      expect(metadata.context).toBe(context);
      expect(metadata.version).toBeDefined();
      expect(metadata.iv).toBeDefined();
      expect(metadata.authTag).toBeDefined();
    });
  });

  describe('key rotation', () => {
    test('should handle encryption with rotated keys', async () => {
      // Encrypt data with current key
      const testData = generateTestData(1024);
      const encrypted1 = await encryptionService.encrypt(testData);
      
      // Rotate key
      await keyService.rotateKey();
      
      // Encrypt new data with new key
      const encrypted2 = await encryptionService.encrypt(testData);
      
      try {
        // Verify both can be decrypted
        const decrypted1 = await encryptionService.decrypt(
          encrypted1.data.ciphertext,
          encrypted1.data.iv,
          encrypted1.data.authTag,
          encrypted1.data.keyVersion
        );
        
        const decrypted2 = await encryptionService.decrypt(
          encrypted2.data.ciphertext,
          encrypted2.data.iv,
          encrypted2.data.authTag,
          encrypted2.data.keyVersion
        );
        
        expect(Buffer.compare(testData, decrypted1.data)).toBe(0);
        expect(Buffer.compare(testData, decrypted2.data)).toBe(0);
        expect(encrypted1.data.keyVersion).not.toBe(encrypted2.data.keyVersion);
      } finally {
        cleanupSensitiveData(testData);
      }
    });
  });

  describe('error handling', () => {
    test('should handle invalid auth tag', async () => {
      const testData = generateTestData(1024);
      
      try {
        const encrypted = await encryptionService.encrypt(testData);
        const invalidAuthTag = randomBytes(16);
        
        await expect(
          encryptionService.decrypt(
            encrypted.data.ciphertext,
            encrypted.data.iv,
            invalidAuthTag,
            encrypted.data.keyVersion
          )
        ).rejects.toThrow();
      } finally {
        cleanupSensitiveData(testData);
      }
    });

    test('should handle corrupted ciphertext', async () => {
      const testData = generateTestData(1024);
      
      try {
        const encrypted = await encryptionService.encrypt(testData);
        const corruptedCiphertext = Buffer.from(encrypted.data.ciphertext);
        corruptedCiphertext[0] ^= 1; // Flip one bit
        
        await expect(
          encryptionService.decrypt(
            corruptedCiphertext,
            encrypted.data.iv,
            encrypted.data.authTag,
            encrypted.data.keyVersion
          )
        ).rejects.toThrow();
      } finally {
        cleanupSensitiveData(testData);
      }
    });

    test('should handle invalid key version', async () => {
      const testData = generateTestData(1024);
      
      try {
        const encrypted = await encryptionService.encrypt(testData);
        
        await expect(
          encryptionService.decrypt(
            encrypted.data.ciphertext,
            encrypted.data.iv,
            encrypted.data.authTag,
            'invalid-key-version'
          )
        ).rejects.toThrow();
      } finally {
        cleanupSensitiveData(testData);
      }
    });
  });
});