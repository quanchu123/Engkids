'use client';

/**
 * SpinWheel — daily lucky wheel modal. Once per day the child spins for coins
 * or a streak-freeze. The wheel rotates to land on the prize chosen by the
 * store's weighted roll (spinDailyWheel), then reveals the reward with a
 * celebratory burst. Polished look: golden rim with running bulb lights, white
 * spoke dividers, upright prize labels and a glossy pointer.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SPIN_PRIZES, canSpin } from '@/lib/daily-spin';
import { getTodayDate } from '@/lib/progress';
import Fireworks from '@/components/common/Fireworks';

const SEG = 360 / SPIN_PRIZES.length;
const WHEEL = 288; // px
const RADIUS = WHEEL / 2;
const BULBS = 16;

// Colored pie background with subtle inner shading for depth.
const CONIC = `conic-gradient(${SPIN_PRIZES.map(
  (p, i) => `${p.color} ${i * SEG}deg ${(i + 1) * SEG}deg`,
).join(', ')})`;

interface SpinWheelProps {
  onClose: () => void;
}

export default function SpinWheel({ onClose }: SpinWheelProps) {
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);
  const spinDailyWheel = useAppStore((state) => state.spinDailyWheel);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ kind: 'coins' | 'freeze'; amount: number } | null>(null);
  const [fxKey, setFxKey] = useState(0);

  const available = canSpin(lastSpinDate, getTodayDate());

  const bulbs = useMemo(
    () =>
      Array.from({ length: BULBS }, (_, i) => {
        const a = (360 / BULBS) * i;
        const rad = (a * Math.PI) / 180;
        return { left: RADIUS + (RADIUS - 6) * Math.sin(rad), top: RADIUS - (RADIUS - 6) * Math.cos(rad), i };
      }),
    [],
  );

  const handleSpin = () => {
    if (spinning || !available) return;
    const outcome = spinDailyWheel();
    if (!outcome) return;

    setSpinning(true);
    setResult(null);

    const target = 360 * 5 - (outcome.index * SEG + SEG / 2);
    const next = rotation - (rotation % 360) + target + 360;
    setRotation(next);

    window.setTimeout(() => {
      setSpinning(false);
      setResult({ kind: outcome.kind, amount: outcome.amount });
      setFxKey((k) => k + 1);
    }, 3300);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {result && <Fireworks trigger={fxKey} duration={1800} />}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft glow blobs */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-white/10" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white hover:bg-white/30"
          aria-label="Đóng"
        >
          ×
        </button>

        <h2 className="relative text-2xl font-black text-white drop-shadow">Vòng Quay May Mắn 🎡</h2>
        <p className="relative mt-1 text-xs font-bold text-white/85">
          {available ? 'Mỗi ngày quay 1 lần — chúc bé may mắn!' : 'Hôm nay bé đã quay rồi. Mai quay tiếp nhé!'}
        </p>

        <div className="relative mx-auto mt-6" style={{ width: WHEEL, height: WHEEL + 16 }}>
          {/* Pointer */}
          <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 drop-shadow-lg" aria-hidden>
            <div style={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '26px solid #fde047' }} />
          </div>

          {/* Golden rim + bulbs */}
          <div
            className="absolute left-0 z-0 rounded-full"
            style={{ top: 8, width: WHEEL, height: WHEEL, background: 'radial-gradient(circle, #fde68a 0%, #f59e0b 70%, #b45309 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
          >
            {bulbs.map((b) => (
              <span
                key={b.i}
                className={`absolute h-2.5 w-2.5 rounded-full ${spinning ? 'spin-bulb' : ''}`}
                style={{ left: b.left - 5, top: b.top - 5, background: '#fffbeb', boxShadow: '0 0 6px #fde047', animationDelay: `${(b.i % 4) * 0.1}s` }}
              />
            ))}
          </div>

          {/* Wheel */}
          <div
            className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full"
            style={{
              top: 8 + 14,
              width: WHEEL - 28,
              height: WHEEL - 28,
              background: CONIC,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.25)',
            }}
          >
            {/* spoke dividers */}
            {SPIN_PRIZES.map((_, i) => (
              <div
                key={`spoke-${i}`}
                className="absolute left-1/2 top-1/2 origin-bottom"
                style={{ height: (WHEEL - 28) / 2, width: 2, background: 'rgba(255,255,255,0.55)', transform: `translate(-50%, -100%) rotate(${i * SEG}deg)`, transformOrigin: '50% 100%' }}
              />
            ))}
            {/* upright labels */}
            {SPIN_PRIZES.map((p, i) => {
              const angle = i * SEG + SEG / 2;
              return (
                <div
                  key={`label-${i}`}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: `rotate(${angle}deg) translateY(-${(WHEEL - 28) / 2 - 30}px)` }}
                >
                  <div className="flex flex-col items-center" style={{ transform: `rotate(${-angle}deg)` }}>
                    <span className="text-xl leading-none drop-shadow">{p.kind === 'freeze' ? '🧊' : '🪙'}</span>
                    <span className="text-[11px] font-black text-white drop-shadow">{p.kind === 'freeze' ? 'Vé' : p.amount}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hub */}
          <div
            className="absolute left-1/2 z-20 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-amber-300 bg-white text-lg shadow-lg"
            style={{ top: 8 + RADIUS - 24 }}
          >
            🎯
          </div>
        </div>

        {result ? (
          <div className="relative mt-6 rounded-2xl bg-white px-4 py-4 shadow-lg">
            <div className="text-3xl">🎉</div>
            <div className="mt-1 text-lg font-black text-amber-600">
              Bé nhận được {result.kind === 'freeze' ? `${result.amount} vé giữ lửa 🧊` : `${result.amount} xu 🪙`}!
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-black text-white shadow-md transition-transform hover:scale-105"
            >
              Tuyệt vời!
            </button>
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={spinning || !available}
            className="relative mt-6 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-amber-400 px-6 py-3.5 text-base font-black text-amber-900 shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:from-white/30 disabled:to-white/30 disabled:text-white"
          >
            {spinning ? 'Đang quay... 🌀' : available ? 'QUAY NGAY! 🎰' : 'Hẹn mai nhé 👋'}
          </button>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin-bulb-anim { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .spin-bulb { animation: spin-bulb-anim 0.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .spin-bulb { animation: none; } }
      `}</style>
    </div>
  );
}
