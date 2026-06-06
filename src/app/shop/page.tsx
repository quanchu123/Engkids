'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import Header from '@/components/layout/Header';
import AvatarDisplay from '@/components/learning/AvatarDisplay';
import UiIcon from '@/components/common/UiIcon';
import { useAppStore } from '@/store/useAppStore';
import {
  AVATAR_CATEGORIES,
  AvatarCategory,
  AvatarItem,
  getItemsByCategory,
  isUnlocked,
} from '@/lib/avatar';

const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  character: 'Nhân vật',
  hat: 'Mũ nón',
  pet: 'Thú cưng',
  frame: 'Khung viền',
};

export default function ShopPage() {
  const totalStars = useAppStore((state) => state.progress.totalStars);
  const equippedAvatar = useAppStore((state) => state.equippedAvatar);
  const equipAvatarItem = useAppStore((state) => state.equipAvatarItem);
  const unlockAvatarItem = useAppStore((state) => state.unlockAvatarItem);
  const isAvatarItemOwned = useAppStore((state) => state.isAvatarItemOwned);

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('character');

  const items = getItemsByCategory(activeCategory);

  const handleUnlockAndEquip = (item: AvatarItem) => {
    unlockAvatarItem(item.id);
    equipAvatarItem(item.category, item.id);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-pink-50 to-sky-50 pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <h1
              className="font-black leading-tight"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                background: 'linear-gradient(135deg, #d946ef 0%, #ec4899 50%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.025em',
              }}
            >
              Cửa Hàng Phần Thưởng
            </h1>
            <p className="text-sm font-bold text-fuchsia-700/80">
              Dùng sao để mở khóa nhân vật và phụ kiện đáng yêu!
            </p>
            <div className="kid-chip mt-1 flex items-center gap-2 px-4 py-2 text-base font-black text-amber-600">
              <UiIcon name="star" size={22} />
              <span>{totalStars} sao</span>
            </div>
          </div>

          <section className="soft-feature mb-6 flex flex-col items-center gap-3 rounded-[2rem] p-6 text-white">
            <AvatarDisplay size="lg" />
            <p className="text-sm font-black text-white/90">Hình đại diện của bạn</p>
          </section>

          <section className="soft-panel mb-6 flex flex-wrap justify-center gap-2 rounded-[1.75rem] p-2">
            {AVATAR_CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
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

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const owned = isAvatarItemOwned(item.id);
              const equipped = equippedAvatar[item.category] === item.id;
              const unlocked = isUnlocked(item, totalStars);

              return (
                <div
                  key={item.id}
                  className={`toy-panel flex flex-col items-center gap-3 p-4 text-center ${
                    equipped ? 'ring-2 ring-fuchsia-400' : ''
                  }`}
                >
                  <div
                    className="toy-surface flex h-20 w-20 items-center justify-center rounded-full text-4xl"
                    style={{ background: `radial-gradient(circle at 30% 25%, #ffffff 0%, ${item.tint} 80%)` }}
                  >
                    <span aria-hidden="true">{item.emoji}</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">{item.nameVi}</h3>

                  {equipped ? (
                    <span className="kid-chip px-3 py-2 text-xs font-black text-emerald-700">
                      Đang dùng
                    </span>
                  ) : owned ? (
                    <button
                      onClick={() => equipAvatarItem(item.category, item.id)}
                      className="action-btn w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-black text-white shadow-lg"
                    >
                      Trang bị
                    </button>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleUnlockAndEquip(item)}
                      className="action-btn flex w-full items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-xs font-black text-white shadow-lg"
                    >
                      <Star size={13} fill="currentColor" aria-hidden="true" />
                      Mở khóa ({item.requiredStars}⭐)
                    </button>
                  ) : (
                    <span className="flex w-full items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-400">
                      Cần {item.requiredStars}⭐
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}
