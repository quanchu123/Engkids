'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { LEVELS, ERRORS, ROUTES } from '@/config/constants';
import { videoApi } from '@/services/api';
import { getAnyAccessToken } from '@/lib/admin-auth-client';

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
  onError?: (error: string) => void;
  initialCategory?: 'video' | 'music';
}

// Allowed types for self-uploaded videos played as direct MP4.
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
const ALLOWED_EXT_LABEL = 'MP4, WebM, MOV, OGG';
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export default function VideoUploader({ onUploadComplete, onError, initialCategory = 'video' }: VideoUploaderProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [description, setDescription] = useState('');
  type LevelValue = (typeof LEVELS)[keyof typeof LEVELS];
  const [level, setLevel] = useState<LevelValue>(LEVELS.BEGINNER);
  const [category, setCategory] = useState<'video' | 'music'>(initialCategory);
  const [feature, setFeature] = useState('');

  const [busy, setBusy] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        const error = ERRORS.INVALID_FILE_TYPE([ALLOWED_EXT_LABEL]);
        toast.error(error);
        onError?.(error);
        return;
      }
      if (selectedFile.size > MAX_BYTES) {
        const error = ERRORS.FILE_TOO_LARGE(2048);
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

  // Upload the raw file to our server, which streams it to the droplet disk.
  // Returns the stored object key. Tracks progress via XMLHttpRequest.
  const uploadFile = (selectedFile: File, accessToken: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ext = (selectedFile.name.split('.').pop() || 'mp4').toLowerCase();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${ROUTES.API.VIDEO_UPLOAD}?ext=${encodeURIComponent(ext)}`, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Reserve the last 10% for recording metadata.
          setProgressPct(Math.round((event.loaded / event.total) * 90));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.objectKey) resolve(data.objectKey);
            else reject(new Error('Upload succeeded but no object key was returned'));
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          let msg = `Upload failed (HTTP ${xhr.status})`;
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) msg = data.error;
          } catch {
            // keep default message
          }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(selectedFile);
    });
  };

  const handleStartUpload = async () => {
    if (!file || !title || !titleVi) {
      const error = 'Please fill in all required fields and select a video';
      toast.error(error);
      onError?.(error);
      return;
    }

    setBusy(true);
    setProgressPct(0);
    try {
      const accessToken = (await getAnyAccessToken()) || '';

      // 1. Stream the file to the server (stored on the droplet disk).
      const objectKey = await uploadFile(file, accessToken);
      setProgressPct(95);

      // 2. Record the video metadata.
      const data = await videoApi.create({
        objectKey,
        title,
        titleVi,
        description,
        level,
        topics: [],
        category,
        feature,
      });
      setProgressPct(100);

      toast.success('Video đã tải lên máy chủ và sẵn sàng xem!');
      onUploadComplete?.(data.video.id);
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Upload New Video</h2>
      <p className="mb-6 text-sm text-gray-500">
        Video được lưu trên máy chủ và phát trực tiếp.
      </p>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        role="button"
        aria-label="Upload video - drag and drop or click to browse"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !busy && fileInputRef.current?.click(); } }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !busy && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/ogg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={busy}
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
            <p className="text-gray-600 mb-2 font-medium">Drag & drop video here or click to browse</p>
            <p className="text-gray-400 text-sm">{ALLOWED_EXT_LABEL} (max 2GB)</p>
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
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
          >
            <option value="video">Educational Video (Learning Content)</option>
            <option value="music">Music (Songs for Learning)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {category === 'music'
              ? 'Will appear in Music section - for songs and sing-along videos'
              : 'Will appear in Videos section - for lessons and educational content'}
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
            disabled={busy}
          />
          <p className="text-xs text-gray-500 mt-1">
            Nhóm video theo chủ đề. Để trống sẽ được xếp vào mục “Tổng Hợp”.
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {busy && (
        <div className="mb-4">
          <div className="mb-1 text-sm text-gray-600">Đang tải lên... {progressPct}%</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-3">
        <button
          onClick={handleStartUpload}
          disabled={!file || !title || !titleVi || busy}
          className={`flex-1 py-3 px-4 rounded-md font-semibold transition-colors ${
            file && title && titleVi && !busy
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {busy ? 'Đang tải lên...' : 'Tải lên video'}
        </button>
      </div>
    </div>
  );
}
