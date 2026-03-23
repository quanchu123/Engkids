/**
 * Authentication Configuration
 * Centralized auth settings for user authentication
 */

export const authConfig = {
  // Auth routes
  routes: {
    login: '/login',
    signup: '/signup',
    callback: '/auth/callback',
    home: '/',
    dashboard: '/progress',
  },

  // Redirect URLs
  redirects: {
    afterLogin: '/progress',  // User dashboard after login
    afterLogout: '/',
    afterSignup: '/progress',  // User dashboard after signup
  },

  // Protected routes (require authentication)
  protectedRoutes: [
    '/progress',
    '/profile',
  ],

  // Admin routes (require admin role)
  adminRoutes: [
    '/admin',
  ],

  // Public routes (no auth needed)
  publicRoutes: [
    '/',
    '/videos',
    '/videos/:id',
    '/stories',
    '/stories/:id',
    '/login',
    '/signup',
    '/auth/callback',
  ],

  // OAuth providers
  providers: {
    google: {
      enabled: true,
      scopes: ['email', 'profile'],
    },
  },

  // Session config
  session: {
    // Cookie name for session
    cookieName: 'supabase-auth-token',
    // Session refresh interval (ms)
    refreshInterval: 5 * 60 * 1000, // 5 minutes
  },
} as const;

export type AuthRoute = keyof typeof authConfig.routes;
export type ProtectedRoute = typeof authConfig.protectedRoutes[number];
export type AdminRoute = typeof authConfig.adminRoutes[number];
