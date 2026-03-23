'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllStories, getAllTopics, searchStories } from '@/data/stories';
import { Story } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import Header from '@/components/layout/Header';

type SortOption = 'recommended' | 'new' | 'shortest';

export default function StoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [stories, setStories] = useState<Story[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const storiesProgress = useAppStore(state => state.progress.storiesProgress);

  // Load stories from Supabase on mount
  useEffect(() => {
    const loadStories = async () => {
      const loadedStories = await getAllStories();
      setStories(loadedStories);
      setAllTopics(getAllTopics());
      setIsLoaded(true);
    };
    loadStories();
  }, []);

  const filteredStories = useMemo(() => {
    let result = searchQuery ? searchStories(searchQuery) : stories;
    
    // Filter by level
    if (selectedLevel !== 'all') {
      result = result.filter(s => s.level === selectedLevel);
    }
    
    // Filter by topic
    if (selectedTopic !== 'all') {
      result = result.filter(s => 
        s.topics.some(t => t.toLowerCase() === selectedTopic.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'shortest':
        result = [...result].sort((a, b) => a.estimated_minutes - b.estimated_minutes);
        break;
      case 'new':
        result = [...result].reverse();
        break;
      default:
        // Keep original order for 'recommended'
        break;
    }
    
    return result;
  }, [searchQuery, selectedLevel, selectedTopic, sortBy, stories]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">🦄</div>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-3 py-4">
        <h1 className="text-xl font-bold text-gray-800 mb-3">🦄 Thư viện truyện</h1>

        {/* Search & Filters - Compact */}
        <div className="bg-white rounded-xl p-3 shadow-sm mb-4">
          {/* Search */}
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">�</span>
            <input
              type="text"
              placeholder="Tìm truyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-sm"
            />
          </div>

          {/* Filters - Inline */}
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-xs font-medium flex-1 min-w-[100px]"
            >
              <option value="all">� Level</option>
              <option value="Beginner">🌱 Beginner</option>
              <option value="Elementary">📗 Elementary</option>
              <option value="Intermediate">📘 Intermediate</option>
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-xs font-medium flex-1 min-w-[100px]"
            >
              <option value="all">🏷️ Chủ đề</option>
              {allTopics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:outline-none text-xs font-medium flex-1 min-w-[100px]"
            >
              <option value="recommended">🌟 Đề xuất</option>
              <option value="new">🐣 Mới</option>
              <option value="shortest">⏱️ Ngắn</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-500 text-xs mb-3">
          Tìm thấy <span className="font-bold text-gray-700">{filteredStories.length}</span> truyện
        </p>

        {/* Stories Grid - Compact */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredStories.map((story: Story) => (
              <StoryCard 
                key={story.id} 
                story={story}
                progress={storiesProgress[story.id]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <h3 className="text-base font-bold text-gray-700 mb-1">Chưa có truyện nào</h3>
            <p className="text-gray-500 text-sm mb-3">Hãy quay lại sau để xem truyện mới nhé!</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Story Card Component
function StoryCard({ 
  story, 
  progress 
}: { 
  story: Story;
  progress?: { completed: boolean; starsEarned: number };
}) {
  const levelColors = {
    Beginner: 'bg-green-100 text-green-700',
    Elementary: 'bg-blue-100 text-blue-700',
    Intermediate: 'bg-purple-100 text-purple-700',
  };

  const isImageUrl = story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:');

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer relative">
        {/* Completed badge */}
        {progress?.completed && (
          <div className="absolute top-2 right-2 z-10 bg-green-500 text-white p-1 rounded-full text-[10px]">
            🎀
          </div>
        )}
        
        {/* Cover Image */}
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center overflow-hidden relative">
          {isImageUrl ? (
            <Image
              src={story.cover_image}
              alt={story.title_en}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <span className="text-4xl">{story.cover_image || '🦄'}</span>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{story.title_en}</h3>
          <p className="text-xs text-gray-500 truncate mb-1.5">{story.title_vi}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${levelColors[story.level]}`}>
                {story.level}
              </span>
              <span className="text-[10px] text-gray-400">⏱{story.estimated_minutes}m</span>
            </div>
            
            {/* Stars earned */}
            {progress && progress.starsEarned > 0 && (
              <div className="text-yellow-500 text-xs">
                {'🌟'.repeat(progress.starsEarned)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
