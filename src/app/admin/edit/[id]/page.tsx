'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { storyApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useStoryForm } from '@/hooks/useStoryForm';
import StoryForm from '@/components/admin/StoryForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface PageProps {
  params: { id: string };
}

export default function EditStoryPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const toast = useToast();
  const form = useStoryForm();

  const [isLoaded, setIsLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadStory = async () => {
      const { story } = await storyApi.get(id);
      if (!story) {
        setNotFound(true);
        setIsLoaded(true);
        return;
      }

      form.populateFromStory(story);
      setIsLoaded(true);
    };
    loadStory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    const validation = form.validate();
    if (!validation.valid) {
      toast.error(validation.error!);
      if (validation.tab) form.setActiveTab(validation.tab);
      return;
    }

    form.setIsSaving(true);

    try {
      const story = form.buildStory(id);
      await storyApi.update(id, story);
      toast.success('Cập nhật truyện thành công!');
      router.push('/admin');
    } catch (error) {
      console.error('Error saving story:', error);
      toast.error('Có lỗi xảy ra khi lưu truyện');
    } finally {
      form.setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner message="Đang tải..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không tìm thấy truyện</h1>
          <Link href="/admin" className="text-blue-500 hover:underline">
            Quay lại Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-slate-500 hover:text-slate-700">
            Quay lại
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-xl font-bold text-slate-800">
            Sửa truyện
          </h1>
        </div>
        <button
          onClick={handleSave}
          data-testid="save-story"
          disabled={form.isSaving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {form.isSaving ? 'Đang lưu...' : 'Lưu truyện'}
        </button>
      </div>

      <StoryForm form={form} showAIExtract />
    </div>
  );
}
