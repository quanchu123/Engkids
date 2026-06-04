'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { onAuthStateChange, User, signOut } from '@/lib/auth-client';

const NAV_ITEMS = [
  { name: 'Trang chủ', path: '/', icon: '🏠', active: 'bg-sky-100 text-sky-600 shadow-md shadow-sky-200/60', mobileActive: 'bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md' },
  { name: 'Truyện tranh', path: '/stories', icon: '🦄', active: 'bg-fuchsia-100 text-fuchsia-600 shadow-md shadow-fuchsia-200/60', mobileActive: 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-md' },
  { name: 'Videos', path: '/videos', icon: '🎬', active: 'bg-orange-100 text-orange-600 shadow-md shadow-orange-200/60', mobileActive: 'bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-md' },
  { name: 'Music', path: '/music', icon: '🎵', active: 'bg-rose-100 text-rose-600 shadow-md shadow-rose-200/60', mobileActive: 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md' },
  { name: 'Games', path: '/games', icon: '🎮', active: 'bg-green-100 text-green-600 shadow-md shadow-green-200/60', mobileActive: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md' },
  { name: 'Tiến độ', path: '/progress', icon: '🐾', active: 'bg-amber-100 text-amber-600 shadow-md shadow-amber-200/60', mobileActive: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-white shadow-md' },
];

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const totalStars = useAppStore((state) => state.progress.totalStars);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    const subscription = onAuthStateChange((currentUser) => {
      if (isMounted) setUser(currentUser);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut('/');
  };

  const isActive = useCallback((path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  }, [pathname]);

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  return (
    <header
      className="sticky top-0 z-50 bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 shadow-xl"
      style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2">
        <Link href="/" className="group flex items-center gap-2" aria-label="Engkids - Trang chủ">
          <div className="relative h-10 w-10 flex-shrink-0 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
            <Image
              src="/engkids-logo.png"
              alt="Engkids mascot"
              fill
              className="object-contain drop-shadow-lg"
              sizes="48px"
              priority
              onError={(event) => {
                const parent = (event.target as HTMLImageElement).parentElement;
                if (parent) {
                  (event.target as HTMLImageElement).style.display = 'none';
                  parent.innerHTML = '<span style="font-size:2.5rem;line-height:1">🐨</span>';
                }
              }}
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-black tracking-wide text-white drop-shadow-lg">Engkids</span>
            <div className="mt-[-2px] text-[10px] font-bold text-white/80">Học Tiếng Anh Vui! 🌟</div>
          </div>
        </Link>

        <button
          className="rounded-lg bg-white/20 p-1.5 transition-colors hover:bg-white/30 md:hidden"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="text-lg text-white">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        <nav className="hidden items-center gap-1 rounded-2xl bg-black/10 p-1.5 backdrop-blur-sm md:flex" role="navigation" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all duration-200 ${
                isActive(item.path)
                  ? `${item.active} scale-105`
                  : 'text-white/90 hover:scale-110 hover:bg-white/25 hover:text-white'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="text-base transition-transform duration-200 group-hover:scale-125" aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/progress"
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-black text-purple-600 transition-all hover:scale-105 hover:shadow-lg"
            aria-label={`Bạn có ${totalStars} sao`}
          >
            <span aria-hidden="true">🌟</span>
            <span>{totalStars}</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm font-bold text-white hidden lg:block">
                {user.name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white transition-all hover:bg-white/30 hover:scale-105"
                aria-label="Đăng xuất"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-purple-600 transition-all hover:scale-105 hover:shadow-lg"
              aria-label="Đăng nhập"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="space-y-1.5 border-t border-white/30 bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden"
          role="navigation"
          aria-label="Menu mobile"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 font-bold transition-all ${
                isActive(item.path) ? item.mobileActive : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="text-xl transition-transform duration-200 group-hover:scale-125" aria-hidden="true">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="flex items-center justify-between border-t border-purple-100 pt-2">
            <Link
              href="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-full border-2 border-purple-200 bg-white px-4 py-2 font-black text-purple-600 shadow-sm"
            >
              <span>🌟</span>
              <span>{totalStars} sao</span>
            </Link>
            
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="rounded-full bg-rose-500 px-4 py-2 font-bold text-white"
                aria-label="Đăng xuất"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-purple-600 px-4 py-2 font-bold text-white"
                aria-label="Đăng nhập"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export default memo(Header);
