'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, Edit3, Eye, LucideIcon, Music2, Plus, RefreshCw, Search, Trash2, Video as VideoIcon } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { broadcastContentChange } from '@/lib/content-sync';
import { ApiError, videoApi } from '@/services/api';
import { Video } from '@/types';

type StatusFilter = 'all' | 'ready' | 'processing' | 'uploading' | 'error';

const STATUS_FILTERS: StatusFilter[] = ['all', 'ready', 'processing', 'uploading', 'error'];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function statusBadge(status: Video['status']) {
  switch (status) {
    case 'ready':
      return 'admin-badge admin-badge-success';
    case 'error':
      return 'admin-badge admin-badge-danger';
    case 'uploading':
      return 'admin-badge admin-badge-warning';
    default:
      return 'admin-badge admin-badge-info';
  }
}

export default function AdminVideosPage() {
  const router = useRouter();
  const toast = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<'video' | 'music'>('video');
  const [searchQuery, setSearchQuery] = useState('');

  const loadVideos = async () => {
    try {
      const data = await videoApi.listAll();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
      toast.error('Không tải được danh sách video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasProcessing = videos.some((video) => video.status === 'processing' || video.status === 'uploading');
    if (!hasProcessing) return;
    const interval = setInterval(loadVideos, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  const handleDelete = async (videoId: string) => {
    if (!confirm('Bạn có chắc muốn xóa video này?')) return;

    const previousVideos = videos;
    setVideos((current) => current.filter((video) => video.id !== videoId));

    try {
      await videoApi.delete(videoId);
      broadcastContentChange('videos');
      router.refresh();
      await loadVideos();
      toast.success('Đã xóa video.');
    } catch (error) {
      console.error('Delete error:', error);
      setVideos(previousVideos);
      toast.error(error instanceof ApiError ? error.message : 'Xóa video thất bại');
    }
  };

  const handleSyncStatus = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/status`);
      const data = await res.json();
      if (data.status) {
        setVideos((prev) => prev.map((video) => video.id === videoId ? { ...video, status: data.status } : video));
        if (data.status === 'ready') toast.success('Video đã sẵn sàng.');
      }
    } catch {
      toast.error('Không đồng bộ được trạng thái');
    }
  };

  const handleForceReady = async (videoId: string) => {
    try {
      await videoApi.update(videoId, { status: 'ready' });
      setVideos((prev) => prev.map((video) => video.id === videoId ? { ...video, status: 'ready' } : video));
      broadcastContentChange('videos');
      router.refresh();
      toast.success('Đã chuyển sang ready.');
    } catch {
      toast.error('Không cập nhật được trạng thái');
    }
  };

  const categoryVideos = useMemo(
    () => videos.filter((video) => (video.category || 'video') === category),
    [category, videos],
  );

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categoryVideos.filter((video) => {
      if (filter !== 'all' && video.status !== filter) return false;
      if (!query) return true;
      return (
        video.title.toLowerCase().includes(query) ||
        video.titleVi.toLowerCase().includes(query) ||
        (video.feature || '').toLowerCase().includes(query)
      );
    });
  }, [categoryVideos, filter, searchQuery]);

  const readyCount = categoryVideos.filter((video) => video.status === 'ready').length;
  const missingDurationCount = categoryVideos.filter((video) => !video.duration || video.duration <= 0).length;
  const missingThumbnailCount = categoryVideos.filter((video) => !video.thumbnailUrl).length;

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Kho media</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Video & Nhạc</h1>
          <p className="mt-1 text-sm text-admin-text-muted">Upload, sửa metadata, kiểm tra thumbnail và xóa nội dung khỏi website.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadVideos}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tải lại
          </button>
          <Link
            href={`/admin/videos/new?category=${category}`}
            className="admin-btn admin-btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Upload
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Tất cả" value={categoryVideos.length} icon={category === 'music' ? Music2 : VideoIcon} />
        <StatCard label="Đang hiện" value={readyCount} icon={CheckCircle2} />
        <StatCard label="Thiếu duration" value={missingDurationCount} icon={Clock} warn={missingDurationCount > 0} />
        <StatCard label="Thiếu thumbnail" value={missingThumbnailCount} icon={AlertTriangle} warn={missingThumbnailCount > 0} />
      </section>

      <section className="admin-card">
        <div className="space-y-4 border-b border-admin-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl bg-admin-surface-muted p-1">
              {([
                { key: 'video', label: 'Video học', icon: VideoIcon },
                { key: 'music', label: 'Nhạc', icon: Music2 },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const count = videos.filter((video) => (video.category || 'video') === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCategory(tab.key)}
                    className={`admin-tab ${category === tab.key ? 'admin-tab-active' : ''}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                    <span className="text-xs text-admin-text-muted">{count}</span>
                  </button>
                );
              })}
            </div>

            <label className="relative block w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm video, nhạc, chủ đề..."
                className="admin-input pl-9"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => {
              const count = status === 'all' ? categoryVideos.length : categoryVideos.filter((video) => video.status === status).length;
              const isActive = filter === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={isActive ? { background: 'var(--admin-primary)' } : undefined}
                  className={`min-h-[36px] rounded-xl px-3 text-xs font-black transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'border border-admin-border bg-admin-surface text-admin-text-muted hover:bg-admin-surface-muted'
                  }`}
                >
                  {status === 'all' ? 'Tất cả' : status} · {count}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-admin-text-muted">Đang tải video...</p>
          </div>
        ) : categoryVideos.length === 0 ? (
          <div className="p-12 text-center">
            <VideoIcon className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h3 className="mt-3 font-black text-admin-text">
              {category === 'music' ? 'Chưa có video nhạc' : 'Chưa có video học'}
            </h3>
            <p className="mt-1 text-sm text-admin-text-muted">Upload file đầu tiên để hiển thị trên website.</p>
            <Link
              href={`/admin/videos/new?category=${category}`}
              className="admin-btn admin-btn-primary mt-5"
            >
              Upload video
            </Link>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-admin-text-muted">Không có nội dung khớp bộ lọc.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredVideos.map((video) => (
              <article key={video.id} className="grid gap-4 p-4 transition-colors hover:bg-admin-surface-muted xl:grid-cols-[1fr_auto] xl:items-center">
                <div className="flex min-w-0 gap-4">
                  <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-sky-100">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-violet-500">
                        {category === 'music' ? 'MUSIC' : 'VIDEO'}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-1 text-xs font-black text-white">
                      {video.duration > 0 ? formatDuration(video.duration) : '--:--'}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={statusBadge(video.status)}>
                        {video.status}
                      </span>
                      <span className="admin-badge admin-badge-neutral">{video.level}</span>
                      <span className="admin-badge admin-badge-neutral">
                        {video.feature?.trim() || 'Tổng hợp'}
                      </span>
                      <span className="text-xs font-bold text-admin-text-muted">{formatDate(video.createdAt)}</span>
                    </div>
                    <h3 className="truncate font-black text-admin-text">{video.title}</h3>
                    <p className="truncate text-sm text-admin-text-muted">{video.titleVi}</p>
                    {(!video.duration || video.duration <= 0 || !video.thumbnailUrl) && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        {[
                          !video.duration || video.duration <= 0 ? 'thiếu thời lượng' : '',
                          !video.thumbnailUrl ? 'thiếu thumbnail' : '',
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Link
                    href={`/admin/videos/${video.id}`}
                    className="admin-btn admin-btn-secondary"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Sửa
                  </Link>
                  {video.status === 'ready' && (
                    <Link
                      href={`/videos/${video.id}`}
                      className="admin-btn admin-btn-secondary"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Xem
                    </Link>
                  )}
                  {video.status !== 'ready' && (
                    <>
                      <button
                        onClick={() => handleSyncStatus(video.id)}
                        className="inline-flex min-h-[38px] items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => handleForceReady(video.id)}
                        className="inline-flex min-h-[38px] items-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100"
                      >
                        Ready
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="admin-btn admin-btn-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  warn = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  warn?: boolean;
}) {
  return (
    <div className="admin-card p-4">
      <div className={`mb-3 ${
        warn ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700' : 'admin-stat-icon'
      }`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-admin-text">{value}</p>
    </div>
  );
}
