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
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Quản trị nội dung</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Truyện tranh</h1>
          <p className="mt-1 text-sm text-admin-text-muted">Thêm, sửa, ẩn hoặc xóa truyện đang hiển thị trên website.</p>
        </div>
        <Link
          href="/admin/new"
          data-testid="admin-create-story"
          className="admin-btn admin-btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm truyện
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="admin-card p-4">
              <div className="admin-stat-icon mb-3">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-black text-admin-text">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="admin-card">
        <div className="flex flex-col gap-3 border-b border-admin-border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-admin-text">Danh sách truyện</h2>
            <p className="text-sm text-admin-text-muted">{filteredStories.length} kết quả</p>
          </div>
          <label className="relative block w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted" aria-hidden="true" />
            <input
              type="text"
              data-testid="admin-story-search"
              placeholder="Tìm theo tên hoặc chủ đề..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="admin-input pl-9"
            />
          </label>
        </div>

        {stories.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-admin-text-muted" aria-hidden="true" />
            <h3 className="mt-3 font-black text-admin-text">Chưa có truyện nào</h3>
            <p className="mt-1 text-sm text-admin-text-muted">Tạo truyện đầu tiên để hiển thị trên trang chủ và tab truyện.</p>
            <Link
              href="/admin/new"
              className="admin-btn admin-btn-primary mt-5"
            >
              Tạo truyện
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-admin-border">
            {filteredStories.map((story) => (
              <article key={story.id} className="grid gap-4 p-4 transition-colors hover:bg-admin-surface-muted lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-4">
                  <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                      <Image src={story.cover_image} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-admin-surface-muted text-xl font-black text-admin-primary">
                        {story.title_en.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`admin-badge ${
                        story.published ? 'admin-badge-success' : 'admin-badge-warning'
                      }`}>
                        {story.published ? 'Đang đăng' : 'Bản nháp'}
                      </span>
                      <span className="admin-badge admin-badge-neutral">{story.level}</span>
                      {story.topics.slice(0, 2).map((topic) => (
                        <span key={topic} className="admin-badge admin-badge-neutral">{topic}</span>
                      ))}
                    </div>
                    <h3 className="truncate font-black text-admin-text">{story.title_en}</h3>
                    <p className="truncate text-sm text-admin-text-muted">{story.title_vi}</p>
                    <p className="mt-2 text-xs font-bold text-admin-text-muted">
                      {story.panels.length} panels · {story.vocabulary.length} từ vựng
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {story.published && (
                    <Link
                      href={`/stories/${story.id}`}
                      className="admin-btn admin-btn-secondary"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Xem
                    </Link>
                  )}
                  <Link
                    href={`/admin/edit/${story.id}`}
                    className="admin-btn admin-btn-secondary"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Sửa
                  </Link>
                  <button
                    onClick={() => handleDeleteStory(story.id)}
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
