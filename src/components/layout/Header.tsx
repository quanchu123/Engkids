'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Clapperboard,
  Gamepad2,
  Gift,
  Home,
  LogIn,
  LogOut,
  Menu,
  Music,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { onAuthStateChange, signOut, User } from '@/lib/auth-client';
import AvatarDisplay from '@/components/learning/AvatarDisplay';

const NAV_ITEMS = [
  { name: 'Trang chủ', path: '/', icon: Home, tone: 'text-sky-600 bg-sky-50 border-sky-100' },
  { name: 'Truyện', path: '/stories', icon: BookOpen, tone: 'text-violet-600 bg-violet-50 border-violet-100' },
  { name: 'Video', path: '/videos', icon: Clapperboard, tone: 'text-orange-600 bg-orange-50 border-orange-100' },
  { name: 'Nhạc', path: '/music', icon: Music, tone: 'text-rose-600 bg-rose-50 border-rose-100' },
  { name: 'Game', path: '/games', icon: Gamepad2, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { name: 'Tiến trình', path: '/progress', icon: Star, tone: 'text-amber-600 bg-amber-50 border-amber-100' },
  { name: 'Cửa hàng', path: '/shop', icon: Gift, tone: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100' },
];

function Header() {
  const pathname = usePathname();
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
    return pathname === path || pathname.startsWith(`${path}/`);
  }, [pathname]);

  return (
    <header
      className="sticky top-0 z-50 bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 shadow-xl"
      style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)' }}
    >
      <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="group flex min-h-[48px] items-center gap-3" aria-label="Engkids - Trang chủ">
          <div className="relative h-11 w-11 flex-shrink-0 rounded-2xl bg-white/20 p-1 ring-1 ring-white/35 transition-transform group-hover:scale-105">
            <Image
              src="/engkids-logo.png"
              alt="Engkids"
              fill
              className="object-contain p-1"
              sizes="44px"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span className="block text-lg font-black leading-tight text-white drop-shadow">Engkids</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/85">
              <Sparkles size={12} aria-hidden="true" />
              Học tiếng Anh vui
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-white/15 bg-black/10 p-1 backdrop-blur-sm md:flex" role="navigation" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
                  active
                    ? item.tone
                    : 'border-transparent text-white/90 hover:bg-white/25 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={2.6} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/shop"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 transition-transform hover:scale-105"
            aria-label="Cửa hàng phần thưởng"
          >
            <AvatarDisplay size="sm" />
          </Link>
          <Link
            href="/progress"
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-3 text-sm font-black text-purple-600 shadow-sm transition-all hover:scale-105 hover:shadow-lg"
            aria-label={`Bạn có ${totalStars} sao`}
          >
            <Star size={17} fill="currentColor" aria-hidden="true" />
            <span>{totalStars}</span>
          </Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-black text-white transition-all hover:bg-white/30"
              aria-label="Đăng xuất"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden lg:inline">Đăng xuất</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-purple-600 transition-all hover:scale-105 hover:shadow-lg"
              aria-label="Đăng nhập"
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>

        <button
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white shadow-sm md:hidden"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" role="navigation" aria-label="Menu mobile">
          <div className="grid gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[48px] items-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${
                    active ? item.tone : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={19} strokeWidth={2.6} aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <Link
              href="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 text-sm font-black text-amber-700"
            >
              <Star size={17} fill="currentColor" aria-hidden="true" />
              <span>{totalStars} sao</span>
            </Link>
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white"
                aria-label="Đăng xuất"
              >
                <LogOut size={16} aria-hidden="true" />
                Đăng xuất
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white"
                aria-label="Đăng nhập"
              >
                <LogIn size={16} aria-hidden="true" />
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
