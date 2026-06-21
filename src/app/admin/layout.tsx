'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { AdminGuard } from '@/components/AdminGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Don't apply guard to login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="admin-theme flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
        <AdminSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        <main className={`${sidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 p-6 transition-[margin] duration-200`}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
