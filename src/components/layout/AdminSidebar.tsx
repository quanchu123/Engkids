'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { localAdminSignOut } from '@/services/auth';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    localAdminSignOut();
    router.push('/admin/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Thêm truyện mới', path: '/admin/new', icon: '✍️' },
    { name: 'Về trang chủ', path: '/', icon: '🏠' },
  ];

  return (
    <aside className="w-64 bg-slate-900 h-screen fixed left-0 top-0 overflow-y-auto text-slate-100 flex flex-col shadow-xl z-50">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛠️</span>
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-slate-400">ComicLingua Manager</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-red-900/20 hover:text-red-400"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 text-center">Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
