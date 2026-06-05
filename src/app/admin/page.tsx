'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Edit3, Eye, Layers, Plus, Search, Trash2, Type } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ApiError, storyApi } from '@/services/api';
import { Story } from '@/types';
import { broadcastContentChange } from '@/lib/content-sync';

export default function AdminPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadStories = async () => {
      try {
        const { stories: loadedStories } = await storyApi.listAll();
        setStories(loadedStories);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStories();
  }, []);

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Bạn có chắc muốn xóa truyện này?')) return;

    const previousStories = stories;
    setStories((current) => current.filter((story) => story.id !== storyId));

    try {
      await storyApi.delete(storyId);
      broadcastContentChange('stories');
      router.refresh();
      const { stories: updatedStories } = await storyApi.listAll();
      setStories(updatedStories);
    } catch (error) {
      setStories(previousStories);
      alert(error instanceof ApiError ? error.message : 'Xóa truyện thất bại');
    }
  };

  const filteredStories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stories;
    return stories.filter((story) =>
      story.title_en.toLowerCase().includes(query) ||
      story.title_vi.toLowerCase().includes(query) ||
      story.topics.some((topic) => topic.toLowerCase().includes(query)),
    );
  }, [searchQuery, stories]);

  const stats = [
    { label: 'Truyện', value: stories.length, icon: BookOpen },
    { label: 'Panels', value: stories.reduce((sum, story) => sum + story.panels.length, 0), icon: Layers },
    { label: 'Từ vựng', value: stories.reduce((sum, story) => sum + story.vocabulary.length, 0), icon: Type },
    { label: 'Đang đăng', value: stories.filter((story) => story.published).length, icon: Eye },
  ];

  if (!isLoaded) {
    return <LoadingSpinner message="Đang tải dữ liệu..." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Quản trị nội dung</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Truyện tranh</h1>
          <p className="mt-1 text-sm text-slate-500">Thêm, sửa, ẩn hoặc xóa truyện đang hiển thị trên website.</p>
        </div>
        <Link
          href="/admin/new"
          data-testid="admin-create-story"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm truyện
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-slate-950">Danh sách truyện</h2>
            <p className="text-sm text-slate-500">{filteredStories.length} kết quả</p>
          </div>
          <label className="relative block w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              data-testid="admin-story-search"
              placeholder="Tìm theo tên hoặc chủ đề..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none transition-colors focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>

        {stories.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h3 className="mt-3 font-black text-slate-900">Chưa có truyện nào</h3>
            <p className="mt-1 text-sm text-slate-500">Tạo truyện đầu tiên để hiển thị trên trang chủ và tab truyện.</p>
            <Link
              href="/admin/new"
              className="mt-5 inline-flex min-h-[42px] items-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-700"
            >
              Tạo truyện
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStories.map((story) => (
              <article key={story.id} className="grid gap-4 p-4 transition-colors hover:bg-slate-50 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-4">
                  <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                      <Image src={story.cover_image} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-violet-50 text-xl font-black text-violet-500">
                        {story.title_en.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        story.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {story.published ? 'Đang đăng' : 'Bản nháp'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{story.level}</span>
                      {story.topics.slice(0, 2).map((topic) => (
                        <span key={topic} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{topic}</span>
                      ))}
                    </div>
                    <h3 className="truncate font-black text-slate-950">{story.title_en}</h3>
                    <p className="truncate text-sm text-slate-500">{story.title_vi}</p>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {story.panels.length} panels · {story.vocabulary.length} từ vựng
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {story.published && (
                    <Link
                      href={`/stories/${story.id}`}
                      className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Xem
                    </Link>
                  )}
                  <Link
                    href={`/admin/edit/${story.id}`}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Sửa
                  </Link>
                  <button
                    onClick={() => handleDeleteStory(story.id)}
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
