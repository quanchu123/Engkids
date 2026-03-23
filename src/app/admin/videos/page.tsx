'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video } from '@/types';
import { videoApi, ApiError } from '@/services/api';
import { ROUTES } from '@/config/constants';
import { useToast } from '@/hooks/useToast';

export default function AdminVideosPage() {
  const router = useRouter();
  const toast = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ready' | 'processing' | 'error'>('all');

  useEffect(() => {
    loadVideos();
  }, []);

  // Auto-refresh every 15s if any video is still processing/uploading
  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'processing' || v.status === 'uploading');
    if (!hasProcessing) return;
    const interval = setInterval(loadVideos, 15000);
    return () => clearInterval(interval);
  }, [videos]);

  const loadVideos = async () => {
    try {
      // Use listAll to get ALL videos including processing/error
      const data = await videoApi.listAll();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await videoApi.delete(videoId);
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete video');
    }
  };

  const handleSyncStatus = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/status`);
      const data = await res.json();
      if (data.status) {
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: data.status } : v));
        if (data.status === 'ready') toast.success('✅ Video is now ready!');
      }
    } catch {
      toast.error('Failed to sync status');
    }
  };

  const handleForceReady = async (videoId: string) => {
    try {
      await videoApi.update(videoId, { status: 'ready' });
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'ready' } : v));
      toast.success('✅ Marked as ready');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredVideos = videos.filter(v => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const getStatusBadge = (status: Video['status']) => {
    const colors = {
      uploading: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Video Library</h1>
            <p className="text-gray-600 mt-1">{videos.length} total videos</p>
          </div>
          <Link
            href="/admin/videos/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
          >
            + Upload New Video
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'ready', 'processing', 'error'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-sm">
                ({status === 'all' ? videos.length : videos.filter(v => v.status === status).length})
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">Loading videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h3>
            <p className="text-gray-500 mb-6">Upload your first video to get started</p>
            <Link
              href="/admin/videos/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Upload Video
            </Link>
          </div>
        )}

        {/* Video Grid */}
        {!loading && filteredVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-500">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken image and show fallback
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {/* Fallback always visible behind image */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center text-white text-6xl -z-10">
                    📹
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(video.status)}`}>
                      {video.status === 'processing' || video.status === 'uploading' ? '⏳ ' : ''}{video.status}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  {video.duration > 0 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-1">
                    {video.titleVi}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">{video.level}</span>
                    <span>{formatDate(video.createdAt)}</span>
                    {video.subtitles.length > 0 && (
                      <span>• {video.subtitles.length} subtitles</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors text-center font-medium"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/videos/${video.id}`}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors text-center font-medium"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                  {/* Sync row for non-ready videos */}
                  {video.status !== 'ready' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSyncStatus(video.id)}
                        className="flex-1 px-3 py-1.5 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors font-medium"
                        title="Check Bunny CDN for status update"
                      >
                        ⚡ Sync Status
                      </button>
                      <button
                        onClick={() => handleForceReady(video.id)}
                        className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors font-medium"
                        title="Force mark as ready (use if video is on Bunny but stuck)"
                      >
                        ✅ Force Ready
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
