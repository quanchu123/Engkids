'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Story } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { filterStories, getStoryTopics } from '@/lib/content-selectors';
import { onContentChange } from '@/lib/content-sync';

type SortOption = 'recommended' | 'new' | 'shortest';

interface StoriesPageClientProps {
  stories: Story[];
}

export default function StoriesPageClient({ stories }: StoriesPageClientProps) {
  const [liveStories, setLiveStories] = useState(stories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const storiesProgress = useAppStore((state) => state.progress.storiesProgress);

  useEffect(() => {
    let cancelled = false;
    const loadStories = () => fetch(`/api/stories?_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stories?: Story[] } | null) => {
        if (!cancelled && Array.isArray(data?.stories)) {
          setLiveStories(data.stories);
        }
      })
      .catch(() => {});
    const handleFocus = () => {
      loadStories();
    };
    loadStories();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Refresh when an admin tab broadcasts a content change.
    const unsubscribe = onContentChange((kind) => {
      if (kind === 'stories' || kind === 'all') loadStories();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      unsubscribe();
    };
  }, []);

  const allTopics = useMemo(() => getStoryTopics(liveStories), [liveStories]);
  const filteredStories = useMemo(() => {
    const filtered = filterStories(liveStories, searchQuery, selectedLevel, selectedTopic);

    switch (sortBy) {
      case 'shortest':
        return [...filtered].sort((a, b) => a.estimated_minutes - b.estimated_minutes);
      case 'new':
        return [...filtered].reverse();
      default:
        return filtered;
    }
  }, [liveStories, searchQuery, selectedLevel, selectedTopic, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-white">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="relative mb-6 overflow-hidden">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-500 p-5 shadow-lg">
            <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🦄</div>
            <div className="absolute bottom-2 left-3 text-4xl opacity-25">📚</div>
            <div className="absolute top-4 left-1/4 text-3xl opacity-20">✨</div>
            <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">🌈</div>

            <div className="relative z-10 max-w-2xl">
              <h1 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
                📚 Truyện Tranh
              </h1>

              <div className="relative max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5" />
                  <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            <input
              type="text"
              data-testid="stories-search"
              placeholder="Tìm truyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl py-2 pl-9 pr-3 text-sm font-semibold text-gray-700 placeholder-gray-500 focus:outline-none"
            />
              </div>
            </div>
          </div>
        </section>

        <section className="soft-panel mb-6 flex flex-wrap gap-3 rounded-[1.75rem] p-4">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700 shadow"
          >
            <option value="all">Mọi level</option>
            <option value="Beginner">Beginner</option>
            <option value="Elementary">Elementary</option>
            <option value="Intermediate">Intermediate</option>
          </select>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700 shadow"
          >
            <option value="all">Chủ đề</option>
            {allTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700 shadow"
          >
            <option value="recommended">Đề xuất</option>
            <option value="new">Mới</option>
            <option value="shortest">Ngắn nhất</option>
          </select>
        </section>

        <p className="mb-4 text-sm font-semibold text-slate-500">
          Tìm thấy <span className="font-black text-slate-800">{filteredStories.length}</span> truyện
        </p>

        {filteredStories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredStories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`} className="playful-card overflow-hidden rounded-3xl bg-white shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative aspect-[4/3] bg-slate-100">
                  {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                    <Image src={story.cover_image} alt={story.title_en} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-black text-violet-400">
                      {story.cover_image || story.title_en.charAt(0)}
                    </div>
                  )}
                  {storiesProgress[story.id]?.completed && (
                    <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      Done
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-black text-slate-900">{story.title_en}</h3>
                  <p className="text-sm text-slate-500">{story.title_vi}</p>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-500">
                    <span>{story.level}</span>
                    <span>{story.estimated_minutes} phút</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="soft-panel rounded-3xl p-10 text-center shadow-lg">
            <h2 className="text-2xl font-black text-slate-900">Không tìm thấy truyện phù hợp</h2>
            <p className="mt-2 text-slate-600">Thử đổi bộ lọc hoặc tìm bằng từ khóa khác.</p>
          </div>
        )}
      </main>
    </div>
  );
}
