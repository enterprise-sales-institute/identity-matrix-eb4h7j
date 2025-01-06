import { faker } from '@faker-js/faker'; // v8.0.0
import { UserRole } from '../../src/database/postgres/repositories/user.repository';
import type { UserDTO } from '@types/user'; // v1.0.0

// Constants for consistent test data
const DEFAULT_PASSWORD_HASH = '$2b$10$mockPasswordHashForTesting';
const DEFAULT_MFA_SECRET = 'MFASECRETFORTESTING234567';
const DEFAULT_IP_ADDRESS = '192.168.1.1';

/**
 * Creates a mock user with specified role and optional overrides
 * @param role - User role from UserRole enum
 * @param overrides - Optional overrides for user properties
 * @returns Complete mock user data
 */
export const createMockUser = (role: UserRole, overrides: Partial<UserDTO> = {}): UserDTO => {
  const userId = faker.string.uuid();
  const now = new Date();
  const lastLogin = faker.date.past();

  const user: UserDTO = {
    id: userId,
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: role,
    passwordHash: DEFAULT_PASSWORD_HASH,
    isActive: true,
    isMfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: [],
    lastLoginAt: lastLogin,
    lastLoginIp: DEFAULT_IP_ADDRESS,
    createdAt: now,
    updatedAt: now,
    auditInfo: {
      createdBy: 'system',
      updatedBy: 'system',
      changeHistory: [
        {
          action: 'CREATE',
          timestamp: now,
          by: 'system',
          changes: {}
        }
      ]
    },
    preferences: {
      theme: 'light',
      timezone: 'UTC',
      notifications: {
        email: true,
        inApp: true
      }
    },
    permissions: generatePermissionsForRole(role),
    ...overrides
  };

  return user;
};

/**
 * Creates an array of mock users with specified count and role
 * @param count - Number of users to create
 * @param role - User role from UserRole enum
 * @returns Array of mock users
 */
export const createMockUserList = (count: number, role: UserRole): UserDTO[] => {
  if (count < 1) {
    throw new Error('Count must be greater than 0');
  }

  const users: UserDTO[] = [];
  const emails = new Set<string>();

  for (let i = 0; i < count; i++) {
    let email: string;
    do {
      email = faker.internet.email().toLowerCase();
    } while (emails.has(email));

    emails.add(email);
    users.push(createMockUser(role, { email }));
  }

  return users;
};

/**
 * Generates role-specific permissions
 * @param role - User role from UserRole enum
 * @returns Permission object based on role
 */
const generatePermissionsForRole = (role: UserRole): Record<string, boolean> => {
  const permissions: Record<string, boolean> = {
    viewDashboard: true,
    viewReports: true,
    exportData: false,
    manageUsers: false,
    configureSystem: false,
    viewAuditLogs: false
  };

  switch (role) {
    case UserRole.ADMIN:
      return {
        ...permissions,
        exportData: true,
        manageUsers: true,
        configureSystem: true,
        viewAuditLogs: true
      };
    case UserRole.ANALYST:
      return {
        ...permissions,
        exportData: true,
        viewAuditLogs: true
      };
    case UserRole.MARKETING_USER:
      return permissions;
    default:
      return permissions;
  }
};

// Pre-defined mock users for common test scenarios
export const mockAdminUser = createMockUser(UserRole.ADMIN, {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  isMfaEnabled: true,
  mfaSecret: DEFAULT_MFA_SECRET
});

export const mockAnalystUser = createMockUser(UserRole.ANALYST, {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'analyst@test.com',
  firstName: 'Analyst',
  lastName: 'User'
});

export const mockMarketingUser = createMockUser(UserRole.MARKETING_USER, {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'marketing@test.com',
  firstName: 'Marketing',
  lastName: 'User'
});

// Export types for test utilities
export type MockUserOverrides = Partial<UserDTO>;
export type MockUserFactory = typeof createMockUser;
export type MockUserListFactory = typeof createMockUserList;