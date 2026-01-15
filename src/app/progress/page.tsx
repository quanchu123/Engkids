'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { pronounceWord } from '@/services/dictionary';
import { Story } from '@/types';
import Header from '@/components/layout/Header';

export default function ProgressPage() {
  const { progress, unsaveWord } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  
  useEffect(() => {
    const loadStories = async () => {
      const loadedStories = await getAllStories();
      setStories(loadedStories);
    };
    loadStories();
  }, []);
  
  const completedStories = Object.values(progress.storiesProgress).filter(p => p.completed);
  const totalStories = stories.length || 1;
  const completionPercent = Math.round((completedStories.length / totalStories) * 100);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-3 py-4">
        <h1 className="text-xl font-bold text-gray-800 mb-3">📊 Tiến độ học tập</h1>

        {/* Stats Overview - Compact */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard 
            emoji="⭐" 
            value={progress.totalStars} 
            label="Sao" 
            gradient="from-yellow-400 to-orange-400"
          />
          <StatCard 
            emoji="📖" 
            value={completedStories.length} 
            label="Đã đọc" 
            gradient="from-green-400 to-emerald-500"
          />
          <StatCard 
            emoji="❤️" 
            value={progress.savedWords.length} 
            label="Từ lưu" 
            gradient="from-pink-400 to-rose-500"
          />
          <StatCard 
            emoji="🔥" 
            value={progress.currentStreak} 
            label="Streak" 
            gradient="from-red-400 to-orange-500"
          />
        </div>

        {/* Progress Bar - Compact */}
        <div className="bg-white rounded-xl p-3 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="font-medium text-gray-700">Tiến độ</span>
            <span className="text-gray-500 text-xs">{completedStories.length}/{totalStories}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="progress-bar h-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{completionPercent}% hoàn thành</p>
        </div>

        {/* Completed Stories - Compact */}
        <section className="mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-1">
            ✅ Đã hoàn thành
          </h2>
          {completedStories.length > 0 ? (
            <div className="grid gap-2">
              {completedStories.map(storyProgress => {
                const story = stories.find(s => s.id === storyProgress.storyId);
                if (!story) return null;
                return (
                  <Link 
                    key={storyProgress.storyId}
                    href={`/stories/${storyProgress.storyId}`}
                    className="bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                  >
                    <div className="text-2xl">{story.cover_image}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 text-sm truncate">{story.title_en}</h3>
                      <p className="text-xs text-gray-500 truncate">{story.title_vi}</p>
                    </div>
                    <div className="text-yellow-500 text-sm">
                      {'⭐'.repeat(storyProgress.starsEarned)}
                      {'☆'.repeat(3 - storyProgress.starsEarned)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-gray-500">Chưa đọc xong truyện nào</p>
              <Link href="/stories" className="text-blue-500 hover:underline text-xs">
                Bắt đầu đọc ngay →
              </Link>
            </div>
          )}
        </section>

        {/* Saved Words - Compact */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-1">
            ❤️ Từ đã lưu ({progress.savedWords.length})
          </h2>
          {progress.savedWords.length > 0 ? (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {progress.savedWords.map(savedWord => (
                <div 
                  key={savedWord.word}
                  className="bg-white rounded-lg p-2 shadow-sm flex items-center gap-2"
                >
                  <button
                    onClick={() => pronounceWord(savedWord.word)}
                    className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors text-sm flex-shrink-0"
                  >
                    🔊
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{savedWord.word}</p>
                    <p className="text-xs text-gray-500 truncate">{savedWord.vi}</p>
                  </div>
                  <button
                    onClick={() => unsaveWord(savedWord.word)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs flex-shrink-0"
                    title="Bỏ lưu"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">💭</div>
              <p className="text-gray-500 text-sm">Chưa lưu từ nào</p>
              <p className="text-gray-400 text-xs">Bấm vào từ khi đọc truyện để lưu</p>
            </div>
          )}
        </section>

        {/* Recent Game Scores - Compact */}
        {progress.gameScores.length > 0 && (
          <section className="mt-4">
            <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-1">
              🎮 Lịch sử game
            </h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 text-gray-600 font-medium text-xs">Game</th>
                    <th className="text-left p-2 text-gray-600 font-medium text-xs">Truyện</th>
                    <th className="text-right p-2 text-gray-600 font-medium text-xs">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.gameScores.slice(-5).reverse().map((score, index) => {
                    const story = stories.find(s => s.id === score.storyId);
                    return (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="p-3">
                          {score.gameType === 'match' ? '🎯 Match' : '✏️ Fill Blank'}
                        </td>
                        <td className="p-3 text-gray-600">
                          {story?.title_en || score.storyId}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${
                            score.score === score.totalQuestions 
                              ? 'text-green-600' 
                              : 'text-gray-700'
                          }`}>
                            {score.score}/{score.totalQuestions}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ 
  emoji, 
  value, 
  label, 
  gradient 
}: { 
  emoji: string; 
  value: number; 
  label: string; 
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm text-center">
      <div className="text-xl sm:text-2xl">{emoji}</div>
      <div className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 truncate">{label}</div>
    </div>
  );
}
