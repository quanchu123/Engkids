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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-slate-950/88 text-white shadow-2xl backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <Link href="/admin" className="block">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">Engkids</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white">Admin Panel</h1>
          <p className="mt-1 text-xs font-bold text-violet-200/70">Quản lý nội dung</p>
        </Link>
      </div>

      <div className="border-b border-white/10 p-4">
        <Link
          href="/admin/new"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 text-sm font-black text-white shadow-lg shadow-pink-950/30 transition-transform hover:-translate-y-0.5"
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
                  ? 'bg-white/14 text-white shadow-inner ring-1 ring-white/12'
                  : 'text-violet-100/75 hover:bg-white/9 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-bold text-violet-100/75 transition-colors hover:bg-white/9 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Xem website
        </Link>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-violet-100/70 transition-colors hover:bg-red-500/15 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
