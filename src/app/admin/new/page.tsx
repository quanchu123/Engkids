'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addStory } from '@/data/stories';
import { useToast } from '@/hooks/useToast';
import { useStoryForm } from '@/hooks/useStoryForm';
import StoryForm from '@/components/admin/StoryForm';

export default function NewStoryPage() {
  const router = useRouter();
  const toast = useToast();
  const form = useStoryForm();

  const handleSave = async () => {
    const validation = form.validate();
    if (!validation.valid) {
      toast.error(validation.error!);
      if (validation.tab) form.setActiveTab(validation.tab);
      return;
    }

    form.setIsSaving(true);

    try {
      const storyId = form.titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + form.generateId();

      const story = form.buildStory(storyId);
      await addStory(story);
      toast.success('Tạo truyện thành công!');
      router.push('/admin');
    } catch (error) {
      console.error('Error saving story:', error);
      toast.error('Có lỗi xảy ra khi lưu truyện: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      form.setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-slate-500 hover:text-slate-700">
            ← Quay lại
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-xl font-bold text-slate-800">
            ➕ Tạo truyện mới
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={form.isSaving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {form.isSaving ? '⏳ Đang lưu...' : '💾 Lưu truyện'}
        </button>
      </div>

      <StoryForm form={form} />
    </div>
  );
}
