'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubtitleEditor from '@/components/video/SubtitleEditor';
import VideoUploader from '@/components/video/VideoUploader';

function NewVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') === 'music' ? 'music' : 'video';
  const [step, setStep] = useState<'upload' | 'subtitles'>('upload');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleUploadComplete = (id: string) => {
    setVideoId(id);
    setStep('subtitles');
  };

  const handleSubtitlesSaved = () => {
    setTimeout(() => router.push('/admin/videos'), 1000);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Upload media</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">
          {initialCategory === 'music' ? 'Thêm video nhạc' : 'Thêm video học'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Chọn file, kiểm tra thumbnail/thời lượng, rồi thêm phụ đề nếu cần.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <StepPill active={step === 'upload'} done={step === 'subtitles'} index="1" label="Upload video" />
          <StepPill active={step === 'subtitles'} index="2" label="Phụ đề / transcript" />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <VideoUploader
          initialCategory={initialCategory}
          onUploadComplete={handleUploadComplete}
          onError={setError}
        />
      )}

      {step === 'subtitles' && videoId && (
        <div className="space-y-4">
          <SubtitleEditor videoId={videoId} onSave={handleSubtitlesSaved} />
          <div className="flex justify-end">
            <button
              onClick={() => router.push('/admin/videos')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Bỏ qua phụ đề
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepPill({
  active,
  done = false,
  index,
  label,
}: {
  active: boolean;
  done?: boolean;
  index: string;
  label: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
      active || done ? 'bg-violet-50 text-violet-700' : 'bg-slate-50 text-slate-500'
    }`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
        active || done ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'
      }`}>
        {done ? '✓' : index}
      </span>
      <span className="text-sm font-black">{label}</span>
    </div>
  );
}

export default function NewVideoPage() {
  return (
    <Suspense fallback={null}>
      <NewVideoContent />
    </Suspense>
  );
}
