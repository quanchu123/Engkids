'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import AvatarDisplay from '@/components/learning/AvatarDisplay';
import UiIcon from '@/components/common/UiIcon';
import SpinWheel from '@/components/common/SpinWheel';
import { canSpin } from '@/lib/daily-spin';
import { getTodayDate } from '@/lib/progress';
import { useAppStore } from '@/store/useAppStore';
import {
  AVATAR_CATEGORIES,
  AvatarCategory,
  AvatarItem,
  getItemsByCategory,
} from '@/lib/avatar';

const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  character: 'Nhân vật',
  hat: 'Mũ nón',
  pet: 'Thú cưng',
  frame: 'Khung viền',
};

/** Render an avatar item's art (Icons8 PNG) or its emoji fallback. */
function ItemArt({ item, px }: { item: AvatarItem; px: number }) {
  if (item.image) {
    return (
      <Image
        src={item.image}
        alt={item.nameVi}
        width={px}
        height={px}
        style={{ width: px, height: px, objectFit: 'contain' }}
        unoptimized
      />
    );
  }
  return (
    <span style={{ fontSize: px * 0.7, lineHeight: 1 }} aria-hidden="true">
      {item.emoji}
    </span>
  );
}

export default function ShopPage() {
  const coins = useAppStore((state) => state.coins);
  const streakFreezes = useAppStore((state) => state.streakFreezes);
  const equippedAvatar = useAppStore((state) => state.equippedAvatar);
  const equipAvatarItem = useAppStore((state) => state.equipAvatarItem);
  const purchaseAvatarItem = useAppStore((state) => state.purchaseAvatarItem);
  const buyStreakFreeze = useAppStore((state) => state.buyStreakFreeze);
  const isAvatarItemOwned = useAppStore((state) => state.isAvatarItemOwned);
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('character');
  const [showSpin, setShowSpin] = useState(false);
  const spinAvailable = canSpin(lastSpinDate, getTodayDate());

  const items = getItemsByCategory(activeCategory);

  const handleBuyAndEquip = (item: AvatarItem) => {
    if (purchaseAvatarItem(item.id)) {
      equipAvatarItem(item.category, item.id);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-fuchsia-100 via-pink-50 to-sky-100 pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Hero: big avatar preview + balance */}
          <section className="relative mb-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 p-6 text-white shadow-2xl sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-black drop-shadow sm:text-4xl">Cửa Hàng Phần Thưởng</h1>
                <p className="mt-1 max-w-md text-sm font-semibold text-white/90">
                  Học chăm để có sao, rồi mở khóa nhân vật và phụ kiện thật xịn cho bé!
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-black text-amber-600 shadow-lg">
                  <UiIcon name="coins" size={22} />
                  <span>{coins} xu</span>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setShowSpin(true)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black shadow-lg transition-transform hover:scale-105 ${
                      spinAvailable ? 'bg-yellow-300 text-amber-900' : 'bg-white/20 text-white'
                    }`}
                  >
                    Vòng quay may mắn 🎡
                    {spinAvailable && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">mới</span>}
                  </button>
                </div>
              </div>
              <div className="rounded-[2rem] bg-white/15 p-4 backdrop-blur">
                <AvatarDisplay size="lg" />
                <p className="mt-2 text-center text-sm font-black text-white/95">Bé của bạn</p>
              </div>
            </div>
          </section>

          {/* Category tabs */}
          <section className="mb-6 flex flex-wrap justify-center gap-2 rounded-[1.75rem] bg-white/70 p-2 shadow-sm backdrop-blur">
            {AVATAR_CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-2xl px-5 py-3 text-sm font-black transition-all ${
                    active
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white text-fuchsia-700 shadow'
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </section>

          {/* Item grid */}
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const owned = isAvatarItemOwned(item.id);
              const equipped = equippedAvatar[item.category] === item.id;
              const canAfford = coins >= item.requiredStars;
              const locked = !owned && !equipped && !canAfford;

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-[1.75rem] bg-white p-4 text-center shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${
                    equipped ? 'ring-4 ring-fuchsia-400' : 'ring-1 ring-slate-100'
                  }`}
                >
                  {equipped && (
                    <span className="absolute right-2 top-2 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[9px] font-black text-white shadow">★</span>
                  )}
                  <div
                    className="relative flex h-28 w-28 items-center justify-center rounded-3xl shadow-inner"
                    style={{
                      background: `radial-gradient(circle at 32% 24%, #ffffff 0%, ${item.tint} 88%)`,
                      opacity: locked ? 0.7 : 1,
                    }}
                  >
                    {/* glossy highlight */}
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),transparent_45%)]" />
                    <div className={locked ? 'grayscale' : 'transition-transform group-hover:scale-110'}>
                      <ItemArt item={item} px={72} />
                    </div>
                    {locked && (
                      <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700/80 text-sm text-white shadow">🔒</span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900">{item.nameVi}</h3>

                  {equipped ? (
                    <span className="flex w-full items-center justify-center gap-1 rounded-2xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                      ✓ Đang dùng
                    </span>
                  ) : owned ? (
                    <button
                      onClick={() => equipAvatarItem(item.category, item.id)}
                      className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-black text-white shadow-md transition-transform hover:scale-105"
                    >
                      Trang bị
                    </button>
                  ) : canAfford ? (
                    <button
                      onClick={() => handleBuyAndEquip(item)}
                      className="flex w-full items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-xs font-black text-white shadow-md transition-transform hover:scale-105"
                    >
                      <UiIcon name="coins" size={14} /> Mua {item.requiredStars}
                    </button>
                  ) : (
                    <span className="flex w-full items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-400">
                      <UiIcon name="coins" size={14} /> Cần {item.requiredStars} xu
                    </span>
                  )}
                </div>
              );
            })}
          </section>

          {/* Streak freeze: a consumable that saves the streak if a day is missed */}
          <section className="mt-6 flex flex-col items-center gap-3 rounded-[1.75rem] bg-white p-6 text-center shadow-md sm:flex-row sm:text-left">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-200">
              <UiIcon name="snowflake" size={48} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900">Vé giữ lửa 🧊</h3>
              <p className="text-sm font-semibold text-slate-500">
                Lỡ học mất 1 ngày? Vé này giữ nguyên chuỗi ngày học của bé. Đang có: <b>{streakFreezes}</b> vé.
              </p>
            </div>
            <button
              onClick={() => buyStreakFreeze()}
              disabled={coins < 50}
              className="flex items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UiIcon name="coins" size={16} /> Mua 50 xu
            </button>
          </section>
        </div>
      </main>
      {showSpin && <SpinWheel onClose={() => setShowSpin(false)} />}
    </>
  );
}
