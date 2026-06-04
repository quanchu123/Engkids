'use client';

import { useEffect, useMemo, useState } from 'react';

interface FireworksProps {
  /** When this value changes to a new truthy key, a new burst is triggered. */
  trigger: number;
  /** How long the celebration lasts (ms). Default 1800ms. */
  duration?: number;
}

interface Burst {
  id: number;
  left: number; // %
  top: number; // %
  color: string;
  delay: number; // ms
}

const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'];
const PARTICLES_PER_BURST = 14;

/**
 * Lightweight, dependency-free fireworks overlay for celebrating correct answers.
 * Renders full-screen, ignores pointer events, and respects prefers-reduced-motion
 * (the CSS in globals.css shortens animations automatically).
 */
export default function Fireworks({ trigger, duration = 1800 }: FireworksProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(timer);
  }, [trigger, duration]);

  // Regenerate burst positions each time we trigger
  const bursts = useMemo<Burst[]>(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: 15 + Math.random() * 70,
      top: 15 + Math.random() * 45,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 400,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
      data-testid="fireworks"
    >
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="fw-burst"
          style={{ left: `${burst.left}%`, top: `${burst.top}%`, animationDelay: `${burst.delay}ms` }}
        >
          {Array.from({ length: PARTICLES_PER_BURST }).map((_, p) => {
            const angle = (360 / PARTICLES_PER_BURST) * p;
            return (
              <span
                key={p}
                className="fw-particle"
                style={
                  {
                    background: COLORS[(p + burst.id) % COLORS.length],
                    '--fw-angle': `${angle}deg`,
                    animationDelay: `${burst.delay}ms`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
