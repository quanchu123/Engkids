'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

export default function Header() {
  const pathname = usePathname();
  const { progress } = useAppStore();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl transition-transform group-hover:scale-110">📚</span>
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            ComicLingua Kids
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-full">
          {[
            { name: 'Trang chủ', path: '/', icon: '🏠' },
            { name: 'Thư viện', path: '/stories', icon: '📖' },
            { name: 'Tiến độ', path: '/progress', icon: '📊' },
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${
                isActive(item.path)
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/progress"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold hover:shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <span>⭐</span>
            <span>{progress.totalStars}</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Admin Dashboard"
          >
            <span>🛠️</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
