'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video } from '@/types';
import { videoApi, ApiError } from '@/services/api';
import { LEVEL_OPTIONS, ROUTES } from '@/config/constants';
import SubtitleEditor from '@/components/video/SubtitleEditor';
import QuizEditor from '@/components/video/QuizEditor';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

  const loadVideo = useCallback(async () => {
    try {
      const data = await videoApi.get(videoId);
      
      if (data.video) {
        setVideo(data.video);
        setTitle(data.video.title);
        setTitleVi(data.video.titleVi);
        setDescription(data.video.description || '');
        setLevel(data.video.level);
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
        level,
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

          {/* Video Preview */}
          {video.thumbnailUrl && (
            <div className="mb-4 relative bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg h-48">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-48 object-cover rounded-lg relative z-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback */}
              <div className="absolute inset-0 flex items-center justify-center text-white text-6xl">
                VIDEO
              </div>
            </div>
          )}

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
