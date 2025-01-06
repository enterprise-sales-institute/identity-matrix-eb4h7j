/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used in the Multi-Touch Attribution Analytics Tool
 * @version 4.4.0
 */

/**
 * Interface defining strictly typed environment variables available in Vite
 * All properties are readonly to prevent accidental modification at runtime
 */
interface ImportMetaEnv {
  /** Base URL for API endpoints */
  readonly VITE_API_BASE_URL: string;

  /** Application title used in UI components */
  readonly VITE_APP_TITLE: string;

  /** Application version for tracking and display */
  readonly VITE_APP_VERSION: string;

  /** Auth0 domain for authentication configuration */
  readonly VITE_AUTH0_DOMAIN: string;

  /** Auth0 client ID for application identification */
  readonly VITE_AUTH0_CLIENT_ID: string;

  /** Auth0 audience for API authorization */
  readonly VITE_AUTH0_AUDIENCE: string;

  /** Current deployment environment */
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
}

/**
 * Augment the Vite ImportMeta interface with our env type
 * This provides strict typing for import.meta.env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}