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
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'error':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'uploading':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    default:
      return 'bg-sky-50 text-sky-700 border-sky-100';
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
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Kho media</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Video & Nhạc</h1>
          <p className="mt-1 text-sm text-slate-500">Upload, sửa metadata, kiểm tra thumbnail và xóa nội dung khỏi website.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadVideos}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tải lại
          </button>
          <Link
            href={`/admin/videos/new?category=${category}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-violet-700"
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
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
                    className={`flex min-h-[40px] items-center gap-2 rounded-lg px-4 text-sm font-black transition-colors ${
                      category === tab.key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                    <span className="text-xs text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>

            <label className="relative block w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm video, nhạc, chủ đề..."
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none transition-colors focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => {
              const count = status === 'all' ? categoryVideos.length : categoryVideos.filter((video) => video.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`min-h-[36px] rounded-xl px-3 text-xs font-black transition-colors ${
                    filter === status
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
            <p className="mt-4 text-sm font-bold text-slate-500">Đang tải video...</p>
          </div>
        ) : categoryVideos.length === 0 ? (
          <div className="p-12 text-center">
            <VideoIcon className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h3 className="mt-3 font-black text-slate-900">
              {category === 'music' ? 'Chưa có video nhạc' : 'Chưa có video học'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">Upload file đầu tiên để hiển thị trên website.</p>
            <Link
              href={`/admin/videos/new?category=${category}`}
              className="mt-5 inline-flex min-h-[42px] items-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-700"
            >
              Upload video
            </Link>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-slate-500">Không có nội dung khớp bộ lọc.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredVideos.map((video) => (
              <article key={video.id} className="grid gap-4 p-4 transition-colors hover:bg-slate-50 xl:grid-cols-[1fr_auto] xl:items-center">
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
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusBadge(video.status)}`}>
                        {video.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{video.level}</span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                        {video.feature?.trim() || 'Tổng hợp'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{formatDate(video.createdAt)}</span>
                    </div>
                    <h3 className="truncate font-black text-slate-950">{video.title}</h3>
                    <p className="truncate text-sm text-slate-500">{video.titleVi}</p>
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
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Sửa
                  </Link>
                  {video.status === 'ready' && (
                    <Link
                      href={`/videos/${video.id}`}
                      className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
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
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 hover:bg-red-100"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
        warn ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
      }`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
