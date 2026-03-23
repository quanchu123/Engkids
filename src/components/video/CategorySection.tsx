'use client';

import { useRef, useState, useEffect } from 'react';
import { Video } from '@/types';
import VideoCard from './VideoCard';

interface CategorySectionProps {
  title: string;
  emoji: string;
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
  emoji,
  videos,
  color = 'purple',
  showViewAll = true,
  onViewAll,
}: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
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
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (videos.length === 0) return null;

  return (
    <section className="relative py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce-slow">{emoji}</span>
          <h2 className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${COLOR_CLASSES[color]} bg-clip-text text-transparent`}>
            {title}
          </h2>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-500 font-medium">
            {videos.length} video
          </span>
        </div>
        
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className={`
              px-4 py-2 rounded-xl font-semibold text-sm
              bg-gradient-to-r ${COLOR_CLASSES[color]} text-white
              hover:shadow-lg hover:scale-105 transition-all duration-200
              flex items-center gap-2
            `}
          >
            <span>Xem tất cả</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="
              absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12 rounded-full
              bg-white shadow-lg border-2 border-gray-100
              flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              hover:scale-110 hover:bg-gray-50
              -translate-x-1/2
            "
          >
            <span className="text-xl">◀️</span>
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="
              absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12 rounded-full
              bg-white shadow-lg border-2 border-gray-100
              flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              hover:scale-110 hover:bg-gray-50
              translate-x-1/2
            "
          >
            <span className="text-xl">▶️</span>
          </button>
        )}

        {/* Video Cards Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="
            flex gap-4 overflow-x-auto scrollbar-hide
            px-4 md:px-0 pb-4
            snap-x snap-mandatory
            scroll-smooth
          "
          style={{ scrollPaddingLeft: '16px' }}
        >
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="flex-none snap-start"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <VideoCard
                video={video}
                size="medium"
                showTopics={true}
                showAge={true}
              />
            </div>
          ))}
          
          {/* View More Card */}
          {showViewAll && videos.length >= 5 && onViewAll && (
            <button
              onClick={onViewAll}
              className="
                flex-none snap-start w-56 aspect-video
                rounded-2xl border-2 border-dashed border-gray-300
                flex flex-col items-center justify-center gap-2
                hover:border-kid-purple hover:bg-kid-purple/5
                transition-all duration-200 group
              "
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">🎬</span>
              <span className="font-semibold text-gray-500 group-hover:text-kid-purple">
                Xem thêm video
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
