'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { Story } from '@/types';
import Header from '@/components/layout/Header';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 bg-white/50 mb-8" />
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-32 bg-white/30 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/30 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-white/30 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { progress, updateStreak } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Update streak on page load
    updateStreak();
    
    const loadStories = async () => {
      const loadedStories = await getAllStories();
      setStories(loadedStories);
      setIsLoaded(true);
    };
    loadStories();
  }, [updateStreak]);
  
  const completedStories = Object.values(progress.storiesProgress).filter(p => p.completed).length;
  const totalStories = stories.length;

  // Show loading skeleton
  if (!isLoaded) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section - Compact */}
      <section className="py-6 px-3">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Học Tiếng Anh
            </span>
            <span className="text-gray-800"> Qua Truyện Tranh! 🎨</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Đọc truyện vui, bấm từ mới để học, chơi game và nhận sao ⭐
          </p>
          
          <Link 
            href="/stories"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-base font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            🚀 Bắt đầu học ngay!
          </Link>
        </div>
      </section>

      {/* Quick Stats - Compact */}
      <section className="py-3 px-3">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-4 gap-2">
            <StatCard emoji="📖" value={totalStories} label="Truyện" color="blue" />
            <StatCard emoji="✅" value={completedStories} label="Đã đọc" color="green" />
            <StatCard emoji="⭐" value={progress.totalStars} label="Sao" color="yellow" />
            <StatCard emoji="🔥" value={progress.currentStreak} label="Streak" color="red" />
          </div>
        </div>
      </section>

      {/* Featured Stories - Compact */}
      <section className="py-4 px-3">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            ✨ Truyện nổi bật
          </h2>
          {stories.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {stories.slice(0, 4).map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
              <div className="text-center mt-4">
                <Link 
                  href="/stories"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700"
                >
                  Xem tất cả →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl shadow-sm">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="text-base font-bold text-gray-700 mb-1">Chưa có truyện nào</h3>
              <p className="text-gray-500 text-sm mb-3">Hãy vào Admin để thêm truyện mới!</p>
              <Link 
                href="/admin"
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
              >
                ➕ Thêm truyện
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works - Compact */}
      <section className="py-4 px-3 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
            🎯 Cách học
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StepCard 
              step={1}
              emoji="📖"
              title="Đọc truyện"
              description="Chọn truyện yêu thích"
            />
            <StepCard 
              step={2}
              emoji="👆"
              title="Bấm từ mới"
              description="Xem nghĩa & nghe"
            />
            <StepCard 
              step={3}
              emoji="🎮"
              title="Chơi game"
              description="Ôn từ vựng vui"
            />
          </div>
        </div>
      </section>

      {/* Footer - Compact */}
      <footer className="py-4 px-3 text-center text-gray-400 text-xs">
        <p>ComicLingua Kids © 2026 🌟</p>
      </footer>
    </div>
  );
}

// Stat Card Component - Compact
function StatCard({ 
  emoji, 
  value, 
  label, 
  color 
}: { 
  emoji: string; 
  value: number; 
  label: string; 
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'from-blue-400 to-blue-500',
    green: 'from-green-400 to-green-500',
    yellow: 'from-yellow-400 to-orange-400',
    red: 'from-red-400 to-pink-500',
  };

  return (
    <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm text-center">
      <div className="text-xl sm:text-2xl">{emoji}</div>
      <div className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 truncate">{label}</div>
    </div>
  );
}

// Story Card Component - Compact
function StoryCard({ story }: { story: Story }) {
  const levelColors = {
    Beginner: 'bg-green-100 text-green-700',
    Elementary: 'bg-blue-100 text-blue-700',
    Intermediate: 'bg-purple-100 text-purple-700',
  };

  const isImageUrl = story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:');

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center overflow-hidden">
          {isImageUrl ? (
            <img src={story.cover_image} alt={story.title_en} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{story.cover_image || '📖'}</span>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{story.title_en}</h3>
          <p className="text-xs text-gray-500 truncate mb-1.5">{story.title_vi}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${levelColors[story.level]}`}>
              {story.level}
            </span>
            <span className="text-[10px] text-gray-400">⏱{story.estimated_minutes}m</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Step Card Component - Compact
function StepCard({ 
  step, 
  emoji, 
  title, 
  description 
}: { 
  step: number; 
  emoji: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm text-center">
      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">
        {step}
      </div>
      <div className="text-2xl mb-1">{emoji}</div>
      <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{title}</h3>
      <p className="text-xs text-gray-500 leading-tight">{description}</p>
    </div>
  );
}
