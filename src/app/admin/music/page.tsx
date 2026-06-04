'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { getAnyAccessToken, refreshToken } from '@/lib/admin-auth-client';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { broadcastContentChange } from '@/lib/content-sync';

interface MusicSetting {
  enabled: boolean;
  objectKey: string | null;
  volume: number;
  url?: string;
}

const ALLOWED = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a'];
const MAX_BYTES = 20 * 1024 * 1024;

class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UploadError';
  }
}

function publicUrl(objectKey: string | null): string | undefined {
  if (!objectKey) return undefined;
  return `/api/videos/file/${encodeURIComponent(objectKey)}`;
}

export default function AdminMusicPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  // The last saved setting (server state).
  const [saved, setSaved] = useState<MusicSetting>({ enabled: false, objectKey: null, volume: 0.4 });
  // The working draft (what the admin is editing).
  const [draft, setDraft] = useState<MusicSetting>({ enabled: false, objectKey: null, volume: 0.4 });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ music: MusicSetting }>('/api/settings/background-music');
      setSaved(res.music);
      setDraft(res.music);
    } catch {
      toast.error('Không tải được cài đặt nhạc nền');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // There are unsaved changes if the draft differs from the saved setting.
  const dirty =
    draft.enabled !== saved.enabled ||
    draft.objectKey !== saved.objectKey ||
    Math.round(draft.volume * 100) !== Math.round(saved.volume * 100);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type && !ALLOWED.includes(f.type)) {
      toast.error('Định dạng không hỗ trợ. Dùng MP3, OGG, WAV, M4A, AAC.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('File quá lớn (tối đa 20MB).');
      return;
    }
    setFile(f);
  };

  const uploadFile = (selected: File, token: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const ext = (selected.name.split('.').pop() || 'mp3').toLowerCase();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/settings/background-music/upload?ext=${encodeURIComponent(ext)}`, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            data.objectKey ? resolve(data.objectKey) : reject(new Error('Không nhận được file'));
          } catch {
            reject(new Error('Phản hồi không hợp lệ'));
          }
        } else {
          let msg = `Upload thất bại (HTTP ${xhr.status})`;
          try { const d = JSON.parse(xhr.responseText); if (d.error) msg = d.error; } catch {}
          reject(new UploadError(msg, xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Lỗi mạng khi tải lên'));
      xhr.send(selected);
    });

  const uploadFileWithFreshAuth = async (selected: File): Promise<string> => {
    let token = (await getAnyAccessToken()) || '';

    try {
      return await uploadFile(selected, token);
    } catch (err) {
      if (!(err instanceof UploadError) || err.status !== 401) {
        throw err;
      }

      const refreshedToken = await refreshToken();
      if (!refreshedToken || refreshedToken === token) {
        throw new Error('Phiên admin đã hết hạn. Đăng nhập lại rồi upload tiếp.');
      }

      token = refreshedToken;
      return uploadFile(selected, token);
    }
  };

  // Upload only puts the file on disk and stages it in the draft. Nothing is
  // applied to the site until the admin presses "Lưu thay đổi".
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const objectKey = await uploadFileWithFreshAuth(file);
      setDraft((d) => ({ ...d, objectKey, url: publicUrl(objectKey), enabled: true }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Đã tải lên. Bấm "Lưu thay đổi" để áp dụng.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ music: MusicSetting }>(
        '/api/settings/background-music',
        { objectKey: draft.objectKey, enabled: draft.enabled, volume: draft.volume },
        { auth: true },
      );
      setSaved(res.music);
      setDraft(res.music);
      broadcastContentChange('site-settings');
      toast.success('Đã lưu thay đổi nhạc nền!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(saved);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner message="Đang tải cài đặt..." />
      </div>
    );
  }

  const previewUrl = draft.url || publicUrl(draft.objectKey);

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-28">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900">Nhạc nền trang chủ</h1>
        <p className="text-gray-600 mt-1 mb-6">
          Tải lên một file nhạc để phát nền ở trang chủ. Mọi thay đổi chỉ áp dụng sau khi bấm
          <strong> Lưu thay đổi</strong>.
        </p>

        {/* Current status */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Trạng thái</p>
              <p className="text-sm text-gray-500">
                {draft.objectKey ? (draft.enabled ? 'Sẽ bật nhạc nền' : 'Sẽ tắt nhạc nền') : 'Chưa có nhạc nền'}
              </p>
            </div>
            {draft.objectKey && (
              <button
                onClick={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
                className={`px-4 py-2 rounded-md font-semibold text-white ${
                  draft.enabled ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {draft.enabled ? 'Tắt nhạc' : 'Bật nhạc'}
              </button>
            )}
          </div>

          {previewUrl && (
            <div className="mt-4">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}

          {draft.objectKey && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âm lượng: {Math.round(draft.volume * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(draft.volume * 100)}
                onChange={(e) => setDraft((d) => ({ ...d, volume: Number(e.target.value) / 100 }))}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Upload new track */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-3">
            {draft.objectKey ? 'Thay nhạc nền' : 'Tải lên nhạc nền'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
            disabled={uploading}
          />
          {file && <p className="mt-2 text-sm text-gray-600">{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</p>}

          {uploading && (
            <div className="mt-3">
              <div className="mb-1 text-sm text-gray-600">Đang tải lên... {progress}%</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`mt-4 w-full rounded-md py-3 font-semibold transition-colors ${
              file && !uploading ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {uploading ? 'Đang tải lên...' : 'Tải lên file (chưa áp dụng)'}
          </button>
          <p className="mt-2 text-xs text-gray-400">MP3, OGG, WAV, M4A, AAC — tối đa 20MB.</p>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-56 right-0 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <span className={`text-sm font-medium ${dirty ? 'text-amber-600' : 'text-gray-400'}`}>
            {dirty ? '● Có thay đổi chưa lưu' : 'Đã lưu tất cả thay đổi'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-md font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              Hoàn tác
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`px-6 py-2 rounded-md font-semibold text-white transition-colors ${
                dirty && !saving ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
