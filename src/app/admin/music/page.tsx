'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { getAnyAccessToken } from '@/lib/admin-auth-client';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface MusicSetting {
  enabled: boolean;
  objectKey: string | null;
  volume: number;
  url?: string;
}

const ALLOWED = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a'];
const MAX_BYTES = 20 * 1024 * 1024;

export default function AdminMusicPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [music, setMusic] = useState<MusicSetting>({ enabled: false, objectKey: null, volume: 0.4 });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ music: MusicSetting }>('/api/settings/background-music');
      setMusic(res.music);
    } catch {
      toast.error('Không tải được cài đặt nhạc nền');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

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
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Lỗi mạng khi tải lên'));
      xhr.send(selected);
    });

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const token = (await getAnyAccessToken()) || '';
      const objectKey = await uploadFile(file, token);
      // Save setting: set the new track and enable it.
      const res = await api.put<{ music: MusicSetting }>(
        '/api/settings/background-music',
        { objectKey, enabled: true },
        { auth: true },
      );
      setMusic(res.music);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Đã tải lên và đặt làm nhạc nền!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setBusy(false);
    }
  };

  const updateSetting = async (patch: Partial<MusicSetting>) => {
    try {
      const res = await api.put<{ music: MusicSetting }>(
        '/api/settings/background-music',
        patch,
        { auth: true },
      );
      setMusic(res.music);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner message="Đang tải cài đặt..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900">Nhạc nền trang chủ</h1>
        <p className="text-gray-600 mt-1 mb-6">
          Tải lên một file nhạc để phát nền ở trang chủ. Có thể bật/tắt và chỉnh âm lượng.
        </p>

        {/* Current status */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Trạng thái</p>
              <p className="text-sm text-gray-500">
                {music.objectKey ? (music.enabled ? 'Đang bật' : 'Đã tắt') : 'Chưa có nhạc nền'}
              </p>
            </div>
            {music.objectKey && (
              <button
                onClick={() => updateSetting({ enabled: !music.enabled })}
                className={`px-4 py-2 rounded-md font-semibold text-white ${
                  music.enabled ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {music.enabled ? 'Tắt nhạc' : 'Bật nhạc'}
              </button>
            )}
          </div>

          {music.url && (
            <div className="mt-4">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={music.url} controls className="w-full" />
            </div>
          )}

          {music.objectKey && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âm lượng: {Math.round(music.volume * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(music.volume * 100)}
                onChange={(e) => setMusic((m) => ({ ...m, volume: Number(e.target.value) / 100 }))}
                onMouseUp={(e) => updateSetting({ volume: Number((e.target as HTMLInputElement).value) / 100 })}
                onTouchEnd={(e) => updateSetting({ volume: Number((e.target as HTMLInputElement).value) / 100 })}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Upload new track */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-3">
            {music.objectKey ? 'Thay nhạc nền' : 'Tải lên nhạc nền'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
            disabled={busy}
          />
          {file && <p className="mt-2 text-sm text-gray-600">{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</p>}

          {busy && (
            <div className="mt-3">
              <div className="mb-1 text-sm text-gray-600">Đang tải lên... {progress}%</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || busy}
            className={`mt-4 w-full rounded-md py-3 font-semibold transition-colors ${
              file && !busy ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {busy ? 'Đang tải lên...' : 'Tải lên & đặt làm nhạc nền'}
          </button>
          <p className="mt-2 text-xs text-gray-400">MP3, OGG, WAV, M4A, AAC — tối đa 20MB.</p>
        </div>
      </div>
    </div>
  );
}
