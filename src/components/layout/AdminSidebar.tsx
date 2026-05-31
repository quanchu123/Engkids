'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/auth-client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Stories', path: '/admin/new' },
    { name: 'Videos', path: '/admin/videos' },
    { name: 'Games', path: '/admin/games' },
    { name: 'Trang chủ', path: '/' },
  ];

  return (
    <aside className="w-56 bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 h-screen fixed left-0 top-0 overflow-y-auto text-white flex flex-col shadow-2xl z-50">
      <div className="p-4 border-b border-purple-700/50">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="font-bold text-base">Admin Panel</h1>
            <p className="text-[10px] text-purple-300">Manager</p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1.5 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-105'
                : 'text-purple-200 hover:bg-purple-700/50 hover:text-white hover:scale-102'
            }`}
          >
            <span>{item.name}</span>
          </Link>
        ))}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-purple-200 hover:bg-red-900/30 hover:text-red-300 font-medium text-sm mt-4"
        >
          <span>Logout</span>
        </button>
      </nav>

      <div className="p-3 border-t border-purple-700/50">
        <div className="bg-purple-800/30 rounded-lg p-2">
          <p className="text-[10px] text-purple-300 text-center">v1.0 • Engkids</p>
        </div>
      </div>
    </aside>
  );
}
