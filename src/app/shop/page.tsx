'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import AvatarDisplay from '@/components/learning/AvatarDisplay';
import UiIcon from '@/components/common/UiIcon';
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

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('character');

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
                  className={`flex flex-col items-center gap-3 rounded-[1.75rem] bg-white p-4 text-center shadow-md transition-transform hover:-translate-y-1 ${
                    equipped ? 'ring-4 ring-fuchsia-400' : 'ring-1 ring-slate-100'
                  }`}
                >
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-3xl ${locked ? 'grayscale' : ''}`}
                    style={{
                      background: `radial-gradient(circle at 30% 25%, #ffffff 0%, ${item.tint} 85%)`,
                      opacity: locked ? 0.55 : 1,
                    }}
                  >
                    <ItemArt item={item} px={64} />
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
    </>
  );
}
