// ============================================
// API SERVICE - Centralized API calls
// No hardcoded URLs or auth tokens
// ============================================

import { ROUTES, ERRORS, TIMING } from '@/config/constants';
import { getAnyAccessToken, refreshToken } from '@/lib/admin-auth-client';

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ApiError; status: number };

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  auth?: boolean;
  json?: boolean;
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

async function requestWithResponse<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; status: number }> {
  const { timeout = TIMING.API_TIMEOUT, auth = false, json = true, headers: customHeaders, ...fetchOptions } = options;

  // Build headers
  const headers: HeadersInit = {
    ...customHeaders,
  };

  if (json && !(fetchOptions.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  // Add auth header if needed
  let authToken: string | null = null;
  if (auth) {
    authToken = await getAnyAccessToken();
    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      cache: fetchOptions.cache || 'no-store',
      // IMPORTANT: Send cookies for Supabase session auth
      credentials: 'include',
    });

    if (auth && response.status === 401) {
      const refreshedToken = await refreshToken();
      if (refreshedToken && refreshedToken !== authToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${refreshedToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
          cache: fetchOptions.cache || 'no-store',
          credentials: 'include',
        });
      }
    }

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

    return { data: data as T, status: response.status };
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

async function request<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await requestWithResponse<T>(url, options);
  return response.data;
}

async function safeRequest<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  try {
    const response = await requestWithResponse<T>(url, options);
    return { ok: true, data: response.data, status: response.status };
  } catch (error) {
    const apiError = error instanceof ApiError
      ? error
      : new ApiError(error instanceof Error ? error.message : 'Unknown error occurred', 0);
    return { ok: false, error: apiError, status: apiError.status };
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

  safeGet<T>(url: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
    return safeRequest<T>(url, { ...options, method: 'GET' });
  },

  post<T>(url: string, body?: object, options?: ApiRequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: isFormData ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
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

  safeRequest<T>(url: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
    return safeRequest<T>(url, options);
  },
};

// ============================================
// VIDEO API - Typed methods
// ============================================

import { Story, Video } from '@/types';
import type { VideoQuizQuestion } from '@/types';
import type { WordPair } from '@/lib/word-bank';

interface CreateVideoRequest {
  objectKey: string;
  title: string;
  titleVi: string;
  description?: string;
  thumbnailUrl?: string;
  level?: string;
  topics?: string[];
  ageGroup?: string;
  category?: 'video' | 'music';
  feature?: string;
  duration?: number;
}

interface CreateVideoResponse {
  video: Video;
}

interface UpdateVideoRequest {
  title?: string;
  titleVi?: string;
  description?: string;
  thumbnailUrl?: string;
  level?: string;
  status?: string;
  category?: 'video' | 'music';
  feature?: string;
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
  textEn: string;
  textVi?: string;
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

  async getAdmin(id: string): Promise<{ video: Video }> {
    return api.get(`${ROUTES.API.VIDEO(id)}?admin=true`, { auth: true });
  },

  // Create video metadata after uploading the file to the server (requires auth)
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

  // Translate English subtitle lines to Vietnamese via AI (requires auth, not saved)
  async translateSubtitles(id: string, lines: string[]): Promise<{ translations: string[] }> {
    return api.post(ROUTES.API.VIDEO_SUBTITLES_TRANSLATE(id), { lines }, { auth: true });
  },

  // Get quiz questions
  async getQuiz(id: string): Promise<{ quiz: VideoQuizQuestion[] }> {
    return api.get(ROUTES.API.VIDEO_QUIZ(id));
  },

  // Save quiz questions (requires auth)
  async saveQuiz(id: string, quiz: VideoQuizQuestion[]): Promise<{ success: boolean; count: number }> {
    return api.put(ROUTES.API.VIDEO_QUIZ(id), { quiz }, { auth: true });
  },

  // Generate quiz questions from subtitles via AI (requires auth, not saved yet)
  async generateQuiz(id: string, count?: number): Promise<{ quiz: VideoQuizQuestion[]; count: number }> {
    return api.post(ROUTES.API.VIDEO_QUIZ_GENERATE(id), count ? { count } : {}, { auth: true });
  },

  // Extract vocabulary from subtitles via AI (requires auth, not saved yet)
  async extractVocab(id: string, count?: number): Promise<{ words: WordPair[]; count: number }> {
    return api.post(ROUTES.API.VIDEO_VOCAB(id), count ? { count } : {}, { auth: true });
  },
};

// Shared word-bank API
export const wordBankApi = {
  async get(): Promise<{ data: WordPair[] }> {
    return api.get(ROUTES.API.WORD_BANK);
  },
  async save(words: WordPair[]): Promise<{ data: WordPair[] }> {
    return api.put(ROUTES.API.WORD_BANK, { data: words }, { auth: true });
  },
};

interface StoryPayload {
  story: Story;
}

export const storyApi = {
  async list(): Promise<{ stories: Story[] }> {
    return api.get(ROUTES.API.STORIES);
  },

  async listAll(): Promise<{ stories: Story[] }> {
    return api.get(`${ROUTES.API.STORIES}?all=true`, { auth: true });
  },

  async get(id: string): Promise<{ story: Story | null }> {
    return api.get(ROUTES.API.STORY(id));
  },

  async getAdmin(id: string): Promise<{ story: Story | null }> {
    return api.get(`${ROUTES.API.STORY(id)}?admin=true`, { auth: true });
  },

  async create(story: Story): Promise<{ story: Story }> {
    return api.post(ROUTES.API.STORIES, { story } satisfies StoryPayload, { auth: true });
  },

  async update(id: string, story: Story): Promise<{ story: Story }> {
    return api.put(ROUTES.API.STORY(id), { story } satisfies StoryPayload, { auth: true });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return api.delete(ROUTES.API.STORY(id), { auth: true });
  },
};

// ============================================
// EXPORT
// ============================================

export default api;
