'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
  
  const { progress } = useAppStore();

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
          <div className="animate-spin text-4xl mb-4">📚</div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📖 Thư viện truyện</h1>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-kid mb-8">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Tìm truyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-300 focus:outline-none text-lg"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-blue-300 focus:outline-none font-medium"
            >
              <option value="all">📊 Tất cả Level</option>
              <option value="Beginner">🌱 Beginner</option>
              <option value="Elementary">📗 Elementary</option>
              <option value="Intermediate">📘 Intermediate</option>
            </select>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-blue-300 focus:outline-none font-medium"
            >
              <option value="all">🏷️ Tất cả chủ đề</option>
              {allTopics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-blue-300 focus:outline-none font-medium"
            >
              <option value="recommended">⭐ Đề xuất</option>
              <option value="new">🆕 Mới nhất</option>
              <option value="shortest">⏱️ Ngắn nhất</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-500 mb-4">
          Tìm thấy <span className="font-bold text-gray-700">{filteredStories.length}</span> truyện
        </p>

        {/* Stories Grid */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story: Story) => (
              <StoryCard 
                key={story.id} 
                story={story}
                progress={progress.storiesProgress[story.id]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">�</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có truyện nào</h3>
            <p className="text-gray-500 mb-4">Hãy vào Admin để thêm truyện mới!</p>
            <Link 
              href="/admin" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Thêm truyện
            </Link>
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
      <div className="bg-white rounded-2xl overflow-hidden shadow-kid hover:shadow-kid-lg transition-all hover:scale-[1.02] cursor-pointer relative">
        {/* Completed badge */}
        {progress?.completed && (
          <div className="absolute top-3 right-3 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            ✅ Đã đọc
          </div>
        )}
        
        {/* Cover Image */}
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center overflow-hidden">
          {isImageUrl ? (
            <img 
              src={story.cover_image} 
              alt={story.title_en}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">{story.cover_image || '📖'}</span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 mb-1">{story.title_en}</h3>
          <p className="text-sm text-gray-500 mb-3">{story.title_vi}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColors[story.level]}`}>
                {story.level}
              </span>
              <span className="text-xs text-gray-400">⏱ {story.estimated_minutes} phút</span>
            </div>
            
            {/* Stars earned */}
            {progress && progress.starsEarned > 0 && (
              <div className="flex items-center gap-1 text-yellow-500">
                {'⭐'.repeat(progress.starsEarned)}
              </div>
            )}
          </div>
          
          {/* Topics */}
          <div className="flex flex-wrap gap-1 mt-3">
            {story.topics.map(topic => (
              <span key={topic} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
