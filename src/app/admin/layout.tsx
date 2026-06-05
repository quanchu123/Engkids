'use client';

import AdminSidebar from '@/components/layout/AdminSidebar';
import { AdminGuard } from '@/components/AdminGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Don't apply guard to login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="admin-theme flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
        <AdminSidebar />
        <main className="ml-64 flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
