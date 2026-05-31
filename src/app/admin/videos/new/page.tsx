'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoUploader from '@/components/video/VideoUploader';
import SubtitleEditor from '@/components/video/SubtitleEditor';

export default function NewVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'subtitles'>('upload');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleUploadComplete = (id: string) => {
    setVideoId(id);
    setStep('subtitles');
  };

  const handleSubtitlesSaved = () => {
    // Redirect to video list after 1 second
    setTimeout(() => {
      router.push('/admin/videos');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {step === 'upload' ? '1' : 'Done'}
            </div>
            <div className="ml-2 mr-8 text-sm font-medium text-gray-700">Upload Video</div>
          </div>

          <div className={`w-24 h-1 ${step === 'subtitles' ? 'bg-blue-600' : 'bg-gray-300'}`} />

          <div className="flex items-center ml-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === 'subtitles' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              2
            </div>
            <div className="ml-2 text-sm font-medium text-gray-700">Add Subtitles</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step Content */}
        {step === 'upload' && (
          <VideoUploader
            onUploadComplete={handleUploadComplete}
            onError={setError}
          />
        )}

        {step === 'subtitles' && videoId && (
          <div>
            <SubtitleEditor
              videoId={videoId}
              onSave={handleSubtitlesSaved}
            />
            <div className="max-w-6xl mx-auto mt-4 flex justify-between">
              <button
                onClick={() => router.push('/admin/videos')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip subtitles →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
