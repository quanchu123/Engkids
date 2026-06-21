'use client';

/**
 * RewardOverlay — global celebration shown whenever the child earns stars/coins.
 *
 * Listens to the transient `rewardEvent` in the app store (set by completeStory
 * / applyGameResult), plays a short chime, shows flying coin + star emojis and
 * reuses the Fireworks burst, then auto-clears. Pointer-events are disabled so
 * it never blocks the UI. Respects prefers-reduced-motion via short durations.
 */

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Fireworks from '@/components/common/Fireworks';

const DURATION = 1700;

/** Tiny WebAudio "ting" — no asset needed; silently no-ops if unsupported. */
function playChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [880, 1175, 1568]; // A5, D6, G6 — bright, happy
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* audio unsupported / blocked — ignore */
  }
}

export default function RewardOverlay() {
  const rewardEvent = useAppStore((state) => state.rewardEvent);
  const clearReward = useAppStore((state) => state.clearReward);

  const [active, setActive] = useState(false);
  const [fxKey, setFxKey] = useState(0);
  const [payload, setPayload] = useState<{ stars: number; coins: number }>({ stars: 0, coins: 0 });
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rewardEvent || rewardEvent.id === lastIdRef.current) return;
    lastIdRef.current = rewardEvent.id;
    setPayload({ stars: rewardEvent.stars, coins: rewardEvent.coins });
    setActive(true);
    setFxKey((k) => k + 1);
    playChime();

    const timer = setTimeout(() => {
      setActive(false);
      clearReward();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [rewardEvent, clearReward]);

  if (!active) return <Fireworks trigger={fxKey} />;

  // A little stream of flying emojis (coins + a star).
  const flyers = [
    ...Array.from({ length: Math.min(payload.coins, 8) || 1 }, () => '🪙'),
    '⭐',
  ];

  return (
    <>
      <Fireworks trigger={fxKey} />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-hidden="true">
        <div className="relative">
          <div className="reward-pop rounded-3xl bg-white/95 px-8 py-6 text-center shadow-2xl ring-4 ring-amber-300">
            <div className="text-5xl">🎉</div>
            <div className="mt-1 text-2xl font-black text-violet-700">Tuyệt vời!</div>
            <div className="mt-1 flex items-center justify-center gap-3 text-lg font-black">
              {payload.stars > 0 && <span className="text-amber-500">+{payload.stars} ⭐</span>}
              {payload.coins > 0 && <span className="text-orange-500">+{payload.coins} 🪙</span>}
            </div>
          </div>

          {flyers.map((emoji, i) => (
            <span
              key={i}
              className="reward-flyer absolute left-1/2 top-1/2 text-3xl"
              style={{ ['--fly-x' as string]: `${(i - flyers.length / 2) * 36}px`, animationDelay: `${i * 60}ms` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes reward-pop-in {
          0% { transform: scale(0.5); opacity: 0; }
          55% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .reward-pop { animation: reward-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes reward-fly-up {
          0% { transform: translate(-50%, -50%) translateY(0) scale(0.6); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--fly-x), -160px) scale(1.2); opacity: 0; }
        }
        .reward-flyer { animation: reward-fly-up 1.4s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .reward-pop, .reward-flyer { animation-duration: 0.3s; }
        }
      `}</style>
    </>
  );
}
