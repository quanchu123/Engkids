'use client';

import Link from 'next/link';
import { Story } from '@/types';
import { ROUTES } from '@/config/constants';
import { useAppStore } from '@/store/useAppStore';

interface ProgressionMapProps {
  stories: Story[];
}

const ZONES = [
  { id: 'daily-life', title: 'Daily Life', topics: ['Daily Life', 'Family', 'School'], minStars: 0, href: ROUTES.STORIES },
  { id: 'nature', title: 'Nature', topics: ['Animals', 'Nature', 'Food'], minStars: 3, href: ROUTES.STORIES },
  { id: 'adventure', title: 'Adventure', topics: ['Adventure', 'Science', 'History', 'Friendship'], minStars: 6, href: ROUTES.VIDEOS },
];

export default function ProgressionMap({ stories }: ProgressionMapProps) {
  const totalStars = useAppStore((state) => state.progress.totalStars);
  const completedStories = useAppStore(
    (state) => Object.values(state.progress.storiesProgress).filter((story) => story.completed).length,
  );

  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">World Map</p>
        <h2 className="text-xl font-black text-slate-900">Hành trình học tập</h2>
        <p className="mt-1 text-sm text-slate-600">Mở dần các khu bằng số sao và số truyện đã hoàn thành.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ZONES.map((zone) => {
          const relatedStories = stories.filter((story) =>
            story.topics.some((topic) => zone.topics.includes(topic)),
          );
          const unlocked = totalStars >= zone.minStars;

          return (
            <Link
              key={zone.id}
              href={unlocked ? zone.href : ROUTES.PROGRESS}
              className={`rounded-3xl border p-4 transition-transform ${
                unlocked
                  ? 'border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 hover:-translate-y-1'
                  : 'border-slate-200 bg-slate-50 opacity-75'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">{zone.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {unlocked ? 'Unlocked' : `${zone.minStars} sao`}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {relatedStories.length} nội dung liên quan, {completedStories} truyện đã hoàn thành.
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
