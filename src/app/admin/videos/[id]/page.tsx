'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video } from '@/types';
import { videoApi, ApiError } from '@/services/api';
import { LEVEL_OPTIONS, ROUTES } from '@/config/constants';
import SubtitleEditor from '@/components/video/SubtitleEditor';
import QuizEditor from '@/components/video/QuizEditor';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { resizeImage } from '@/services/image';

const THUMBNAIL_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<Video['level']>('Beginner');
  const [category, setCategory] = useState<'video' | 'music'>('video');
  const [feature, setFeature] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const loadVideo = useCallback(async () => {
    try {
      const data = await videoApi.getAdmin(videoId);
      
      if (data.video) {
        setVideo(data.video);
        setTitle(data.video.title);
        setTitleVi(data.video.titleVi);
        setDescription(data.video.description || '');
        setLevel(data.video.level);
        setCategory(data.video.category || 'video');
        setFeature(data.video.feature || '');
        setThumbnailUrl(data.video.thumbnailUrl || '');
      }
    } catch (error) {
      console.error('Failed to load video:', error);
      setMessage('Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handleSaveMetadata = async () => {
    setSaving(true);
    setMessage('');

    try {
      await videoApi.update(videoId, {
        title,
        titleVi,
        description,
        thumbnailUrl,
        level,
        category,
        feature,
      });

      setMessage('Metadata saved successfully.');
      await loadVideo(); // Reload
    } catch (error) {
      console.error('Save error:', error);
      setMessage(error instanceof ApiError ? error.message : 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!THUMBNAIL_ACCEPT.split(',').includes(selectedFile.type)) {
      setMessage('Thumbnail must be PNG, JPG, or WebP.');
      return;
    }

    try {
      const resized = await resizeImage(selectedFile, 640, 360, 0.82);
      setThumbnailUrl(resized);
      setMessage('Thumbnail selected. Click Save Metadata to apply.');
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      setMessage('Could not read thumbnail image.');
    } finally {
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner message="Đang tải video..." />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Video not found</h2>
          <button
            onClick={() => router.push('/admin/videos')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Video</h1>
            <p className="text-gray-600 mt-1">Update video details and subtitles</p>
          </div>
          <button
            onClick={() => router.push('/admin/videos')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Videos
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-lg ${
            message.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Metadata Form */}
        <div className="max-w-2xl mx-auto mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Video Metadata</h2>

          {/* Thumbnail */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Thumbnail
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Upload image
                </button>
                {thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('')}
                    disabled={saving}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept={THUMBNAIL_ACCEPT}
              onChange={handleThumbnailUpload}
              className="hidden"
              disabled={saving}
            />
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={video.title}
                  className="aspect-video w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-gray-500">
                  No thumbnail
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              video.status === 'ready' ? 'bg-green-100 text-green-800' :
              video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              video.status === 'error' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              Status: {video.status}
            </span>
            {video.duration > 0 && (
              <span className="ml-3 text-gray-600">
                Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (English)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (Vietnamese)
              </label>
              <input
                type="text"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Video['level'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Elementary">Elementary</option>
                <option value="Intermediate">Intermediate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'video' | 'music')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="video">🎬 Video học (Educational)</option>
                <option value="music">🎵 Video nhạc (Music)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Chuyển video giữa mục Video học và Video nhạc.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature (Chủ đề / Bộ sưu tập)
              </label>
              <input
                type="text"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Phonics, Bài hát thiếu nhi... (để trống = Tổng Hợp)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nhóm video theo chủ đề. Để trống sẽ được xếp vào mục “Tổng Hợp”.
              </p>
            </div>

            <button
              onClick={handleSaveMetadata}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-300"
            >
              {saving ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        </div>

        {/* Subtitle Editor */}
        <SubtitleEditor
          videoId={videoId}
          initialSubtitles={video.subtitles}
          onSave={() => {
            setMessage('Subtitles saved successfully.');
            loadVideo();
          }}
        />

        {/* Quiz Editor */}
        <QuizEditor
          videoId={videoId}
          initialQuiz={video.quiz || []}
          onSave={() => {
            setMessage('Quiz saved successfully.');
            loadVideo();
          }}
        />
      </div>
    </div>
  );
}
