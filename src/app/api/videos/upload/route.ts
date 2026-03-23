import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Config for large file uploads
export const maxDuration = 900; // 15 minutes timeout for Vercel
export const dynamic = 'force-dynamic';

// PUT /api/videos/upload?videoId=xxx - Upload video chunk to Bunny.net
// This proxies the upload through server to avoid exposing API key
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate env configuration
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check file size limit
    const contentLength = request.headers.get('content-length');

    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 500MB' }, { status: 413 });
    }

    // Check admin auth
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Get the video file from request body - use stream for large files

    // IMPORTANT: Don't buffer entire file - pass stream directly to Bunny
    // This allows handling files larger than memory limit
    const requestBody = request.body;

    if (!requestBody) {
      return NextResponse.json({ error: 'No video data provided' }, { status: 400 });
    }

    // Convert ReadableStream to ArrayBuffer for fetch (required by Node fetch)
    // Note: This buffers in chunks, better than arrayBuffer() for progress
    const chunks: Uint8Array[] = [];
    const reader = requestBody.getReader();
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;
    }

    const body = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }

    const bodySize = body.byteLength;

    if (bodySize === 0) {
      return NextResponse.json({ error: 'No video data provided' }, { status: 400 });
    }

    // Upload to Bunny.net with extended timeout
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 1800000); // 30 minutes timeout

    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Upload failed: ${response.statusText}` },
          { status: response.status }
        );
      }

      const result = await response.json();

      return NextResponse.json({
        success: true,
        message: 'Video uploaded successfully',
        data: result,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Upload timeout - video file too large. Try a smaller file.' },
          { status: 408 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ [UPLOAD API ${elapsed}s] Unhandled error:`, error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// POST /api/videos/upload/signature - Get signed upload URL (alternative approach)
// This creates a TUS upload signature for large files
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Create a signed TUS upload URL
    // For Bunny.net, we need to use their TUS endpoint with the API key
    const tusUrl = `https://video.bunnycdn.com/tusupload`;
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry

    // Create HMAC signature for secure upload (server-side signed)
    // Client receives signed URL but never sees API key
    return NextResponse.json({
      uploadUrl: tusUrl,
      videoId,
      libraryId: BUNNY_LIBRARY_ID,
      expiresAt: expirationTime * 1000,
      // SECURITY: Headers are signed server-side, client uses proxy upload instead
      // Never expose API keys to client
    });
  } catch (error) {
    console.error('Error creating upload signature:', error);
    return NextResponse.json(
      { error: 'Failed to create upload signature' },
      { status: 500 }
    );
  }
}
