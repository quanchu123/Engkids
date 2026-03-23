'use client';

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

// Navigation items
const NAV_ITEMS = [
  { name: 'Trang chủ', path: '/', icon: '🏠', active: 'bg-sky-100 text-sky-600 shadow-md shadow-sky-200/60', mobileActive: 'bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md' },
  { name: 'Thư viện', path: '/stories', icon: '🦄', active: 'bg-fuchsia-100 text-fuchsia-600 shadow-md shadow-fuchsia-200/60', mobileActive: 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-md' },
  { name: 'Videos', path: '/videos', icon: '🎬', active: 'bg-orange-100 text-orange-600 shadow-md shadow-orange-200/60', mobileActive: 'bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-md' },
  { name: 'Music', path: '/music', icon: '🎵', active: 'bg-rose-100 text-rose-600 shadow-md shadow-rose-200/60', mobileActive: 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md' },
  { name: 'Games', path: '/games', icon: '🎮', active: 'bg-green-100 text-green-600 shadow-md shadow-green-200/60', mobileActive: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md' },
  { name: 'Tiến độ', path: '/progress', icon: '🐾', active: 'bg-amber-100 text-amber-600 shadow-md shadow-amber-200/60', mobileActive: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white shadow-md' },
];

function Header() {
  const pathname = usePathname();
  const totalStars = useAppStore(state => state.progress.totalStars);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  }, [pathname]);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), []);

  return (
    <header className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 shadow-xl sticky top-0 z-50"
      style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)' }}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 group"
          aria-label="Engkids - Trang chủ"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 transition-transform group-hover:scale-110 flex-shrink-0">
            <Image
              src="/engkids-logo.png"
              alt="Engkids mascot"
              fill
              className="object-contain drop-shadow-lg"
              sizes="48px"
              priority
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  (e.target as HTMLImageElement).style.display = 'none';
                  parent.innerHTML = '<span style="font-size:2.5rem;line-height:1">🐨</span>';
                }
              }}
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-black text-white drop-shadow-lg tracking-wide">Engkids</span>
            <div className="text-[10px] text-white/80 font-bold -mt-0.5">Học Tiếng Anh Vui! 🌟</div>
          </div>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="text-lg text-white">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-black/10 backdrop-blur-sm p-1.5 rounded-2xl" role="navigation" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`relative px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-1.5 group ${
                isActive(item.path)
                  ? `${item.active} scale-105`
                  : 'text-white/90 hover:bg-white/25 hover:text-white hover:scale-110'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="text-base transition-transform duration-200 group-hover:scale-125" aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/progress"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-purple-600 text-sm font-black hover:shadow-lg hover:scale-105 transition-all"
            aria-label={`Bạn có ${totalStars} sao`}
          >
            <span aria-hidden="true">🌟</span>
            <span>{totalStars}</span>
          </Link>

          <Link
            href="/admin/login"
            className="px-4 py-1.5 rounded-full bg-white text-purple-600 text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
            aria-label="Admin Login"
          >
            Login
          </Link>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav 
          className="md:hidden bg-white/95 backdrop-blur-sm border-t border-white/30 px-4 py-3 space-y-1.5"
          role="navigation"
          aria-label="Menu mobile"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all group ${
                isActive(item.path)
                  ? item.mobileActive
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="text-xl transition-transform duration-200 group-hover:scale-125" aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
            <Link
              href="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-purple-600 font-black shadow-sm border-2 border-purple-200"
            >
              <span>🌟</span>
              <span>{totalStars} sao</span>
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-full bg-purple-600 text-white font-bold"
              aria-label="Admin Login"
            >
              Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export default memo(Header);
