'use client';

import { ReactNode, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ERRORS, LEVELS, ROUTES } from '@/config/constants';
import { useToast } from '@/hooks/useToast';
import { getAnyAccessToken, refreshToken } from '@/lib/admin-auth-client';
import { broadcastContentChange } from '@/lib/content-sync';
import { videoApi } from '@/services/api';
import { resizeImage } from '@/services/image';

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
  onError?: (error: string) => void;
  initialCategory?: 'video' | 'music';
}

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
const ALLOWED_EXT_LABEL = 'MP4, WebM, MOV, OGG';
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const THUMBNAIL_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp';

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UploadError';
  }
}

async function inspectVideoFile(videoFile: File): Promise<{ thumbnail: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    let duration = 0;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const capture = () => {
      try {
        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 360;
        const scale = Math.min(1, 640 / sourceWidth);
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot create thumbnail canvas');
        ctx.drawImage(video, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.82);
        cleanup();
        resolve({ thumbnail, duration });
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => {
      cleanup();
      reject(new Error('Không đọc được file video đã chọn.'));
    };
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? Math.max(0, Math.round(video.duration)) : 0;
      video.currentTime = Math.min(Math.max(duration * 0.1, 0.2), 2);
    };
    video.onseeked = capture;
    video.src = objectUrl;
  });
}

export default function VideoUploader({ onUploadComplete, onError, initialCategory = 'video' }: VideoUploaderProps) {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [description, setDescription] = useState('');
  type LevelValue = (typeof LEVELS)[keyof typeof LEVELS];
  const [level, setLevel] = useState<LevelValue>(LEVELS.BEGINNER);
  const [category, setCategory] = useState<'video' | 'music'>(initialCategory);
  const [feature, setFeature] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [customThumbnail, setCustomThumbnail] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

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
    setDurationSeconds(0);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));

    setThumbnailStatus('Đang tạo thumbnail từ video...');
    try {
      const metadata = await inspectVideoFile(selectedFile);
      setThumbnailUrl(metadata.thumbnail);
      setDurationSeconds(metadata.duration);
      setCustomThumbnail(false);
      setThumbnailStatus(
        metadata.duration > 0
          ? `Đã tạo thumbnail. Thời lượng: ${formatDuration(metadata.duration)}.`
          : 'Đã tạo thumbnail từ video.',
      );
    } catch (error) {
      console.warn('Failed to inspect selected video:', error);
      setThumbnailStatus('Không tự tạo được thumbnail. Bạn có thể chọn ảnh thủ công.');
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!THUMBNAIL_ACCEPT.split(',').includes(selectedFile.type)) {
      toast.error('Thumbnail phải là PNG, JPG hoặc WebP.');
      return;
    }

    try {
      setThumbnailStatus('Đang tối ưu thumbnail...');
      const resized = await resizeImage(selectedFile, 640, 360, 0.82);
      setThumbnailUrl(resized);
      setCustomThumbnail(true);
      setThumbnailStatus('Đã chọn thumbnail thủ công.');
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast.error('Không đọc được ảnh thumbnail.');
      setThumbnailStatus('Không đọc được ảnh thumbnail.');
    } finally {
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile) return;
    handleFileSelect({ target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const uploadFile = (
    selectedFile: File,
    accessToken: string,
  ): Promise<{ objectKey: string; thumbnailUrl?: string }> => {
    return new Promise((resolve, reject) => {
      const ext = (selectedFile.name.split('.').pop() || 'mp4').toLowerCase();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${ROUTES.API.VIDEO_UPLOAD}?ext=${encodeURIComponent(ext)}`, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgressPct(Math.round((event.loaded / event.total) * 90));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.objectKey) {
              resolve({
                objectKey: data.objectKey,
                thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
              });
              return;
            }
            reject(new Error('Upload thành công nhưng server không trả object key.'));
          } catch {
            reject(new Error('Server trả dữ liệu upload không hợp lệ.'));
          }
          return;
        }

        let message = `Upload thất bại (HTTP ${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) message = data.error;
        } catch {
          // keep default
        }
        reject(new UploadError(message, xhr.status));
      };
      xhr.onerror = () => reject(new Error('Lỗi mạng khi upload.'));
      xhr.send(selectedFile);
    });
  };

  const uploadFileWithFreshAuth = async (selectedFile: File) => {
    let accessToken = (await getAnyAccessToken()) || '';

    try {
      return await uploadFile(selectedFile, accessToken);
    } catch (error) {
      if (!(error instanceof UploadError) || error.status !== 401) throw error;

      const refreshedToken = await refreshToken();
      if (!refreshedToken || refreshedToken === accessToken) {
        throw new Error('Phiên admin đã hết hạn. Đăng nhập lại rồi upload tiếp.');
      }

      accessToken = refreshedToken;
      return uploadFile(selectedFile, accessToken);
    }
  };

  const handleStartUpload = async () => {
    if (!file || !title || !titleVi) {
      const error = 'Điền đủ tiêu đề và chọn file video trước khi upload.';
      toast.error(error);
      onError?.(error);
      return;
    }

    setBusy(true);
    setProgressPct(0);
    try {
      const uploaded = await uploadFileWithFreshAuth(file);
      setProgressPct(95);
      const finalThumbnailUrl = customThumbnail ? thumbnailUrl : uploaded.thumbnailUrl || thumbnailUrl;

      const data = await videoApi.create({
        objectKey: uploaded.objectKey,
        title,
        titleVi,
        description,
        thumbnailUrl: finalThumbnailUrl,
        level,
        topics: [],
        category,
        feature,
        duration: durationSeconds,
      });

      setProgressPct(100);
      toast.success('Video đã tải lên máy chủ và sẵn sàng xem!');
      broadcastContentChange('videos');
      router.refresh();
      onUploadComplete?.(data.video.id);
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload thất bại';
      toast.error(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-xl font-black text-slate-950">Thông tin upload</h2>
        <p className="mt-1 text-sm text-slate-500">File được lưu trên SSD của droplet và phát trực tiếp qua website.</p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div
            className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50'
            }`}
            role="button"
            aria-label="Upload video - drag and drop or click to browse"
            tabIndex={0}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); !busy && fileInputRef.current?.click(); } }}
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
              <>
                <p className="font-black text-emerald-700">Đã chọn file</p>
                <p className="mt-2 max-w-full truncate text-sm font-bold text-slate-700">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                  {durationSeconds > 0 ? ` · ${formatDuration(durationSeconds)}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="font-black text-slate-700">Kéo thả video hoặc bấm để chọn file</p>
                <p className="mt-2 text-sm text-slate-400">{ALLOWED_EXT_LABEL} · tối đa 2GB</p>
              </>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm font-black text-slate-700">Thumbnail</label>
              <button
                type="button"
                onClick={() => !busy && thumbnailInputRef.current?.click()}
                disabled={busy}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Chọn ảnh khác
              </button>
            </div>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept={THUMBNAIL_ACCEPT}
              onChange={handleThumbnailUpload}
              className="hidden"
              disabled={busy}
            />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="Video thumbnail preview" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center px-4 text-center text-sm font-bold text-slate-400">
                  Thumbnail sẽ tự tạo từ một frame trong video sau khi chọn file.
                </div>
              )}
            </div>
            {thumbnailStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{thumbnailStatus}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tiêu đề tiếng Anh" required>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="admin-input"
                placeholder="Peppa Pig - George's Birthday"
                disabled={busy}
                required
              />
            </Field>
            <Field label="Tiêu đề tiếng Việt" required>
              <input
                type="text"
                value={titleVi}
                onChange={(event) => setTitleVi(event.target.value)}
                className="admin-input"
                placeholder="Sinh nhật của George"
                disabled={busy}
                required
              />
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="admin-input min-h-[96px] resize-y"
              placeholder="Mô tả ngắn để người học dễ chọn bài."
              disabled={busy}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Level" required>
              <select value={level} onChange={(event) => setLevel(event.target.value as LevelValue)} className="admin-input bg-white" disabled={busy}>
                <option value={LEVELS.BEGINNER}>Beginner</option>
                <option value={LEVELS.ELEMENTARY}>Elementary</option>
                <option value={LEVELS.INTERMEDIATE}>Intermediate</option>
              </select>
            </Field>
            <Field label="Loại" required>
              <select value={category} onChange={(event) => setCategory(event.target.value as 'video' | 'music')} className="admin-input bg-white" disabled={busy}>
                <option value="video">Video học</option>
                <option value="music">Video nhạc</option>
              </select>
            </Field>
            <Field label="Thời lượng">
              <input className="admin-input bg-slate-50 text-slate-500" value={durationSeconds > 0 ? formatDuration(durationSeconds) : 'Tự đọc từ file'} readOnly />
            </Field>
          </div>

          <Field label="Chủ đề / bộ sưu tập">
            <input
              type="text"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              className="admin-input"
              placeholder="Phonics, Bài hát thiếu nhi... để trống = Tổng hợp"
              disabled={busy}
            />
          </Field>

          {busy && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex justify-between text-sm font-black text-slate-600">
                <span>Đang tải lên</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleStartUpload}
            disabled={!file || !title || !titleVi || busy}
            className={`min-h-[48px] w-full rounded-xl px-4 text-sm font-black transition-colors ${
              file && title && titleVi && !busy
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            {busy ? 'Đang tải lên...' : 'Upload và đăng ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
