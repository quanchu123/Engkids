'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Video } from '@/types';
import VideoCard from './VideoCard';

interface CategorySectionProps {
  title: string;
  videos: Video[];
  color?: 'pink' | 'purple' | 'blue' | 'green' | 'orange' | 'yellow';
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const COLOR_CLASSES = {
  pink: 'from-pink-500 to-rose-500',
  purple: 'from-purple-500 to-indigo-500',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  yellow: 'from-yellow-500 to-orange-500',
};

export default function CategorySection({
  title,
  videos,
  color = 'purple',
  showViewAll = true,
  onViewAll,
}: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [videos]);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  if (videos.length === 0) return null;

  return (
    <section className="soft-panel relative mb-6 rounded-[24px] border border-slate-200/80 px-3 py-6 md:px-5">
      <div className="mb-4 flex items-center justify-between gap-3 px-4 md:px-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`h-8 w-2 flex-shrink-0 rounded-full bg-gradient-to-b ${COLOR_CLASSES[color]}`} aria-hidden="true" />
          <h2 className="truncate text-xl font-black text-slate-900 md:text-2xl">{title}</h2>
          <span className="kid-chip flex-shrink-0 px-2.5 py-1 text-sm font-bold text-slate-500">
            {videos.length} video
          </span>
        </div>

        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="hidden min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:flex"
          >
            <span>Xem tất cả</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="group relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md opacity-0 transition-opacity duration-200 hover:bg-slate-50 group-hover:opacity-100 md:flex"
            aria-label="Cuộn sang trái"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md opacity-0 transition-opacity duration-200 hover:bg-slate-50 group-hover:opacity-100 md:flex"
            aria-label="Cuộn sang phải"
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scroll-smooth md:px-0"
          style={{ scrollPaddingLeft: '16px' }}
        >
          {videos.map((video) => (
            <div key={video.id} className="flex-none snap-start">
              <VideoCard video={video} size="medium" showTopics showAge />
            </div>
          ))}

          {showViewAll && videos.length >= 5 && onViewAll && (
            <button
              onClick={onViewAll}
              className="toy-panel group flex-none aspect-video w-56 rounded-[20px] border border-dashed border-slate-300 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <span className="font-semibold text-slate-500 group-hover:text-violet-700">Xem thêm video</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
