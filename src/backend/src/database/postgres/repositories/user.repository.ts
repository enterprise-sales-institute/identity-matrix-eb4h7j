/**
 * User Repository Implementation
 * Handles all user-related database operations with secure data handling,
 * field-level encryption, transaction management, and comprehensive error handling.
 * @version 1.0.0
 */

import { Pool, QueryResult, PoolClient } from 'pg'; // v8.11.0
import * as crypto from 'crypto';
import { PostgresConnection } from '../connection';
import { DatabaseError } from '../../../types/error.types';
import { ApiResponse } from '../../../types/common.types';

// Constants for encryption and security
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.USER_ENCRYPTION_KEY || '';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Sensitive fields that require encryption
const SENSITIVE_FIELDS = ['email', 'firstName', 'lastName'];

/**
 * Enum for user roles with access levels
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  MARKETING_USER = 'MARKETING_USER'
}

/**
 * Interface for audit information
 */
interface AuditInfo {
  createdBy: string;
  updatedBy: string;
  changeHistory: string[];
}

/**
 * Interface for user data transfer object
 */
interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginIp: string | null;
  auditInfo: AuditInfo;
}

/**
 * Interface for creating new users
 */
interface CreateUserDTO {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdBy: string;
}

/**
 * Interface for updating user information
 */
interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  updatedBy: string;
}

/**
 * User Repository class for handling all user-related database operations
 */
export class UserRepository {
  private readonly connection: PostgresConnection;

  constructor(connection: PostgresConnection) {
    this.connection = connection;
  }

  /**
   * Encrypts sensitive field data
   * @param value Value to encrypt
   * @returns Encrypted value with IV and auth tag
   */
  private encryptField(value: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypts sensitive field data
   * @param encryptedValue Encrypted value with IV and auth tag
   * @returns Decrypted value
   */
  private decryptField(encryptedValue: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedValue.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Finds a user by their ID
   * @param id User ID
   * @returns User data or null if not found
   */
  public async findById(id: string): Promise<UserDTO | null> {
    const client = await this.connection.connect();
    
    try {
      const query = `
        SELECT u.*, 
               a.created_by, 
               a.updated_by, 
               a.change_history
        FROM users u
        LEFT JOIN user_audit a ON u.id = a.user_id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      // Decrypt sensitive fields
      SENSITIVE_FIELDS.forEach(field => {
        if (user[field]) {
          user[field] = this.decryptField(user[field]);
        }
      });

      return this.mapToUserDTO(user);
    } catch (error) {
      throw new DatabaseError(
        'Failed to fetch user',
        {
          errorCode: 'USER_FETCH_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          category: 'DATA',
          timestamp: new Date(),
          traceId: '',
          serviceName: 'user-repository',
          environment: process.env.NODE_ENV || 'development',
          additionalInfo: { userId: id },
          stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
          metadata: {}
        }
      );
    } finally {
      await this.connection.releaseClient(client);
    }
  }

  /**
   * Creates a new user with encrypted sensitive data
   * @param userData User creation data
   * @returns Created user data
   */
  public async create(userData: CreateUserDTO): Promise<UserDTO> {
    const client = await this.connection.connect();
    
    try {
      await client.query('BEGIN');

      // Encrypt sensitive fields
      const encryptedData = { ...userData };
      SENSITIVE_FIELDS.forEach(field => {
        if (field in encryptedData) {
          encryptedData[field] = this.encryptField(encryptedData[field]);
        }
      });

      const userQuery = `
        INSERT INTO users (
          email, password_hash, first_name, last_name, 
          role, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING *
      `;

      const userResult = await client.query(userQuery, [
        encryptedData.email,
        encryptedData.passwordHash,
        encryptedData.firstName,
        encryptedData.lastName,
        encryptedData.role
      ]);

      const auditQuery = `
        INSERT INTO user_audit (
          user_id, created_by, updated_by, change_history
        ) VALUES ($1, $2, $2, $3)
        RETURNING *
      `;

      await client.query(auditQuery, [
        userResult.rows[0].id,
        userData.createdBy,
        JSON.stringify([{ action: 'CREATE', timestamp: new Date(), by: userData.createdBy }])
      ]);

      await client.query('COMMIT');

      return this.findById(userResult.rows[0].id) as Promise<UserDTO>;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DatabaseError(
        'Failed to create user',
        {
          errorCode: 'USER_CREATE_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          category: 'DATA',
          timestamp: new Date(),
          traceId: '',
          serviceName: 'user-repository',
          environment: process.env.NODE_ENV || 'development',
          additionalInfo: { email: userData.email },
          stackTrace: error instanceof Error ? error.stack?.split('\n') || [] : [],
          metadata: {}
        }
      );
    } finally {
      await this.connection.releaseClient(client);
    }
  }

  /**
   * Maps database result to UserDTO
   * @param dbResult Database result row
   * @returns Mapped UserDTO
   */
  private mapToUserDTO(dbResult: any): UserDTO {
    return {
      id: dbResult.id,
      email: dbResult.email,
      firstName: dbResult.first_name,
      lastName: dbResult.last_name,
      role: dbResult.role as UserRole,
      isActive: dbResult.is_active,
      lastLoginAt: dbResult.last_login_at,
      createdAt: dbResult.created_at,
      updatedAt: dbResult.updated_at,
      lastLoginIp: dbResult.last_login_ip,
      auditInfo: {
        createdBy: dbResult.created_by,
        updatedBy: dbResult.updated_by,
        changeHistory: dbResult.change_history || []
      }
    };
  }
}