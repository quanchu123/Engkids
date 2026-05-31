'use client';

import { useEffect } from 'react';

export default function MusicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Music Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <div className="text-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Lỗi tải nhạc</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Không thể tải danh sách nhạc. Vui lòng thử lại.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow"
          >
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
