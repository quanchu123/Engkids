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
      <div className="admin-theme flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_34%),linear-gradient(135deg,#160f38_0%,#2e1065_42%,#0f172a_100%)]">
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
