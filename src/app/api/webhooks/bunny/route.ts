import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { mapBunnyStatusCode } from '@/lib/video-status';

/**
 * Bunny Stream Webhook Handler
 *
 * Bunny.net sẽ gửi POST request đến endpoint này khi video status thay đổi
 * Cần cấu hình webhook URL trong Bunny Stream dashboard
 *
 * Status codes:
 * 0 - Queued
 * 1 - Processing
 * 2 - Encoding
 * 3 - Finished (video ready)
 * 4 - Resolution finished (video playable)
 * 5 - Failed
 * 6 - PresignedUploadStarted
 * 7 - PresignedUploadFinished (TUS upload done)
 * 8 - PresignedUploadFailed
 * 9 - CaptionsGenerated
 * 10 - TitleOrDescriptionGenerated
 */

export const dynamic = 'force-dynamic';

const BUNNY_WEBHOOK_SECRET = process.env.BUNNY_WEBHOOK_SECRET;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Verify webhook signature from Bunny.net
 */
function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!BUNNY_WEBHOOK_SECRET) {
    // In development without secret configured, log warning and allow
    if (process.env.NODE_ENV === 'development') {
      console.error('[BUNNY WEBHOOK] WARNING: BUNNY_WEBHOOK_SECRET not set. Skipping signature verification.');
      return true;
    }
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', BUNNY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const providedSignature = Buffer.from(signatureHeader);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignature.length !== expectedSignatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get('x-bunny-webhook-signature');
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[BUNNY WEBHOOK] Invalid or missing webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { VideoGuid, Status } = body;

    if (!VideoGuid || Status === undefined) {
      console.error('[BUNNY WEBHOOK] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Map status
    const mappedStatus = mapBunnyStatusCode(Status);

    // Update video status in Supabase
    const { data, error } = await supabase
      .from('videos')
      .update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('bunny_video_id', VideoGuid)
      .select()
      .single();

    if (error) {
      console.error('[BUNNY WEBHOOK] Supabase update error:', error);
      // Still return 200 to acknowledge webhook
      return NextResponse.json({
        success: false,
        error: error.message,
        videoGuid: VideoGuid,
        status: mappedStatus,
      });
    }

    return NextResponse.json({
      success: true,
      videoId: data?.id,
      videoGuid: VideoGuid,
      bunnyStatus: Status,
      mappedStatus,
    });

  } catch (error) {
    console.error('[BUNNY WEBHOOK] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
