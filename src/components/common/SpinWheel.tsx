'use client';

/**
 * SpinWheel — daily lucky wheel modal. Once per day the child spins for coins
 * or a streak-freeze. The wheel rotates to land on the prize chosen by the
 * store's weighted roll (spinDailyWheel), then reveals the reward.
 */

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SPIN_PRIZES, canSpin } from '@/lib/daily-spin';
import { getTodayDate } from '@/lib/progress';

const SEG = 360 / SPIN_PRIZES.length;

// Build the colored pie background once.
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

  const available = canSpin(lastSpinDate, getTodayDate());

  const handleSpin = () => {
    if (spinning || !available) return;
    const outcome = spinDailyWheel();
    if (!outcome) return;

    setSpinning(true);
    setResult(null);

    // Land the chosen segment under the top pointer, after several full turns.
    const target = 360 * 5 - (outcome.index * SEG + SEG / 2);
    // Continue forward from current rotation to keep the motion always clockwise.
    const next = rotation - (rotation % 360) + target + 360;
    setRotation(next);

    window.setTimeout(() => {
      setSpinning(false);
      setResult({ kind: outcome.kind, amount: outcome.amount });
    }, 3200);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[2rem] bg-gradient-to-b from-violet-50 to-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-xl font-black text-slate-400 hover:text-slate-600"
          aria-label="Đóng"
        >
          ×
        </button>

        <h2 className="text-2xl font-black text-violet-700">Vòng quay may mắn 🎡</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {available ? 'Mỗi ngày được quay 1 lần. Chúc may mắn!' : 'Hôm nay bạn đã quay rồi. Mai quay tiếp nhé!'}
        </p>

        <div className="relative mx-auto mt-6 h-64 w-64">
          {/* Pointer */}
          <div
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #ef4444' }}
            aria-hidden
          />
          {/* Wheel */}
          <div
            className="h-64 w-64 rounded-full border-8 border-white shadow-xl"
            style={{
              background: CONIC,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.1s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          >
            {SPIN_PRIZES.map((p, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-left text-[11px] font-black text-white drop-shadow"
                style={{ transform: `rotate(${i * SEG + SEG / 2}deg) translateX(34px)` }}
              >
                {p.kind === 'freeze' ? '🧊' : p.amount}
              </div>
            ))}
          </div>
          {/* Hub */}
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-violet-300 bg-white shadow" />
        </div>

        {result ? (
          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-lg font-black text-amber-700 ring-2 ring-amber-200">
            🎉 Bạn nhận được {result.kind === 'freeze' ? `${result.amount} vé giữ lửa 🧊` : `${result.amount} xu 🪙`}!
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={spinning || !available}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 text-base font-black text-white shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {spinning ? 'Đang quay...' : available ? 'Quay ngay!' : 'Hẹn mai nhé'}
          </button>
        )}
      </div>
    </div>
  );
}
