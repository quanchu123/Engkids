import { NextRequest, NextResponse } from 'next/server';
import { getBunnyVideoStatus } from '@/services/bunny';
import { getVideoById, updateVideo } from '@/services/video';

// Check if video is accessible via CDN (works even when API key is wrong)
async function checkCdnReady(bunnyVideoId: string, cdnHostname: string): Promise<boolean> {
  try {
    const hlsUrl = `https://${cdnHostname}/${bunnyVideoId}/playlist.m3u8`;
    const res = await fetch(hlsUrl, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// GET /api/videos/[id]/status - Poll video processing status from Bunny.net
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await getVideoById(id);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Try to get status from Bunny.net Stream API
    let bunnyStatus: Awaited<ReturnType<typeof getBunnyVideoStatus>> | null = null;
    let bunnyError: string | null = null;
    
    try {
      bunnyStatus = await getBunnyVideoStatus(video.bunnyVideoId);
    } catch (error) {
      bunnyError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Fallback: check CDN directly if API key failed
    if (!bunnyStatus) {
      const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
      if (cdnHostname) {
        const isReady = await checkCdnReady(video.bunnyVideoId, cdnHostname);
        if (isReady) {
          const hlsUrl = `https://${cdnHostname}/${video.bunnyVideoId}/playlist.m3u8`;
          const dashUrl = `https://${cdnHostname}/${video.bunnyVideoId}/manifest.mpd`;
          const thumbnailUrl = `https://${cdnHostname}/${video.bunnyVideoId}/thumbnail.jpg`;

          // Update DB to ready
          if (video.status !== 'ready') {
            await updateVideo(id, { status: 'ready', hlsUrl, dashUrl, thumbnailUrl }).catch(() => {});
          }

          return NextResponse.json({
            videoId: id,
            status: 'ready',
            bunnyStatus: 4, // Resolution Finished
            bunnyDetails: { state: 'ready', pctComplete: 100, hlsUrl },
            source: 'cdn-fallback',
          });
        }
      }

      return NextResponse.json({
        videoId: id,
        status: video.status,
        bunnyStatus: null,
        bunnyError,
        bunnyDetails: null,
      });
    }

    // Map Bunny.net status to our status
    const status: 'uploading' | 'processing' | 'ready' | 'error' = bunnyStatus.status;
    
    // Update in database if status changed
    if (status !== video.status) {
      const updates: Parameters<typeof updateVideo>[1] = { status };
      if (status === 'ready') {
        updates.duration = Math.floor(bunnyStatus.duration || 0);
        updates.thumbnailUrl = bunnyStatus.thumbnailUrl;
        updates.hlsUrl = bunnyStatus.hlsUrl;
        updates.dashUrl = bunnyStatus.dashUrl;
      }
      await updateVideo(id, updates).catch((e) => console.error(`❌ Failed to update video ${id}:`, e));
    }
    
    return NextResponse.json({
      videoId: id,
      status,
      bunnyStatus: bunnyStatus.bunnyStatus,
      bunnyDetails: {
        state: bunnyStatus.status,
        pctComplete: bunnyStatus.pctComplete || 0,
        duration: bunnyStatus.duration || 0,
        hlsUrl: bunnyStatus.hlsUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching video status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
