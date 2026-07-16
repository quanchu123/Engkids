'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Crown, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Story } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { filterStories, getStoryTopics } from '@/lib/content-selectors';
import { onContentChange } from '@/lib/content-sync';
import { StoryFallbackArtwork } from '@/components/common/FallbackArtwork';
import { DecorIcon } from '@/components/common/DecorIcon';
import { CURRICULUM_STAGES, getStageById, type CurriculumStageId } from '@/lib/curriculum';

type SortOption = 'recommended' | 'new' | 'shortest';

interface StoriesPageClientProps {
  stories: Story[];
}

export default function StoriesPageClient({ stories }: StoriesPageClientProps) {
  const [liveStories, setLiveStories] = useState(stories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [learnerStageId, setLearnerStageId] = useState<CurriculumStageId | null>(null);
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

  useEffect(() => {
    let active = true;
    fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const stageId = data?.learnerState?.currentStageId as CurriculumStageId | undefined;
        if (active && stageId) {
          setLearnerStageId(stageId);
          setSelectedLevel(stageId);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
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
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-500 p-5 shadow-lg">
          <DecorIcon name="story" className="absolute top-4 right-5 hidden h-14 w-14 rounded-2xl bg-white/15 text-white opacity-50 sm:flex" iconClassName="h-8 w-8" imageClassName="h-11 w-11 object-contain" />
          <DecorIcon name="sparkles" className="absolute bottom-4 left-4 hidden h-11 w-11 rounded-2xl bg-white/15 text-white opacity-45 sm:flex" iconClassName="h-6 w-6" imageClassName="h-9 w-9 object-contain" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
              <BookOpen size={14} aria-hidden="true" />
              Kho truyện tranh
            </div>
            <h1 className="mb-3 text-3xl font-black text-white drop-shadow-lg md:text-4xl">
              Truyện Tranh
            </h1>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                type="text"
                data-testid="stories-search"
                placeholder="Tìm truyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[46px] w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
          </div>
        </section>

        <section className="soft-panel mb-6 flex flex-wrap items-center gap-3 rounded-[20px] p-4">
          {learnerStageId && (
            <button
              type="button"
              onClick={() => setSelectedLevel(learnerStageId)}
              className={`min-h-[44px] rounded-xl px-4 text-sm font-black shadow-sm ${selectedLevel === learnerStageId ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 ring-1 ring-violet-100'}`}
            >
              Level của bé: {getStageById(learnerStageId).cefr}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedLevel('all')}
            className={`min-h-[44px] rounded-xl px-4 text-sm font-black shadow-sm ${selectedLevel === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-100'}`}
          >
            Xem tất cả
          </button>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm"
          >
            <option value="all">Mọi level</option>
            {CURRICULUM_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.cefr}</option>
            ))}
          </select>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm"
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
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm"
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
              <StoryGridCard
                key={story.id}
                story={story}
                completed={Boolean(storiesProgress[story.id]?.completed)}
              />
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

function StoryGridCard({ story, completed }: { story: Story; completed: boolean }) {
  const [imageError, setImageError] = useState(false);
  const isImageUrl = !imageError && (story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:'));
  const isPremium = Boolean(story.premium_only);
  return (
              <Link href={`/stories/${story.id}`} className="playful-card group overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {isImageUrl ? (
          <Image
            src={story.cover_image}
            alt={story.title_en}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <StoryFallbackArtwork story={story} />
        )}
        {isPremium && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-md">
            <Crown size={12} aria-hidden />
            Premium
          </div>
        )}
        {completed && (
          <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
            Đã xong
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-black leading-tight text-slate-900">{story.title_en}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{story.title_vi}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{story.level}</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{story.estimated_minutes} phút</span>
          {story.topics?.[0] && (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{story.topics[0]}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
