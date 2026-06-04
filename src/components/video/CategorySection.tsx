'use client';

import { useRef, useState, useEffect } from 'react';
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
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  if (videos.length === 0) return null;

  return (
    <section className="soft-panel relative rounded-[1.75rem] px-3 py-6 md:px-4">
      <div className="mb-4 flex items-center justify-between px-4 md:px-0">
        <div className="flex items-center gap-3">
          <h2 className={`bg-gradient-to-r ${COLOR_CLASSES[color]} bg-clip-text text-xl font-bold text-transparent md:text-2xl`}>
            {title}
          </h2>
          <span className="kid-chip px-2 py-0.5 text-sm font-medium text-gray-500">
            {videos.length} video
          </span>
        </div>

        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className={`flex items-center gap-2 rounded-2xl bg-gradient-to-r ${COLOR_CLASSES[color]} px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg`}
          >
            <span>Xem tất cả</span>
            <span>→</span>
          </button>
        )}
      </div>

      <div className="group relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg opacity-0 transition-opacity duration-200 hover:scale-110 hover:bg-gray-50 group-hover:opacity-100 md:h-12 md:w-12"
          >
            <span className="text-sm font-black uppercase">Prev</span>
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 flex h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg opacity-0 transition-opacity duration-200 hover:scale-110 hover:bg-gray-50 group-hover:opacity-100 md:h-12 md:w-12"
          >
            <span className="text-sm font-black uppercase">Next</span>
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
              className="toy-panel group flex-none aspect-video w-56 rounded-2xl border-2 border-dashed border-gray-300 transition-all duration-200 hover:border-kid-purple hover:bg-kid-purple/5"
            >
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <span className="font-semibold text-gray-500 group-hover:text-kid-purple">Xem thêm video</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
