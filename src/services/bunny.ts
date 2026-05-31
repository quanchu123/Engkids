// Bunny.net Stream API Service
// Documentation: https://docs.bunny.net/docs/stream

import crypto from 'crypto';
import { mapBunnyStatusCode } from '@/lib/video-status';

/**
 * Validate and get Bunny.net configuration
 */
function getConfig(): { apiKey: string; libraryId: string; cdnHostname: string; cdnSecurityKey?: string } {
  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
  const cdnSecurityKey = process.env.BUNNY_CDN_SECURITY_KEY; // Optional: for signed URLs
  
  if (!apiKey || !libraryId || !cdnHostname) {
    throw new Error(
      'Bunny.net configuration missing. Please set BUNNY_API_KEY, BUNNY_LIBRARY_ID, and BUNNY_CDN_HOSTNAME in .env.local'
    );
  }
  
  return { apiKey, libraryId, cdnHostname, cdnSecurityKey };
}

/**
 * Generate signed URL for Bunny CDN (if Token Authentication is enabled)
 * @param url - The full URL to sign (e.g., https://cdn.net/video-id/thumbnail.jpg)
 * @param expiresInSeconds - How long the URL is valid (default 24 hours)
 * @returns Signed URL or original URL if no security key
 */
export function generateSignedUrl(url: string, expiresInSeconds: number = 86400): string {
  const { cdnSecurityKey } = getConfig();
  
  // If no security key configured, return original URL
  if (!cdnSecurityKey) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    
    // Generate token: Base64(SHA256(security_key + path + expires))
    const hashableBase = cdnSecurityKey + path + expires;
    const hash = crypto.createHash('sha256').update(hashableBase).digest('base64');
    
    // Format token: replace special characters
    const token = hash
      .replace(/\n/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Add token and expires to URL
    urlObj.searchParams.set('token', token);
    urlObj.searchParams.set('expires', expires.toString());
    
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to generate signed URL, using original:', error);
    return url;
  }
}

/**
 * Generate signed thumbnail URL
 */
export function getSignedThumbnailUrl(videoId: string, thumbnailFileName: string = 'thumbnail.jpg'): string {
  const { cdnHostname } = getConfig();
  const url = `https://${cdnHostname}/${videoId}/${thumbnailFileName}`;
  return generateSignedUrl(url);
}

interface BunnyVideoResponse {
  guid: string;
  videoLibraryId: number;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number;
  framerate: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  thumbnailFileName: string;
  averageWatchTime: number;
  totalWatchTime: number;
  category: string;
  chapters: unknown[];
  moments: unknown[];
  metaTags: Array<{ property: string; value: string }>;
  transcodingMessages: unknown[];
}

interface BunnyCreateVideoResponse {
  success: boolean;
  message: string;
  statusCode: number;
  guid?: string;
}

/**
 * Create a video placeholder in Bunny Stream
 * Returns video ID (GUID) for uploading
 */
export async function createBunnyVideo(title: string): Promise<{
  videoId: string;
  uploadUrl: string;
}> {
  const { apiKey, libraryId } = getConfig();
  const apiBase = `https://video.bunnycdn.com/library/${libraryId}`;
  
  const response = await fetch(`${apiBase}/videos`, {
    method: 'POST',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/json',
    },
    // Set isPublic to true so thumbnail/video can be accessed
    body: JSON.stringify({ title, isPublic: true }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bunny.net API error: ${error}`);
  }

  const data = await response.json() as BunnyCreateVideoResponse;
  
  if (!data.guid) {
    throw new Error('Failed to create video: No GUID returned');
  }

  return {
    videoId: data.guid,
    uploadUrl: `${apiBase}/videos/${data.guid}`,
  };
}

/**
 * Get video status and details from Bunny.net
 */
export async function getBunnyVideoStatus(videoId: string): Promise<{
  status: 'uploading' | 'processing' | 'ready' | 'error';
  bunnyStatus: number; // Raw Bunny status code (0-5)
  pctComplete: number;
  hlsUrl?: string;
  dashUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}> {
  const { apiKey, libraryId, cdnHostname } = getConfig();
  const apiBase = `https://video.bunnycdn.com/library/${libraryId}`;
  
  // IMPORTANT: Disable Next.js fetch cache - we need fresh data for status polling
  const response = await fetch(`${apiBase}/videos/${videoId}`, {
    method: 'GET',
    headers: {
      'AccessKey': apiKey,
    },
    cache: 'no-store', // Disable caching - always get fresh status
  });

  if (!response.ok) {
    throw new Error(`Failed to get video status: ${response.statusText}`);
  }

  const video = await response.json() as BunnyVideoResponse;
  
  // Bunny status codes: 0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=Resolution Finished, 5=Failed
  // Note: Status 0 (Queued) means upload is complete but encoding hasn't started yet
  let pctComplete = 0;
  
  // Check if video has been uploaded (length > 0 means file was uploaded)
  const hasContent = video.length > 0;
  const status = mapBunnyStatusCode(video.status, hasContent);
  pctComplete = status === 'ready' ? 100 : status === 'processing' ? 50 : status === 'uploading' ? 10 : 0;

  const result: {
    status: 'uploading' | 'processing' | 'ready' | 'error';
    bunnyStatus: number;
    pctComplete: number;
    hlsUrl?: string;
    dashUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  } = { status, bunnyStatus: video.status, pctComplete };

  if (status === 'ready') {
    result.hlsUrl = `https://${cdnHostname}/${videoId}/playlist.m3u8`;
    result.dashUrl = `https://${cdnHostname}/${videoId}/manifest.mpd`;
    result.thumbnailUrl = getSignedThumbnailUrl(videoId);
    result.duration = video.length;
  }

  return result;
}

/**
 * Delete a video from Bunny.net Stream
 */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const { apiKey, libraryId } = getConfig();
  const apiBase = `https://video.bunnycdn.com/library/${libraryId}`;
  
  const response = await fetch(`${apiBase}/videos/${videoId}`, {
    method: 'DELETE',
    headers: {
      'AccessKey': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete video: ${response.statusText}`);
  }
}

/**
 * Get video embed URL for player
 */
export function getBunnyEmbedUrl(videoId: string): string {
  const { libraryId } = getConfig();
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

/**
 * Get direct stream URLs
 */
export function getBunnyStreamUrls(videoId: string): {
  hlsUrl: string;
  thumbnailUrl: string;
} {
  const { cdnHostname } = getConfig();
  return {
    hlsUrl: `https://${cdnHostname}/${videoId}/playlist.m3u8`,
    thumbnailUrl: `https://${cdnHostname}/${videoId}/thumbnail.jpg`,
  };
}


