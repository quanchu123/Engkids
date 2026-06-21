'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, ChevronLeft, ChevronRight, Clapperboard, ExternalLink, Gamepad2, LogOut, Music2, Plus } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import AdminIcon from '@/components/admin/AdminIcon';
import type { AdminIconKey } from '@/config/admin-icons';

const menuItems: { name: string; path: string; icon: typeof BookOpen; iconKey: AdminIconKey }[] = [
  { name: 'Truyện', path: '/admin', icon: BookOpen, iconKey: 'stories' },
  { name: 'Video & Nhạc', path: '/admin/videos', icon: Clapperboard, iconKey: 'videos' },
  { name: 'Game', path: '/admin/games', icon: Gamepad2, iconKey: 'games' },
  { name: 'Standards', path: '/admin/standards', icon: BarChart3, iconKey: 'standards' },
  { name: 'Nhạc nền', path: '/admin/music', icon: Music2, iconKey: 'music' },
];

type AdminSidebarProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export default function AdminSidebar({ collapsed = false, onCollapsedChange }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/edit');
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut('/login');
  };

  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-admin-border bg-admin-surface/80 text-admin-text shadow-admin-lg backdrop-blur-xl transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className={`border-b border-admin-border ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className={`flex gap-3 ${collapsed ? 'flex-col items-center' : 'items-start justify-between'}`}>
          <Link href="/admin" className={collapsed ? 'flex justify-center' : 'block min-w-0'} aria-label="Admin Panel">
            <div
              className={`${collapsed ? 'mb-0 h-10 w-10 rounded-xl' : 'mb-3 h-11 w-11 rounded-2xl'} flex items-center justify-center text-lg font-black text-white shadow-admin-md`}
              style={{ backgroundImage: 'var(--admin-gradient)' }}
            >
              E
            </div>
            {!collapsed && (
              <>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-admin-primary">Engkids</p>
                <h1 className="mt-1 text-xl font-black tracking-tight text-admin-text">Admin Panel</h1>
                <p className="mt-1 text-xs font-bold text-admin-text-muted">Quản lý nội dung</p>
              </>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text-muted transition-colors hover:bg-admin-surface-muted hover:text-admin-primary"
            aria-label={collapsed ? 'Mở sidebar' : 'Đóng sidebar'}
            title={collapsed ? 'Mở sidebar' : 'Đóng sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className={`border-b border-admin-border ${collapsed ? 'p-3' : 'p-4'}`}>
        <Link href="/admin/new" className={`admin-btn admin-btn-primary w-full ${collapsed ? 'justify-center px-0' : ''}`} aria-label="Thêm truyện" title="Thêm truyện">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {!collapsed && <span>Thêm truyện</span>}
        </Link>
      </div>

      <nav className={`flex-1 space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex min-h-[42px] items-center rounded-xl text-sm font-bold transition-colors ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${
                active
                  ? 'text-white shadow-admin-md'
                  : 'text-admin-text-muted hover:bg-admin-surface-muted hover:text-admin-primary'
              }`}
              style={active ? { backgroundImage: 'var(--admin-gradient)' } : undefined}
              aria-label={collapsed ? item.name : undefined}
              title={collapsed ? item.name : undefined}
            >
              <AdminIcon name={item.iconKey} fallback={Icon} className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        <Link
          href="/"
          className={`flex min-h-[42px] items-center rounded-xl text-sm font-bold text-admin-text-muted transition-colors hover:bg-admin-surface-muted hover:text-admin-primary ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
          aria-label={collapsed ? 'Xem website' : undefined}
          title={collapsed ? 'Xem website' : undefined}
        >
          <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Xem website</span>}
        </Link>
      </nav>

      <div className="border-t border-admin-border p-3">
        <button
          onClick={handleLogout}
          className={`flex min-h-[42px] w-full items-center rounded-xl text-sm font-bold text-admin-text-muted transition-colors hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
          aria-label={collapsed ? 'Đăng xuất' : undefined}
          title={collapsed ? 'Đăng xuất' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
