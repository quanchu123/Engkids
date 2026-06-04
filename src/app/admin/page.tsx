'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Story } from '@/types';
import { storyApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { broadcastContentChange } from '@/lib/content-sync';

export default function AdminPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadStories = async () => {
      try {
        const { stories: loadedStories } = await storyApi.listAll();
        setStories(loadedStories);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStories();
  }, []);

  const handleDeleteStory = async (storyId: string) => {
    if (confirm('Bạn có chắc muốn xóa truyện này?')) {
      await storyApi.delete(storyId);
      const { stories: updatedStories } = await storyApi.listAll();
      setStories(updatedStories);
      broadcastContentChange('stories');
      router.refresh();
    }
  };

  const filteredStories = stories.filter((story) =>
    story.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.title_vi.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner message="Đang tải..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan</h1>
        <Link
          href="/admin/new"
          data-testid="admin-create-story"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          + Thêm truyện mới
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Truyện</p>
          <p className="text-2xl font-bold text-slate-800">{stories.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Panels</p>
          <p className="text-2xl font-bold text-slate-800">
            {stories.reduce((sum, story) => sum + story.panels.length, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Từ vựng</p>
          <p className="text-2xl font-bold text-slate-800">
            {stories.reduce((sum, story) => sum + story.vocabulary.length, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Chủ đề</p>
          <p className="text-2xl font-bold text-slate-800">
            {new Set(stories.flatMap((story) => story.topics)).size}
          </p>
        </div>
      </div>

      {stories.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            data-testid="admin-story-search"
            placeholder="Tìm truyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {stories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600 font-medium mb-1">Chưa có truyện nào</p>
            <p className="text-slate-400 text-sm mb-4">Bắt đầu tạo truyện đầu tiên</p>
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Tạo truyện
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Truyện</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Panels</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStories.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                        {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                          <Image src={story.cover_image} alt="" fill className="object-cover" sizes="40px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {story.cover_image || story.title_en.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{story.title_en}</p>
                        <p className="text-xs text-slate-500 truncate">{story.title_vi}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      story.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                      story.level === 'Elementary' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {story.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      story.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {story.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                    {story.panels.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {story.published && (
                        <Link
                          href={`/stories/${story.id}`}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="Xem"
                        >
                          Xem
                        </Link>
                      )}
                      <Link
                        href={`/admin/edit/${story.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Sửa"
                      >
                        Sửa
                      </Link>
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Xóa"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
