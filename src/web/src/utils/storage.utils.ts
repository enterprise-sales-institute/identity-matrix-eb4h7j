/**
 * @fileoverview Advanced browser storage utilities with type safety, encryption, compression and TTL support
 * @version 1.0.0
 */

import LZString from 'lz-string'; // v1.5.0
import CryptoJS from 'crypto-js'; // v4.1.1
import { ErrorType, DeepPartial } from '../types/common.types';

// Encryption key - should be stored in environment variables
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'default-key';

// Constants for storage configuration
const COMPRESSION_THRESHOLD = 1024; // 1KB
const DEFAULT_QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB
const STORAGE_VERSION = '1.0';

/**
 * Enum for storage type selection
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage'
}

/**
 * Interface for storage operation options
 */
export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time-to-live in milliseconds
  quotaLimit?: number; // Custom quota limit in bytes
}

/**
 * Interface for stored item metadata
 */
interface StorageMetadata {
  version: string;
  timestamp: number;
  ttl?: number;
  compressed?: boolean;
  encrypted?: boolean;
}

/**
 * Interface for storage error details
 */
interface StorageError extends Error {
  code: string;
  details?: any;
}

/**
 * Interface for stored item wrapper
 */
interface StorageWrapper<T> {
  data: T;
  metadata: StorageMetadata;
}

/**
 * Creates a custom storage error
 */
const createStorageError = (code: string, message: string, details?: any): StorageError => {
  const error = new Error(message) as StorageError;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Checks if storage is available
 */
const checkStorageAvailability = (type: StorageType): boolean => {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Encrypts data using AES encryption
 */
const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

/**
 * Decrypts encrypted data
 */
const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Compresses data using LZ compression
 */
const compressData = (data: string): string => {
  return LZString.compress(data);
};

/**
 * Decompresses compressed data
 */
const decompressData = (compressedData: string): string => {
  return LZString.decompress(compressedData) || '';
};

/**
 * Checks storage quota limits
 */
const checkQuota = (storage: Storage, dataSize: number, quotaLimit: number): void => {
  let totalSize = dataSize;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      totalSize += storage.getItem(key)?.length || 0;
    }
  }
  
  if (totalSize > quotaLimit) {
    throw createStorageError(
      'QUOTA_EXCEEDED',
      `Storage quota exceeded. Limit: ${quotaLimit} bytes`,
      { currentSize: totalSize, limit: quotaLimit }
    );
  }
};

/**
 * Sets an item in storage with type safety, encryption, and compression
 */
export function setStorageItem<T>(
  type: StorageType,
  key: string,
  value: T,
  options: StorageOptions = {}
): void {
  try {
    if (!checkStorageAvailability(type)) {
      throw createStorageError('STORAGE_UNAVAILABLE', `${type} is not available`);
    }

    const storage = window[type];
    const wrapper: StorageWrapper<T> = {
      data: value,
      metadata: {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        ttl: options.ttl,
        compressed: options.compress,
        encrypted: options.encrypt
      }
    };

    let serializedData = JSON.stringify(wrapper);

    if (options.compress && serializedData.length > COMPRESSION_THRESHOLD) {
      serializedData = compressData(serializedData);
      wrapper.metadata.compressed = true;
    }

    if (options.encrypt) {
      serializedData = encryptData(serializedData);
      wrapper.metadata.encrypted = true;
    }

    checkQuota(storage, serializedData.length, options.quotaLimit || DEFAULT_QUOTA_LIMIT);
    storage.setItem(key, serializedData);

    // Dispatch storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: serializedData }));

  } catch (error) {
    throw createStorageError(
      'STORAGE_ERROR',
      `Failed to set item in ${type}: ${error.message}`,
      error
    );
  }
}

/**
 * Gets an item from storage with type safety and automatic decryption
 */
export function getStorageItem<T>(type: StorageType, key: string): T | null {
  try {
    if (!checkStorageAvailability(type)) {
      throw createStorageError('STORAGE_UNAVAILABLE', `${type} is not available`);
    }

    const storage = window[type];
    const serializedData = storage.getItem(key);

    if (!serializedData) {
      return null;
    }

    let parsedData: StorageWrapper<T>;
    let dataString = serializedData;

    try {
      // Attempt to parse as non-encrypted data first
      parsedData = JSON.parse(dataString);
    } catch {
      // If parsing fails, assume it's encrypted
      dataString = decryptData(dataString);
      
      if (parsedData?.metadata?.compressed) {
        dataString = decompressData(dataString);
      }
      
      parsedData = JSON.parse(dataString);
    }

    // Check TTL expiration
    if (parsedData.metadata.ttl && 
        Date.now() - parsedData.metadata.timestamp > parsedData.metadata.ttl) {
      storage.removeItem(key);
      return null;
    }

    return parsedData.data;

  } catch (error) {
    throw createStorageError(
      'STORAGE_ERROR',
      `Failed to get item from ${type}: ${error.message}`,
      error
    );
  }
}

/**
 * Sets an item in localStorage with type safety
 */
export function setLocalStorageItem<T>(
  key: string,
  value: T,
  options?: StorageOptions
): void {
  setStorageItem(StorageType.LOCAL, key, value, options);
}

/**
 * Gets an item from localStorage with type safety
 */
export function getLocalStorageItem<T>(key: string): T | null {
  return getStorageItem<T>(StorageType.LOCAL, key);
}

/**
 * Sets an item in sessionStorage with type safety
 */
export function setSessionStorageItem<T>(
  key: string,
  value: T,
  options?: StorageOptions
): void {
  setStorageItem(StorageType.SESSION, key, value, options);
}

/**
 * Gets an item from sessionStorage with type safety
 */
export function getSessionStorageItem<T>(key: string): T | null {
  return getStorageItem<T>(StorageType.SESSION, key);
}

/**
 * Removes an item from storage
 */
export function removeStorageItem(type: StorageType, key: string): void {
  try {
    if (!checkStorageAvailability(type)) {
      throw createStorageError('STORAGE_UNAVAILABLE', `${type} is not available`);
    }
    window[type].removeItem(key);
  } catch (error) {
    throw createStorageError(
      'STORAGE_ERROR',
      `Failed to remove item from ${type}: ${error.message}`,
      error
    );
  }
}

/**
 * Clears all items from storage
 */
export function clearStorage(type: StorageType): void {
  try {
    if (!checkStorageAvailability(type)) {
      throw createStorageError('STORAGE_UNAVAILABLE', `${type} is not available`);
    }
    window[type].clear();
  } catch (error) {
    throw createStorageError(
      'STORAGE_ERROR',
      `Failed to clear ${type}: ${error.message}`,
      error
    );
  }
}