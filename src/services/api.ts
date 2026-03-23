// ============================================
// API SERVICE - Centralized API calls
// No hardcoded URLs or auth tokens
// ============================================

import { config } from '@/config/env';
import { ROUTES, ERRORS, TIMING } from '@/config/constants';
import { getAccessToken } from '@/lib/admin-auth-client';
import { supabase } from '@/services/supabase';

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  auth?: boolean;
}

// ============================================
// ERROR CLASS
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// BASE REQUEST FUNCTION
// ============================================

async function request<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeout = TIMING.API_TIMEOUT, auth = false, headers: customHeaders, ...fetchOptions } = options;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add auth header if needed
  if (auth) {
    // Try JWT token first (admin login)
    let token = getAccessToken();
    
    // If no JWT, try Supabase session
    if (!token && typeof window !== 'undefined') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          token = session.access_token;
        }
      } catch (e) {
        console.error('Failed to get Supabase session:', e);
      }
    }
    
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      // IMPORTANT: Send cookies for Supabase session auth
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    // Parse response
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    // Handle errors
    if (!response.ok) {
      throw new ApiError(
        data?.error || data?.message || getErrorMessage(response.status),
        response.status,
        data?.code
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw new ApiError(error.message, 0);
    }

    throw new ApiError('Unknown error occurred', 0);
  }
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 400: return ERRORS.VALIDATION;
    case 401: return ERRORS.UNAUTHORIZED;
    case 403: return ERRORS.FORBIDDEN;
    case 404: return ERRORS.NOT_FOUND;
    case 429: return 'Too many requests. Please try again later.';
    case 500: return ERRORS.SERVER;
    default: return ERRORS.NETWORK;
  }
}

// ============================================
// HTTP METHODS
// ============================================

export const api = {
  get<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, { ...options, method: 'GET' });
  },

  post<T>(url: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(url: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(url: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, { ...options, method: 'DELETE' });
  },
};

// ============================================
// VIDEO API - Typed methods
// ============================================

import { Video } from '@/types';

interface CreateVideoRequest {
  title: string;
  titleVi: string;
  description?: string;
  level?: string;
  topics?: string[];
  ageGroup?: string;
  category?: 'video' | 'music';
}

interface CreateVideoResponse {
  video: Video;
  upload: {
    uploadUrl: string;
    videoId: string;
    expiresAt: number;
  };
}

interface UpdateVideoRequest {
  title?: string;
  titleVi?: string;
  description?: string;
  level?: string;
  status?: string;
}

interface VideoStatusResponse {
  status: string;
  progress?: number;
  duration?: number;
}

interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
}

export const videoApi = {
  // List videos (public - only ready)
  async list(): Promise<{ videos: Video[] }> {
    return api.get(ROUTES.API.VIDEOS);
  },

  // List all videos for admin (includes processing/error)
  async listAll(): Promise<{ videos: Video[] }> {
    return api.get(`${ROUTES.API.VIDEOS}?all=true`, { auth: true });
  },

  // Get single video
  async get(id: string): Promise<{ video: Video }> {
    return api.get(ROUTES.API.VIDEO(id));
  },

  // Create video (requires auth)
  async create(data: CreateVideoRequest): Promise<CreateVideoResponse> {
    return api.post(ROUTES.API.VIDEOS, data, { auth: true });
  },

  // Update video (requires auth)
  async update(id: string, data: UpdateVideoRequest): Promise<{ video: Video }> {
    return api.patch(ROUTES.API.VIDEO(id), data, { auth: true });
  },

  // Delete video (requires auth)
  async delete(id: string): Promise<{ success: boolean }> {
    return api.delete(ROUTES.API.VIDEO(id), { auth: true });
  },

  // Check video status
  async getStatus(id: string): Promise<VideoStatusResponse> {
    return api.get(ROUTES.API.VIDEO_STATUS(id));
  },

  // Save subtitles (requires auth)
  async saveSubtitles(id: string, subtitles: SubtitleItem[]): Promise<{ success: boolean }> {
    return api.put(ROUTES.API.VIDEO_SUBTITLES(id), { subtitles }, { auth: true });
  },
};

// ============================================
// EXPORT
// ============================================

export default api;
