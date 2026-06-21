// ============================================
// ENVIRONMENT CONFIGURATION
// Centralized, validated, type-safe
// ============================================

// Server-side only environment variables (NOT exposed to client)
const serverEnvVars = {
  // JWT Secret for admin authentication
  JWT_SECRET: process.env.JWT_SECRET,

  // Cloudflare Workers AI (optional)
  CLOUDFLARE_WORKERS_AI_TOKEN: process.env.CLOUDFLARE_WORKERS_AI_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
};

// Client-side environment variables (NEXT_PUBLIC_*)
// IMPORTANT: Only put non-sensitive data here!
const clientEnvVars = {
  // Supabase (anon key is designed to be public with RLS)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

// Validation function
function validateEnvVars(vars: Record<string, string | undefined>, required: string[]): string[] {
  return required.filter(key => !vars[key]);
}

// Check if running on server
const isServer = typeof window === 'undefined';

// ============================================
// EXPORTED CONFIG OBJECT
// ============================================
export const config = {
  // App environment
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isServer,
  isClient: !isServer,

  // Supabase
  supabase: {
    url: clientEnvVars.SUPABASE_URL || '',
    anonKey: clientEnvVars.SUPABASE_ANON_KEY || '',
    get isConfigured() {
      return Boolean(this.url && this.anonKey);
    },
  },

  // JWT Authentication
  jwt: {
    get secret() {
      if (!isServer) {
        console.warn('JWT secret should only be accessed on server-side');
        return '';
      }
      return serverEnvVars.JWT_SECRET || '';
    },
    get isConfigured() {
      return isServer && Boolean(serverEnvVars.JWT_SECRET);
    },
  },

  // Cloudflare (optional AI features)
  cloudflare: {
    get aiToken() {
      if (!isServer) return '';
      return serverEnvVars.CLOUDFLARE_WORKERS_AI_TOKEN || '';
    },
    get accountId() {
      if (!isServer) return '';
      return serverEnvVars.CLOUDFLARE_ACCOUNT_ID || '';
    },
    get isConfigured() {
      return isServer && Boolean(serverEnvVars.CLOUDFLARE_WORKERS_AI_TOKEN && serverEnvVars.CLOUDFLARE_ACCOUNT_ID);
    },
  },

  // Validate all required environment variables
  validate(): { valid: boolean; missing: string[] } {
    const requiredClient = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const requiredServer = isServer ? ['JWT_SECRET'] : [];

    const missingClient = validateEnvVars(clientEnvVars, requiredClient);
    const missingServer = validateEnvVars(serverEnvVars, requiredServer);

    const missing = [...missingClient, ...missingServer];

    return {
      valid: missing.length === 0,
      missing,
    };
  },
} as const;

// ============================================
// TYPE EXPORTS
// ============================================
export type Config = typeof config;
