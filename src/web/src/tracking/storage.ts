/**
 * @fileoverview Secure browser storage management for tracking events with encryption and compression
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid'; // v8.3.2
import { compress, deflate } from 'pako'; // v2.1.0
import { AES, enc } from 'crypto-js'; // v4.1.1
import { StorageError } from '@types/storage-errors'; // v1.0.0

import { StorageType } from '../utils/storage.utils';
import { TrackingEvent } from './types';

// Constants
const STORAGE_KEY_PREFIX = 'mta_';
const VISITOR_ID_KEY = `${STORAGE_KEY_PREFIX}visitor`;
const EVENT_BATCH_KEY = `${STORAGE_KEY_PREFIX}events`;
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'default-key';
const MAX_BATCH_SIZE = 100;
const EVENT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const COMPRESSION_THRESHOLD = 1024; // 1KB

/**
 * Retrieves or generates an encrypted visitor ID
 * @returns Promise<string> Decrypted visitor ID
 * @throws StorageError if storage operations fail
 */
export async function getVisitorId(): Promise<string> {
  try {
    const encryptedId = localStorage.getItem(VISITOR_ID_KEY);
    
    if (encryptedId) {
      const bytes = AES.decrypt(encryptedId, ENCRYPTION_KEY);
      const decryptedId = bytes.toString(enc.Utf8);
      
      if (decryptedId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(decryptedId)) {
        return decryptedId;
      }
    }
    
    const newVisitorId = uuidv4();
    const encryptedNewId = AES.encrypt(newVisitorId, ENCRYPTION_KEY).toString();
    
    localStorage.setItem(VISITOR_ID_KEY, encryptedNewId);
    return newVisitorId;
    
  } catch (error) {
    throw new StorageError('VISITOR_ID_ERROR', `Failed to manage visitor ID: ${error.message}`);
  }
}

/**
 * Stores a tracking event in the encrypted batch
 * @param event TrackingEvent to store
 * @throws StorageError if storage operations fail
 */
export async function storeEvent(event: TrackingEvent): Promise<void> {
  try {
    // Validate event structure
    if (!event.id || !event.visitorId || !event.sessionId) {
      throw new StorageError('INVALID_EVENT', 'Event missing required fields');
    }

    // Get existing events
    const existingEvents = await getStoredEvents();
    
    // Remove expired events
    const validEvents = existingEvents.filter(e => 
      Date.now() - e.timestamp < (e.ttl || EVENT_TTL)
    );

    // Add new event
    validEvents.push(event);

    // Enforce batch size limit
    if (validEvents.length > MAX_BATCH_SIZE) {
      validEvents.splice(0, validEvents.length - MAX_BATCH_SIZE);
    }

    // Prepare batch for storage
    const batch = JSON.stringify(validEvents);
    
    // Compress if above threshold
    let storedData: string;
    if (batch.length > COMPRESSION_THRESHOLD) {
      const compressed = deflate(batch);
      storedData = btoa(String.fromCharCode.apply(null, compressed));
    } else {
      storedData = batch;
    }

    // Encrypt before storage
    const encryptedBatch = AES.encrypt(storedData, ENCRYPTION_KEY).toString();
    
    // Store with metadata
    const storageData = {
      data: encryptedBatch,
      metadata: {
        compressed: batch.length > COMPRESSION_THRESHOLD,
        timestamp: Date.now(),
        count: validEvents.length
      }
    };

    localStorage.setItem(EVENT_BATCH_KEY, JSON.stringify(storageData));

  } catch (error) {
    throw new StorageError('STORE_EVENT_ERROR', `Failed to store event: ${error.message}`);
  }
}

/**
 * Retrieves stored tracking events
 * @returns Promise<TrackingEvent[]> Array of decrypted events
 * @throws StorageError if retrieval or decryption fails
 */
export async function getStoredEvents(): Promise<TrackingEvent[]> {
  try {
    const storedData = localStorage.getItem(EVENT_BATCH_KEY);
    
    if (!storedData) {
      return [];
    }

    const { data, metadata } = JSON.parse(storedData);
    
    // Decrypt batch
    const bytes = AES.decrypt(data, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(enc.Utf8);
    
    // Decompress if needed
    let eventsJson: string;
    if (metadata.compressed) {
      const compressedData = Uint8Array.from(atob(decryptedData), c => c.charCodeAt(0));
      eventsJson = new TextDecoder().decode(pako.inflate(compressedData));
    } else {
      eventsJson = decryptedData;
    }

    // Parse and validate events
    const events: TrackingEvent[] = JSON.parse(eventsJson);
    
    return events.filter(event => {
      const isValid = event.id && event.visitorId && event.sessionId;
      const isNotExpired = Date.now() - event.timestamp < (event.ttl || EVENT_TTL);
      return isValid && isNotExpired;
    });

  } catch (error) {
    throw new StorageError('GET_EVENTS_ERROR', `Failed to retrieve events: ${error.message}`);
  }
}