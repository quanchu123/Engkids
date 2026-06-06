'use client';

/**
 * "Thú Cưng Của Bé" — a cute Tamagotchi-style pet room (Phase 1).
 *
 * The child adopts a pet (one of the colorful Icons8 animals), then keeps its
 * needs up with care actions that cost coins and grant EXP. Pure React + CSS +
 * Icons8 art (no game engine) for a clean, mobile-friendly look. All state
 * lives in the app store (persisted); needs decay over real time.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import UiIcon from '@/components/common/UiIcon';
import { useAppStore } from '@/store/useAppStore';
import { getItem, getItemsByCategory } from '@/lib/avatar';
import {
  PET_ACTIONS,
  PetActionKey,
  PetStatKey,
  levelFromExp,
  petMood,
  MAX_STAT,
} from '@/lib/pet';

const STAT_META: Record<PetStatKey, { labelVi: string; emoji: string; bar: string }> = {
  hunger: { labelVi: 'No bụng', emoji: '🍎', bar: 'from-orange-400 to-amber-500' },
  happiness: { labelVi: 'Vui vẻ', emoji: '❤️', bar: 'from-pink-400 to-rose-500' },
  clean: { labelVi: 'Sạch sẽ', emoji: '🛁', bar: 'from-sky-400 to-cyan-500' },
  energy: { labelVi: 'Năng lượng', emoji: '⚡', bar: 'from-violet-400 to-purple-500' },
};

const ACTION_ORDER: PetActionKey[] = ['feed', 'play', 'bath', 'sleep'];
const MOOD_FACE: Record<'happy' | 'ok' | 'sad', string> = { happy: '😸', ok: '🙂', sad: '😿' };

export default function PetGamePage() {
  const pet = useAppStore((state) => state.pet);
  const coins = useAppStore((state) => state.coins);
  const hydrated = useAppStore((state) => state.hydrated);
  const adoptPet = useAppStore((state) => state.adoptPet);
  const carePet = useAppStore((state) => state.carePet);
  const syncPetDecay = useAppStore((state) => state.syncPetDecay);

  const [hearts, setHearts] = useState<number[]>([]);
  const [bounceKey, setBounceKey] = useState(0);
  const heartId = useRef(0);

  // Decay on mount + every 60s so the bars stay live.
  useEffect(() => {
    syncPetDecay();
    const t = setInterval(syncPetDecay, 60_000);
    return () => clearInterval(t);
  }, [syncPetDecay]);

  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-sky-100 to-violet-100" />
      </>
    );
  }

  if (!pet) return <AdoptScreen onAdopt={adoptPet} />;

  const doAction = (action: PetActionKey) => {
    const ok = carePet(action);
    if (!ok) return;
    setBounceKey((k) => k + 1);
    const id = heartId.current++;
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1200);
  };

  const species = getItem(pet.species);
  const speciesImg = species?.image || '/avatars/char-fox.png';
  const lvl = levelFromExp(pet.exp);
  const mood = petMood(pet);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sky-200 via-violet-100 to-pink-100 pb-28">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/games" className="kid-chip px-4 py-2 text-sm font-bold text-violet-700">← Game</Link>
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-amber-600 shadow">
              <UiIcon name="coins" size={20} /> {coins} xu
            </span>
          </div>

          {/* Pet room */}
          <section className="relative overflow-hidden rounded-[2.5rem] border-4 border-white bg-gradient-to-b from-sky-300 to-emerald-200 p-6 shadow-2xl">
            <div className="pointer-events-none absolute left-6 top-6 text-4xl opacity-70">☁️</div>
            <div className="pointer-events-none absolute right-8 top-10 text-3xl opacity-70">☁️</div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-black text-violet-700 shadow">
                {MOOD_FACE[mood]} {pet.name} · Cấp {lvl.level}
              </div>

              {/* Pet */}
              <div className="relative mt-4 flex h-44 w-44 items-end justify-center">
                {hearts.map((id) => (
                  <span key={id} className="pet-heart pointer-events-none absolute text-2xl">❤️</span>
                ))}
                <div key={bounceKey} className="pet-bounce">
                  <Image src={speciesImg} alt={pet.name} width={150} height={150} unoptimized style={{ objectFit: 'contain' }} />
                </div>
                <div className="absolute bottom-0 h-4 w-32 rounded-full bg-black/15 blur-sm" />
              </div>

              {/* Level bar */}
              <div className="mt-3 w-full max-w-xs">
                <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                  <span>Kinh nghiệm</span>
                  <span>{lvl.intoLevel}/{lvl.needed}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500" style={{ width: `${Math.max(lvl.progress * 100, 4)}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mt-4 grid grid-cols-2 gap-3">
            {(Object.keys(STAT_META) as PetStatKey[]).map((k) => {
              const meta = STAT_META[k];
              const val = pet[k];
              return (
                <div key={k} className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-center justify-between text-sm font-black text-slate-700">
                    <span>{meta.emoji} {meta.labelVi}</span>
                    <span className={val < 25 ? 'text-rose-500' : 'text-slate-400'}>{val}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all`} style={{ width: `${Math.max(val, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Actions */}
          <section className="mt-4 grid grid-cols-4 gap-3">
            {ACTION_ORDER.map((key) => {
              const def = PET_ACTIONS[key];
              const tooPoor = coins < def.coinCost;
              return (
                <button
                  key={key}
                  onClick={() => doAction(key)}
                  disabled={tooPoor}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-md transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image src={`/games/pet/${def.asset}.png`} alt={def.labelVi} width={48} height={48} unoptimized />
                  <span className="text-xs font-black text-slate-700">{def.labelVi}</span>
                  <span className="text-[10px] font-bold text-amber-600">
                    {def.coinCost > 0 ? `${def.coinCost} xu` : 'Miễn phí'}
                  </span>
                </button>
              );
            })}
          </section>

          <p className="mt-4 text-center text-xs font-semibold text-slate-500">
            Học bài để kiếm xu rồi chăm sóc thú cưng nhé! Chỉ số sẽ giảm dần theo thời gian.
          </p>
        </div>
      </main>

      <style jsx global>{`
        @keyframes pet-idle { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .pet-bounce { animation: pet-idle 2.2s ease-in-out infinite; }
        @keyframes pet-heart-float { 0% { transform: translateY(0) scale(0.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(-90px) scale(1.2); opacity: 0 } }
        .pet-heart { bottom: 60px; animation: pet-heart-float 1.2s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .pet-bounce, .pet-heart { animation-duration: 0.4s; } }
      `}</style>
    </>
  );
}

/* ----------------------------- Adoption ----------------------------- */

function AdoptScreen({ onAdopt }: { onAdopt: (species: string, name: string) => void }) {
  const characters = useMemo(() => getItemsByCategory('character'), []);
  const [selected, setSelected] = useState(characters[0]?.id ?? 'char-fox');
  const [name, setName] = useState('');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sky-200 via-violet-100 to-pink-100 pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="text-center text-3xl font-black text-violet-700">Chọn thú cưng của bé 🐾</h1>
          <p className="mt-1 text-center text-sm font-semibold text-slate-500">
            Chọn một bạn thú và đặt tên — rồi cùng chăm sóc mỗi ngày nhé!
          </p>

          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border-4 border-white bg-gradient-to-b from-sky-300 to-emerald-200 shadow-xl">
              <Image src={getItem(selected)?.image || '/avatars/char-fox.png'} alt="pet" width={110} height={110} unoptimized />
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Đặt tên cho thú cưng..."
              className="w-full max-w-xs rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-700 shadow outline-none"
            />
            <button
              onClick={() => onAdopt(selected, name)}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-8 py-3 text-base font-black text-white shadow-lg transition-transform hover:scale-105"
            >
              Nhận nuôi! 🏡
            </button>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex items-center justify-center rounded-2xl bg-white p-2 shadow-sm transition-transform hover:-translate-y-1 ${
                  selected === c.id ? 'ring-4 ring-fuchsia-400' : 'ring-1 ring-slate-100'
                }`}
                title={c.nameVi}
              >
                {c.image ? (
                  <Image src={c.image} alt={c.nameVi} width={48} height={48} unoptimized />
                ) : (
                  <span className="text-3xl">{c.emoji}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
