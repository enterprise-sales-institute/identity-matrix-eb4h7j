/**
 * Database migration for initializing the users table with comprehensive security features,
 * role-based access control, audit trails, and optimized query performance.
 * @version 1.0.0
 */

import { MigrationBuilder } from 'node-pg-migrate'; // v6.2.0
import { PostgresConnection } from '../../connection';

/**
 * Creates the users table with all required security features and indexes
 */
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // Create UUID extension for secure ID generation
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Create user role enum type
  pgm.createType('user_role', [
    'ADMIN',
    'ANALYST',
    'MARKETING_USER'
  ]);

  // Create users table with comprehensive security features
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
      comment: 'Unique identifier for the user'
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
      check: "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
      comment: 'User email address (unique, case-insensitive)'
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Bcrypt hashed password'
    },
    first_name: {
      type: 'varchar(100)',
      notNull: true,
      check: 'length(first_name) >= 2',
      comment: 'User first name'
    },
    last_name: {
      type: 'varchar(100)',
      notNull: true,
      check: 'length(last_name) >= 2',
      comment: 'User last name'
    },
    role: {
      type: 'user_role',
      notNull: true,
      comment: 'User role for access control'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Account status flag'
    },
    last_login_at: {
      type: 'timestamp with time zone',
      comment: 'Timestamp of last successful login'
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
      comment: 'Timestamp of account creation'
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
      comment: 'Timestamp of last account update'
    }
  }, {
    comment: 'Stores user account information with security features and audit trails',
    constraints: {
      unique: ['email']
    }
  });

  // Create optimized indexes
  pgm.createIndex('users', 'email', {
    name: 'users_email_idx',
    unique: true,
    where: 'is_active = true'
  });

  pgm.createIndex('users', 'role', {
    name: 'users_role_idx',
    method: 'btree'
  });

  pgm.createIndex('users', 'is_active', {
    name: 'users_is_active_idx',
    method: 'btree'
  });

  pgm.createIndex('users', 'last_login_at', {
    name: 'users_last_login_idx',
    method: 'btree'
  });

  // Create updated_at trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );

  // Create trigger for automatic updated_at updates
  pgm.createTrigger(
    'users',
    'update_updated_at_trigger',
    {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column'
    }
  );

  // Implement row-level security policies
  pgm.sql(`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- Policy for viewing user data
    CREATE POLICY users_view_policy ON users
    FOR SELECT
    USING (
      (CURRENT_USER = 'admin')
      OR (auth.role() = 'ADMIN')
      OR (auth.user_id() = id)
    );

    -- Policy for inserting new users
    CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (
      (CURRENT_USER = 'admin')
      OR (auth.role() = 'ADMIN')
    );

    -- Policy for updating user data
    CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (
      (CURRENT_USER = 'admin')
      OR (auth.role() = 'ADMIN')
      OR (auth.user_id() = id)
    )
    WITH CHECK (
      (CURRENT_USER = 'admin')
      OR (auth.role() = 'ADMIN')
      OR (auth.user_id() = id)
    );

    -- Policy for deleting users
    CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (
      (CURRENT_USER = 'admin')
      OR (auth.role() = 'ADMIN')
    );
  `);

  // Create audit logging function and trigger
  pgm.createFunction(
    'audit_users_changes',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      INSERT INTO audit.user_changes (
        user_id,
        action,
        old_data,
        new_data,
        changed_by,
        changed_at
      ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        row_to_json(OLD),
        row_to_json(NEW),
        current_user,
        current_timestamp
      );
      RETURN NULL;
    END;
    `
  );

  pgm.createTrigger(
    'users',
    'audit_users_trigger',
    {
      when: 'AFTER',
      operation: ['INSERT', 'UPDATE', 'DELETE'],
      level: 'ROW',
      function: 'audit_users_changes'
    }
  );
};

/**
 * Reverts the users table creation and all associated objects
 */
export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Drop triggers first
  pgm.dropTrigger('users', 'audit_users_trigger', { ifExists: true });
  pgm.dropTrigger('users', 'update_updated_at_trigger', { ifExists: true });

  // Drop functions
  pgm.dropFunction('audit_users_changes', [], { ifExists: true });
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Drop table and associated objects
  pgm.dropTable('users', { cascade: true });
  pgm.dropType('user_role', { ifExists: true });
  pgm.dropExtension('uuid-ossp', { ifExists: true });
};