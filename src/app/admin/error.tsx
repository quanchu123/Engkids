'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Admin Error:', error);
  }, [error]);

  return (
    <div
      className="admin-theme min-h-screen flex items-center justify-center"
      style={{ background: 'var(--admin-bg)' }}
    >
      <div className="text-center px-4">
        <h1 className="text-2xl font-bold text-admin-text mb-2">Admin Error</h1>
        <p className="text-admin-text-muted mb-6 max-w-md">
          An error occurred in the admin panel. Please try again.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={reset} className="admin-btn admin-btn-primary">
            Thử lại
          </button>
          <a href="/" className="admin-btn admin-btn-secondary">
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
