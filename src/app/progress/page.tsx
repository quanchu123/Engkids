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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Tiến độ học tập</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            emoji="⭐" 
            value={progress.totalStars} 
            label="Tổng sao" 
            gradient="from-yellow-400 to-orange-400"
          />
          <StatCard 
            emoji="📖" 
            value={completedStories.length} 
            label="Truyện đã đọc" 
            gradient="from-green-400 to-emerald-500"
          />
          <StatCard 
            emoji="❤️" 
            value={progress.savedWords.length} 
            label="Từ đã lưu" 
            gradient="from-pink-400 to-rose-500"
          />
          <StatCard 
            emoji="🔥" 
            value={progress.currentStreak} 
            label="Ngày liên tiếp" 
            gradient="from-red-400 to-orange-500"
          />
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-kid mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Tiến độ đọc truyện</span>
            <span className="text-gray-500">{completedStories.length}/{totalStories}</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="progress-bar h-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">{completionPercent}% hoàn thành</p>
        </div>

        {/* Completed Stories */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            ✅ Truyện đã hoàn thành
          </h2>
          {completedStories.length > 0 ? (
            <div className="grid gap-3">
              {completedStories.map(storyProgress => {
                const story = stories.find(s => s.id === storyProgress.storyId);
                if (!story) return null;
                return (
                  <Link 
                    key={storyProgress.storyId}
                    href={`/stories/${storyProgress.storyId}`}
                    className="bg-white rounded-xl p-4 shadow-kid hover:shadow-kid-lg transition-all flex items-center gap-4"
                  >
                    <div className="text-3xl">{story.cover_image}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{story.title_en}</h3>
                      <p className="text-sm text-gray-500">{story.title_vi}</p>
                    </div>
                    <div className="text-yellow-500">
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
              <Link href="/stories" className="text-blue-500 hover:underline text-sm">
                Bắt đầu đọc ngay →
              </Link>
            </div>
          )}
        </section>

        {/* Saved Words */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            ❤️ Từ vựng đã lưu ({progress.savedWords.length})
          </h2>
          {progress.savedWords.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {progress.savedWords.map(savedWord => (
                <div 
                  key={savedWord.word}
                  className="bg-white rounded-xl p-4 shadow-kid flex items-center gap-4"
                >
                  <button
                    onClick={() => pronounceWord(savedWord.word)}
                    className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                  >
                    🔊
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{savedWord.word}</p>
                    <p className="text-sm text-gray-500">{savedWord.vi}</p>
                    {savedWord.ipa && (
                      <p className="text-xs text-gray-400">{savedWord.ipa}</p>
                    )}
                  </div>
                  <button
                    onClick={() => unsaveWord(savedWord.word)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Bỏ lưu"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">💭</div>
              <p className="text-gray-500">Chưa lưu từ nào</p>
              <p className="text-gray-400 text-sm">Bấm vào từ khi đọc truyện để lưu từ mới</p>
            </div>
          )}
        </section>

        {/* Recent Game Scores */}
        {progress.gameScores.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🎮 Lịch sử chơi game
            </h2>
            <div className="bg-white rounded-xl shadow-kid overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-gray-600 font-medium">Game</th>
                    <th className="text-left p-3 text-gray-600 font-medium">Truyện</th>
                    <th className="text-right p-3 text-gray-600 font-medium">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.gameScores.slice(-10).reverse().map((score, index) => {
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
    <div className="bg-white rounded-2xl p-4 shadow-kid text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
