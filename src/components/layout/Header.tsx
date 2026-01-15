'use client';

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

// Navigation items - moved outside component to prevent re-creation
const NAV_ITEMS = [
  { name: 'Trang chủ', path: '/', icon: '🏠' },
  { name: 'Thư viện', path: '/stories', icon: '📖' },
  { name: 'Tiến độ', path: '/progress', icon: '📊' },
] as const;

function Header() {
  const pathname = usePathname();
  const { progress } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => pathname === path, [pathname]);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), []);

  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-1.5 group"
          aria-label="ComicLingua Kids - Trang chủ"
        >
          <span className="text-2xl transition-transform group-hover:scale-110" aria-hidden="true">📚</span>
          <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent hidden sm:inline">
            ComicLingua
          </span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full" role="navigation" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                isActive(item.path)
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/progress"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold hover:shadow-md transition-all"
            aria-label={`Bạn có ${progress.totalStars} sao`}
          >
            <span aria-hidden="true">⭐</span>
            <span>{progress.totalStars}</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            aria-label="Admin Dashboard"
          >
            <span aria-hidden="true">🛠️</span>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav 
          className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-2"
          role="navigation"
          aria-label="Menu mobile"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold"
            >
              <span>⭐</span>
              <span>{progress.totalStars} sao</span>
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600"
              aria-label="Admin Dashboard"
            >
              <span>🛠️</span>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export default memo(Header);
