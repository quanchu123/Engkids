'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { useTusUpload } from '@/hooks/useTusUpload';
import { VIDEO, LEVELS, ERRORS } from '@/config/constants';
import { videoApi } from '@/services/api';
import VideoUploadProgress from './VideoUploadProgress';

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
  onError?: (error: string) => void;
}

export default function VideoUploader({ onUploadComplete, onError }: VideoUploaderProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [description, setDescription] = useState('');
  type LevelValue = (typeof LEVELS)[keyof typeof LEVELS];
  const [level, setLevel] = useState<LevelValue>(LEVELS.BEGINNER);
  const [category, setCategory] = useState<'video' | 'music'>('video');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, status, startUpload, cancelUpload } = useTusUpload({
    onComplete: (videoId) => {
      toast.success('Video uploaded and processed!');
      onUploadComplete?.(videoId);
    },
    onError: (error) => {
      toast.error(error);
      onError?.(error);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!(VIDEO.ALLOWED_TYPES as readonly string[]).includes(selectedFile.type)) {
        const error = ERRORS.INVALID_FILE_TYPE(VIDEO.ALLOWED_EXTENSIONS);
        toast.error(error);
        onError?.(error);
        return;
      }
      if (selectedFile.size > VIDEO.MAX_SIZE_BYTES) {
        const error = ERRORS.FILE_TOO_LARGE(VIDEO.MAX_SIZE_MB);
        toast.error(error);
        onError?.(error);
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleStartUpload = async () => {
    if (!file || !title || !titleVi) {
      const error = 'Please fill in all required fields and select a video';
      toast.error(error);
      onError?.(error);
      return;
    }

    try {
      const data = await videoApi.create({
        title,
        titleVi,
        description,
        level,
        topics: [],
        category,
      });

      await startUpload(file, data.video.bunnyVideoId, data.video.id, title);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload New Video</h2>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        role="button"
        aria-label="Upload video - drag and drop or click to browse"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !uploading && fileInputRef.current?.click(); } }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        {file ? (
          <div>
            <p className="text-green-600 font-semibold mb-2">✓ File selected</p>
            <p className="text-gray-700">{file.name}</p>
            <p className="text-gray-500 text-sm mt-1">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📹</div>
            <p className="text-gray-600 mb-2 font-medium">Drag & drop video here or click to browse</p>
            <p className="text-gray-400 text-sm">MP4, MOV, AVI, WebM (max 1GB)</p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title (English) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Peppa Pig - George's Birthday"
            disabled={uploading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title (Vietnamese) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Peppa Pig - Sinh nhật của George"
            disabled={uploading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Brief description of the video..."
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty Level <span className="text-red-500">*</span>
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelValue)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={uploading}
          >
            <option value={LEVELS.BEGINNER}>Beginner</option>
            <option value={LEVELS.ELEMENTARY}>Elementary</option>
            <option value={LEVELS.INTERMEDIATE}>Intermediate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'video' | 'music')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={uploading}
          >
            <option value="video">🎬 Educational Video (Learning Content)</option>
            <option value="music">🎵 Music (Songs for Learning)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {category === 'music'
              ? '🎤 Will appear in Music section - for songs and sing-along videos'
              : '📚 Will appear in Videos section - for lessons and educational content'}
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && <VideoUploadProgress status={status} progress={progress} />}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!uploading ? (
          <button
            onClick={handleStartUpload}
            disabled={!file || !title || !titleVi}
            className={`flex-1 py-3 px-4 rounded-md font-semibold transition-colors ${
              file && title && titleVi
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🚀 Upload to Bunny.net
          </button>
        ) : (
          <button
            onClick={cancelUpload}
            className="flex-1 py-3 px-4 rounded-md font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
          >
            ✕ Cancel Upload
          </button>
        )}
      </div>
    </div>
  );
}
