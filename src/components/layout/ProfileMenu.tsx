'use client';

/**
 * ProfileMenu — clicking the header avatar opens this dropdown showing the
 * child's name, account email (if logged in) and key stats (stars, coins,
 * streak, words, stories), plus quick links and login/logout. The display
 * name is editable and stored in localStorage ('engkids.childName'), shared
 * with the certificate & Today hero.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut, Pencil, Check, Crown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { User } from '@/lib/auth-client';
import { checkPremiumStatus } from '@/lib/freemium';
import AvatarDisplay from '@/components/learning/AvatarDisplay';
import UiIcon, { UiIconName } from '@/components/common/UiIcon';

const NAME_KEY = 'engkids.childName';

interface ProfileMenuProps {
  user: User | null;
  onLogout: () => void;
}

export default function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const userId = user?.id;
  const userName = user?.name;
  const userEmail = user?.email;
  const totalStars = useAppStore((state) => state.progress.totalStars);
  const coins = useAppStore((state) => state.coins);
  const streak = useAppStore((state) => state.progress.currentStreak);
  const savedWords = useAppStore((state) => state.progress.savedWords);
  const storiesProgress = useAppStore((state) => state.progress.storiesProgress);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (userName) {
        setName(userName);
        window.localStorage.setItem(NAME_KEY, userName);
      } else if (!userId) {
        setName(window.localStorage.getItem(NAME_KEY) || '');
      }
    } catch {
      /* ignore */
    }
  }, [userId, userName]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setIsPremium(false);
      return;
    }

    checkPremiumStatus()
      .then((result) => {
        if (!cancelled) setIsPremium(result.isPremium);
      })
      .catch(() => {
        if (!cancelled) setIsPremium(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const storiesCompleted = useMemo(
    () => Object.values(storiesProgress).filter((s) => s.completed).length,
    [storiesProgress],
  );

  const saveName = () => {
    const trimmed = name.trim().slice(0, 40);
    setName(trimmed);
    try {
      window.localStorage.setItem(NAME_KEY, trimmed);
    } catch {
      /* ignore */
    }
    setEditing(false);
  };

  const displayName = name || userName || 'Bé yêu';

  const stats: Array<{ icon: UiIconName; label: string; value: number }> = [
    { icon: 'star', label: 'Sao', value: totalStars },
    { icon: 'coins', label: 'Xu', value: coins },
    { icon: 'fire', label: 'Chuỗi ngày', value: streak },
    { icon: 'abc', label: 'Từ đã học', value: savedWords.length },
    { icon: 'open-book', label: 'Truyện xong', value: storiesCompleted },
  ];

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 transition-transform hover:scale-105"
        aria-label="Hồ sơ của bé"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <AvatarDisplay size="sm" showMood />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-800 shadow-2xl"
          role="menu"
        >
          {/* Header */}
          <div className="relative flex items-center gap-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 p-4 text-white">
            {isPremium && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-950 shadow-lg shadow-amber-950/20">
                <Crown size={13} fill="currentColor" />
                Premium
              </div>
            )}
            <div className="rounded-2xl bg-white/15 p-1">
              <AvatarDisplay size="md" />
            </div>
            <div className={`min-w-0 flex-1 ${isPremium ? 'pr-20' : ''}`}>
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    maxLength={40}
                    placeholder="Tên của bé"
                    className="w-full rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none"
                  />
                  <button onClick={saveName} aria-label="Lưu tên" className="rounded-lg bg-white/20 p-1.5 hover:bg-white/30">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-lg font-black">{displayName}</h3>
                  <button onClick={() => setEditing(true)} aria-label="Đổi tên" className="rounded-md p-1 hover:bg-white/20">
                    <Pencil size={13} />
                  </button>
                </div>
              )}
              <p className="truncate text-xs font-semibold text-white/85">
                {userEmail || 'Khách (chưa đăng nhập)'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 p-3">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center rounded-xl bg-slate-50 px-2 py-2 text-center">
                <UiIcon name={s.icon} size={22} />
                <span className="mt-1 text-sm font-black text-slate-800">{s.value}</span>
                <span className="text-[10px] font-bold text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="grid gap-1 px-3 pb-2">
            <ProfileLink href="/account" icon="notebook" label="Thông tin tài khoản" onClick={() => setOpen(false)} />
            <ProfileLink href="/progress" icon="medal" label="Tiến trình của bé" onClick={() => setOpen(false)} />
            <ProfileLink href="/shop" icon="gift" label="Cửa hàng phần thưởng" onClick={() => setOpen(false)} />
            <ProfileLink href="/progress/certificate" icon="certificate" label="Giấy chứng nhận" onClick={() => setOpen(false)} />
            <ProfileLink href="/parent" icon="family" label="Khu vực phụ huynh" onClick={() => setOpen(false)} />
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-3">
            {user ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-black text-white"
              >
                <LogIn size={16} /> Đăng nhập để lưu tiến trình
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileLink({ href, icon, label, onClick }: { href: string; icon: UiIconName; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
      role="menuitem"
    >
      <UiIcon name={icon} size={22} />
      {label}
    </Link>
  );
}
