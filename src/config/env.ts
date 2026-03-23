// ============================================
// ENVIRONMENT CONFIGURATION
// Centralized, validated, type-safe
// ============================================

// Server-side only environment variables (NOT exposed to client)
const serverEnvVars = {
  // Bunny.net API (server-side ONLY - never expose to client!)
  BUNNY_API_KEY: process.env.BUNNY_API_KEY,
  BUNNY_LIBRARY_ID: process.env.BUNNY_LIBRARY_ID,
  
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
  
  // Bunny.net (public, for embedding videos only - NOT API key!)
  BUNNY_LIBRARY_ID: process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID,
  BUNNY_CDN_HOSTNAME: process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME,
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

  // Bunny.net
  bunny: {
    // API key is SERVER-SIDE ONLY - never expose to client!
    get apiKey() {
      if (!isServer) {
        console.warn('Bunny API key should only be accessed on server-side');
        return '';
      }
      return serverEnvVars.BUNNY_API_KEY || '';
    },
    libraryId: clientEnvVars.BUNNY_LIBRARY_ID || serverEnvVars.BUNNY_LIBRARY_ID || '',
    cdnHostname: clientEnvVars.BUNNY_CDN_HOSTNAME || '',
    
    get apiUrl() {
      return `https://video.bunnycdn.com/library/${this.libraryId}`;
    },
    get streamUrl() {
      return `https://iframe.mediadelivery.net/embed/${this.libraryId}`;
    },
    get cdnUrl() {
      return this.cdnHostname ? `https://${this.cdnHostname}` : '';
    },
    get isConfigured() {
      // On client, only check libraryId (API key is server-only)
      if (!isServer) {
        return Boolean(this.libraryId);
      }
      return Boolean(serverEnvVars.BUNNY_API_KEY && this.libraryId);
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
    const requiredServer = isServer ? ['BUNNY_API_KEY', 'BUNNY_LIBRARY_ID', 'JWT_SECRET'] : [];
    
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
// HELPER FUNCTIONS
// ============================================

// Get Bunny video embed URL
export function getBunnyEmbedUrl(videoId: string): string {
  return `${config.bunny.streamUrl}/${videoId}`;
}

// Get Bunny video thumbnail URL
export function getBunnyThumbnailUrl(videoId: string): string {
  if (!config.bunny.cdnHostname) return '';
  return `https://${config.bunny.cdnHostname}/${videoId}/thumbnail.jpg`;
}

// Get Bunny video upload URL
export function getBunnyUploadUrl(videoId: string): string {
  return `${config.bunny.apiUrl}/videos/${videoId}`;
}

// ============================================
// TYPE EXPORTS
// ============================================
export type Config = typeof config;
