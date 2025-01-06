/**
 * @fileoverview Enterprise-grade storage service with encryption, TTL support, and quota management
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { StorageType } from '../utils/storage.utils';
import { ErrorType } from '../types/common.types';

/**
 * Interface for storage item metadata
 */
interface StorageMetadata {
  timestamp: number;
  ttl?: number;
  encrypted: boolean;
  version: string;
}

/**
 * Interface for wrapped storage items
 */
interface StorageWrapper<T> {
  data: T;
  metadata: StorageMetadata;
}

/**
 * Enterprise-grade storage service implementing secure client-side storage operations
 */
export class StorageService {
  private readonly encryptionKey: string;
  private readonly ttlMap: Map<string, number>;
  private readonly decryptionCache: Map<string, any>;
  private readonly maxStorageQuota: number;
  private readonly VERSION = '1.0.0';
  private readonly CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

  /**
   * Creates a new StorageService instance
   * @param encryptionKey - Key used for AES-256 encryption
   * @param maxStorageQuota - Maximum storage quota in bytes (default: 5MB)
   */
  constructor(encryptionKey: string, maxStorageQuota: number = 5 * 1024 * 1024) {
    this.encryptionKey = encryptionKey;
    this.maxStorageQuota = maxStorageQuota;
    this.ttlMap = new Map();
    this.decryptionCache = new Map();

    // Initialize cleanup interval
    setInterval(() => this.cleanupExpiredItems(), this.CACHE_CLEANUP_INTERVAL);

    // Setup storage event listener for cross-tab synchronization
    window.addEventListener('storage', this.handleStorageEvent);
  }

  /**
   * Sets an item in the specified storage with encryption and TTL support
   * @param key - Storage key
   * @param value - Value to store
   * @param storageType - Type of storage (LOCAL or SESSION)
   * @param encrypt - Whether to encrypt the data
   * @param ttl - Time-to-live in milliseconds
   */
  public async setItem<T>(
    key: string,
    value: T,
    storageType: StorageType = StorageType.LOCAL,
    encrypt: boolean = false,
    ttl?: number
  ): Promise<void> {
    try {
      // Check storage availability
      const storage = window[storageType];
      if (!storage) {
        throw new Error(`${storageType} is not available`);
      }

      // Check quota before storing
      await this.handleQuota(JSON.stringify(value).length);

      // Prepare storage wrapper
      const wrapper: StorageWrapper<T> = {
        data: value,
        metadata: {
          timestamp: Date.now(),
          ttl,
          encrypted: encrypt,
          version: this.VERSION
        }
      };

      let serializedData = JSON.stringify(wrapper);

      // Encrypt if specified
      if (encrypt) {
        serializedData = CryptoJS.AES.encrypt(
          serializedData,
          this.encryptionKey
        ).toString();
      }

      // Store the data
      storage.setItem(key, serializedData);

      // Update TTL map if TTL is specified
      if (ttl) {
        this.ttlMap.set(key, Date.now() + ttl);
      }

      // Update decryption cache for performance
      if (!encrypt) {
        this.decryptionCache.set(key, value);
      }

      // Dispatch storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent('storage', { key, newValue: serializedData })
      );
    } catch (error) {
      throw new Error(`Storage operation failed: ${error.message}`);
    }
  }

  /**
   * Retrieves an item from storage with automatic decryption and TTL validation
   * @param key - Storage key
   * @param storageType - Type of storage (LOCAL or SESSION)
   * @param encrypted - Whether the item is encrypted
   * @returns Retrieved value or null if expired/not found
   */
  public async getItem<T>(
    key: string,
    storageType: StorageType = StorageType.LOCAL,
    encrypted: boolean = false
  ): Promise<T | null> {
    try {
      // Check TTL expiration
      if (this.ttlMap.has(key) && Date.now() > this.ttlMap.get(key)!) {
        this.removeItem(key, storageType);
        return null;
      }

      // Check decryption cache for non-encrypted items
      if (!encrypted && this.decryptionCache.has(key)) {
        return this.decryptionCache.get(key) as T;
      }

      const storage = window[storageType];
      const serializedData = storage.getItem(key);

      if (!serializedData) {
        return null;
      }

      let wrapper: StorageWrapper<T>;

      if (encrypted) {
        const decrypted = CryptoJS.AES.decrypt(
          serializedData,
          this.encryptionKey
        ).toString(CryptoJS.enc.Utf8);
        wrapper = JSON.parse(decrypted);
      } else {
        wrapper = JSON.parse(serializedData);
      }

      // Validate version and TTL
      if (wrapper.metadata.version !== this.VERSION) {
        console.warn(`Version mismatch for key ${key}`);
      }

      if (
        wrapper.metadata.ttl &&
        Date.now() - wrapper.metadata.timestamp > wrapper.metadata.ttl
      ) {
        this.removeItem(key, storageType);
        return null;
      }

      // Update cache for non-encrypted items
      if (!encrypted) {
        this.decryptionCache.set(key, wrapper.data);
      }

      return wrapper.data;
    } catch (error) {
      throw new Error(`Failed to retrieve item: ${error.message}`);
    }
  }

  /**
   * Removes an item from storage and associated caches
   * @param key - Storage key
   * @param storageType - Type of storage (LOCAL or SESSION)
   */
  public removeItem(
    key: string,
    storageType: StorageType = StorageType.LOCAL
  ): void {
    try {
      const storage = window[storageType];
      storage.removeItem(key);
      this.ttlMap.delete(key);
      this.decryptionCache.delete(key);
    } catch (error) {
      throw new Error(`Failed to remove item: ${error.message}`);
    }
  }

  /**
   * Clears all items from specified storage and caches
   * @param storageType - Type of storage (LOCAL or SESSION)
   */
  public clear(storageType: StorageType = StorageType.LOCAL): void {
    try {
      const storage = window[storageType];
      storage.clear();
      this.ttlMap.clear();
      this.decryptionCache.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * Handles storage quota management using LRU eviction
   * @param requiredSpace - Required space in bytes
   */
  private async handleQuota(requiredSpace: number): Promise<void> {
    try {
      let currentSize = 0;
      const storage = window[StorageType.LOCAL];

      // Calculate current storage usage
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          currentSize += (storage.getItem(key) || '').length;
        }
      }

      // Check if quota would be exceeded
      if (currentSize + requiredSpace > this.maxStorageQuota) {
        // Implement LRU eviction
        const items = Array.from({ length: storage.length }, (_, i) => {
          const key = storage.key(i)!;
          const value = storage.getItem(key)!;
          return { key, timestamp: this.ttlMap.get(key) || Date.now(), size: value.length };
        });

        // Sort by LRU
        items.sort((a, b) => a.timestamp - b.timestamp);

        // Remove items until we have enough space
        let freedSpace = 0;
        for (const item of items) {
          if (currentSize + requiredSpace - freedSpace <= this.maxStorageQuota) {
            break;
          }
          this.removeItem(item.key);
          freedSpace += item.size;
        }
      }
    } catch (error) {
      throw new Error(`Quota management failed: ${error.message}`);
    }
  }

  /**
   * Handles storage events for cross-tab synchronization
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key && event.newValue) {
      // Clear decryption cache for updated keys
      this.decryptionCache.delete(event.key);
    }
  };

  /**
   * Cleans up expired items from storage
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (now > expiry) {
        this.removeItem(key);
      }
    }
  }
}