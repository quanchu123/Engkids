'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { Story } from '@/types';
import Header from '@/components/layout/Header';

export default function HomePage() {
  const { progress } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStories = async () => {
      const loadedStories = await getAllStories();
      setStories(loadedStories);
      setIsLoaded(true);
    };
    loadStories();
  }, []);
  
  const completedStories = Object.values(progress.storiesProgress).filter(p => p.completed).length;
  const totalStories = stories.length;

  return (
    <div className="min-h-screen">
      <Header />


      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Học Tiếng Anh
            </span>
            <br />
            <span className="text-gray-800">Qua Truyện Tranh! 🎨</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Đọc truyện vui, bấm từ mới để học, chơi game và nhận sao ⭐
          </p>
          
          <Link 
            href="/stories"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xl font-bold rounded-2xl shadow-kid-lg hover:shadow-kid-hover hover:scale-105 transition-all"
          >
            🚀 Bắt đầu học ngay!
          </Link>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard emoji="📖" value={totalStories} label="Truyện" color="blue" />
            <StatCard emoji="✅" value={completedStories} label="Đã đọc" color="green" />
            <StatCard emoji="⭐" value={progress.totalStars} label="Sao" color="yellow" />
            <StatCard emoji="🔥" value={progress.currentStreak} label="Ngày liên tiếp" color="red" />
          </div>
        </div>
      </section>

      {/* Featured Stories */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            ✨ Truyện nổi bật
          </h2>
          {stories.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.slice(0, 3).map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
              <div className="text-center mt-8">
                <Link 
                  href="/stories"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-kid hover:shadow-kid-lg transition-all font-semibold text-gray-700"
                >
                  Xem tất cả truyện →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-kid">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có truyện nào</h3>
              <p className="text-gray-500 mb-4">Hãy vào Admin để thêm truyện mới!</p>
              <Link 
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
              >
                ➕ Thêm truyện
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-4 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            🎯 Cách học
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard 
              step={1}
              emoji="📖"
              title="Đọc truyện"
              description="Chọn truyện yêu thích và đọc từng panel"
            />
            <StepCard 
              step={2}
              emoji="👆"
              title="Bấm từ mới"
              description="Bấm vào từ để xem nghĩa và nghe phát âm"
            />
            <StepCard 
              step={3}
              emoji="🎮"
              title="Chơi game"
              description="Ôn lại từ vựng qua flashcards và mini games"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-gray-500">
        <p>ComicLingua Kids © 2026 - Học tiếng Anh vui vẻ mỗi ngày! 🌟</p>
      </footer>
    </div>
  );
}

// Stat Card Component
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
    <div className="bg-white rounded-2xl p-4 shadow-kid text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

// Story Card Component
function StoryCard({ story }: { story: Story }) {
  const levelColors = {
    Beginner: 'bg-green-100 text-green-700',
    Elementary: 'bg-blue-100 text-blue-700',
    Intermediate: 'bg-purple-100 text-purple-700',
  };

  const isImageUrl = story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:');

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-kid hover:shadow-kid-lg transition-all hover:scale-[1.02] cursor-pointer">
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center overflow-hidden">
          {isImageUrl ? (
            <img src={story.cover_image} alt={story.title_en} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">{story.cover_image || '📖'}</span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 mb-1">{story.title_en}</h3>
          <p className="text-sm text-gray-500 mb-3">{story.title_vi}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColors[story.level]}`}>
              {story.level}
            </span>
            <span className="text-xs text-gray-400">⏱ {story.estimated_minutes} phút</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Step Card Component
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
    <div className="bg-white rounded-2xl p-6 shadow-kid text-center">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
