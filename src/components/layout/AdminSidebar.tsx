'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Clapperboard, ExternalLink, Gamepad2, LogOut, Music2, Plus } from 'lucide-react';
import { signOut } from '@/lib/auth-client';

const menuItems = [
  { name: 'Truyện', path: '/admin', icon: BookOpen },
  { name: 'Video & Nhạc', path: '/admin/videos', icon: Clapperboard },
  { name: 'Game', path: '/admin/games', icon: Gamepad2 },
  { name: 'Nhạc nền', path: '/admin/music', icon: Music2 },
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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <Link href="/admin" className="block">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Engkids</p>
          <h1 className="mt-1 text-xl font-black tracking-tight">Admin</h1>
        </Link>
      </div>

      <div className="border-b border-slate-200 p-4">
        <Link
          href="/admin/new"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-violet-700"
        >
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
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Xem website
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={handleLogout}
          className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
