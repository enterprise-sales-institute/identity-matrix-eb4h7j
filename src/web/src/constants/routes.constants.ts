/**
 * @fileoverview Route path constants used throughout the application for navigation and route configuration.
 * Ensures consistent URL paths and supports role-based access control.
 * @version 1.0.0
 */

/**
 * Immutable object containing all application route paths.
 * Used for navigation, route protection, and maintaining consistent URLs across the application.
 * 
 * @constant
 * @type {Readonly<Record<string, string>>}
 * 
 * Routes:
 * - LOGIN: Authentication entry point
 * - ANALYTICS: Data analysis and reporting dashboard
 * - ATTRIBUTION: Attribution model configuration and results
 * - SETTINGS: Application and user preferences configuration
 */
export const ROUTES = {
    /**
     * Authentication entry point
     * Accessible to: Unauthenticated users
     */
    LOGIN: '/login',

    /**
     * Analytics dashboard route
     * Accessible to: Admin, Analyst, Marketing User
     */
    ANALYTICS: '/analytics',

    /**
     * Attribution modeling and configuration route
     * Accessible to: Admin, Analyst
     */
    ATTRIBUTION: '/attribution',

    /**
     * Settings and configuration route
     * Accessible to: Admin
     */
    SETTINGS: '/settings'
} as const;

/**
 * Type definition for route paths to ensure type safety when accessing routes
 */
export type RoutePaths = typeof ROUTES[keyof typeof ROUTES];

/**
 * Type definition for route keys to ensure type safety when referencing route names
 */
export type RouteKeys = keyof typeof ROUTES;