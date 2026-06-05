'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Clapperboard, ExternalLink, Gamepad2, LogOut, Music2, Plus } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import AdminIcon from '@/components/admin/AdminIcon';
import type { AdminIconKey } from '@/config/admin-icons';

const menuItems: { name: string; path: string; icon: typeof BookOpen; iconKey: AdminIconKey }[] = [
  { name: 'Truyện', path: '/admin', icon: BookOpen, iconKey: 'stories' },
  { name: 'Video & Nhạc', path: '/admin/videos', icon: Clapperboard, iconKey: 'videos' },
  { name: 'Game', path: '/admin/games', icon: Gamepad2, iconKey: 'games' },
  { name: 'Nhạc nền', path: '/admin/music', icon: Music2, iconKey: 'music' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/edit');
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-admin-border bg-admin-surface/80 text-admin-text shadow-admin-lg backdrop-blur-xl">
      <div className="border-b border-admin-border p-5">
        <Link href="/admin" className="block">
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black text-white shadow-admin-md"
            style={{ backgroundImage: 'var(--admin-gradient)' }}
          >
            E
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-admin-primary">Engkids</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-admin-text">Admin Panel</h1>
          <p className="mt-1 text-xs font-bold text-admin-text-muted">Quản lý nội dung</p>
        </Link>
      </div>

      <div className="border-b border-admin-border p-4">
        <Link href="/admin/new" className="admin-btn admin-btn-primary w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm truyện
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                active
                  ? 'text-white shadow-admin-md'
                  : 'text-admin-text-muted hover:bg-admin-surface-muted hover:text-admin-primary'
              }`}
              style={active ? { backgroundImage: 'var(--admin-gradient)' } : undefined}
            >
              <AdminIcon name={item.iconKey} fallback={Icon} className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-bold text-admin-text-muted transition-colors hover:bg-admin-surface-muted hover:text-admin-primary"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Xem website
        </Link>
      </nav>

      <div className="border-t border-admin-border p-3">
        <button
          onClick={handleLogout}
          className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-admin-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
