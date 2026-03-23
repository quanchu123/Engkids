import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import crypto from 'crypto';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY!;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID!;

export const dynamic = 'force-dynamic';

/**
 * POST /api/videos/upload/signature
 * 
 * Tạo signed URL để client upload trực tiếp lên Bunny.net
 * Bypass server proxy - giải quyết timeout với file lớn
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { videoId, expirationTime = 3600 } = body; // 1 hour default
    
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }
    
    // Create expiration timestamp
    const expiration = Math.floor(Date.now() / 1000) + expirationTime;
    
    // Create signature for TUS upload
    // Bunny.net TUS signature format: sha256(library_id + api_key + expiration + video_id)
    const signatureString = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expiration}${videoId}`;
    const signature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex');
    
    return NextResponse.json({
      success: true,
      uploadUrl: `https://video.bunnycdn.com/tusupload`,
      videoId,
      libraryId: BUNNY_LIBRARY_ID,
      signature,
      expiration,
    });
  } catch (error) {
    console.error('[SIGNATURE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create signature' },
      { status: 500 }
    );
  }
}
