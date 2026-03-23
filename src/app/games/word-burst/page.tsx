'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Vocabulary ────────────────────────────────────────────────────────────
const VOCAB = [
  { en: 'Apple',   vi: 'Quả táo' },   { en: 'Ocean',   vi: 'Đại dương' },
  { en: 'Dragon',  vi: 'Con rồng' },   { en: 'Forest',  vi: 'Khu rừng' },
  { en: 'Castle',  vi: 'Lâu đài' },    { en: 'Thunder', vi: 'Sấm sét' },
  { en: 'Crystal', vi: 'Pha lê' },     { en: 'River',   vi: 'Con sông' },
  { en: 'Eagle',   vi: 'Đại bàng' },   { en: 'Shadow',  vi: 'Bóng tối' },
  { en: 'Flame',   vi: 'Ngọn lửa' },   { en: 'Frost',   vi: 'Băng giá' },
  { en: 'Storm',   vi: 'Cơn bão' },    { en: 'Sword',   vi: 'Thanh kiếm' },
  { en: 'Moon',    vi: 'Mặt trăng' },  { en: 'Star',    vi: 'Ngôi sao' },
  { en: 'King',    vi: 'Nhà vua' },    { en: 'Magic',   vi: 'Ma thuật' },
  { en: 'Island',  vi: 'Hòn đảo' },   { en: 'Cloud',   vi: 'Đám mây' },
];

// Palette of gradient pairs per orb
const ORB_GRADIENTS = [
  ['#7c3aed', '#4f46e5'], ['#db2777', '#be185d'], ['#0891b2', '#0e7490'],
  ['#059669', '#047857'], ['#d97706', '#92400e'], ['#dc2626', '#991b1b'],
  ['#7c3aed', '#0891b2'], ['#f59e0b', '#dc2626'],
];

const TOTAL_ROUNDS = 10;
const NUM_CHOICES  = 6;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRound(usedEn: Set<string>): { correct: typeof VOCAB[0]; choices: typeof VOCAB[0][] } {
  const pool = VOCAB.filter(v => !usedEn.has(v.en));
  const src  = pool.length >= NUM_CHOICES ? pool : VOCAB;
  const shuffled = shuffle(src);
  const correct  = shuffled[0];
  const distractors = shuffle(VOCAB.filter(v => v.en !== correct.en)).slice(0, NUM_CHOICES - 1);
  const choices  = shuffle([correct, ...distractors]);
  return { correct, choices };
}

// ─── Burst particle component ──────────────────────────────────────────────
interface BurstProps { x: number; y: number; color: string; onDone: () => void }
function Burst({ x, y, color, onDone }: BurstProps) {
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, [onDone]);
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle  = (i / 14) * 360;
    const dist   = 60 + Math.random() * 60;
    const size   = 6 + Math.random() * 8;
    return { angle, dist, size, delay: Math.random() * 80 };
  });
  return (
    <div className="fixed pointer-events-none" style={{ left: x, top: y, zIndex: 1000 }}>
      {particles.map((p, i) => {
        const rad    = (p.angle * Math.PI) / 180;
        const dx     = Math.cos(rad) * p.dist;
        const dy     = Math.sin(rad) * p.dist;
        return (
          <div key={i} className="absolute rounded-full" style={{
            width:  p.size, height: p.size,
            background: color,
            left: -p.size / 2, top: -p.size / 2,
            animation: `burst-fly 0.8s ${p.delay}ms ease-out forwards`,
            ['--dx' as any]: `${dx}px`,
            ['--dy' as any]: `${dy}px`,
            boxShadow: `0 0 6px ${color}`,
          }} />
        );
      })}
    </div>
  );
}

// ─── Orb component ─────────────────────────────────────────────────────────
interface OrbProps {
  word: string;
  grad: string[];
  size: number;
  x: number; y: number;
  floatDelay: number;
  state: 'idle' | 'correct' | 'wrong' | 'dimmed';
  onClick: (e: React.MouseEvent) => void;
}
function Orb({ word, grad, size, x, y, floatDelay, state, onClick }: OrbProps) {
  const idle    = state === 'idle';
  const correct = state === 'correct';
  const wrong   = state === 'wrong';
  const dimmed  = state === 'dimmed';
  return (
    <button
      onClick={idle ? onClick : undefined}
      className="absolute flex items-center justify-center rounded-full font-black text-white transition-all duration-300 select-none"
      style={{
        width:  size, height: size,
        left:   x - size / 2,
        top:    y - size / 2,
        background: wrong
          ? 'radial-gradient(circle at 35% 30%, #ff4444, #aa0000)'
          : correct
          ? 'radial-gradient(circle at 35% 30%, #22ff88, #008844)'
          : `radial-gradient(circle at 35% 30%, ${grad[0]}cc, ${grad[1]})`,
        boxShadow: wrong
          ? '0 0 30px #ff444488, inset 0 0 15px rgba(255,255,255,0.15)'
          : correct
          ? '0 0 40px #22ff8844, 0 0 80px #22ff8822, inset 0 0 15px rgba(255,255,255,0.2)'
          : idle
          ? `0 0 20px ${grad[0]}55, inset 0 0 12px rgba(255,255,255,0.12)`
          : 'none',
        opacity: dimmed ? 0.2 : 1,
        transform: correct ? 'scale(1.25)' : wrong ? 'scale(0.88)' : 'scale(1)',
        animation: idle ? `orb-float ${2.5 + floatDelay * 0.4}s ${floatDelay * 0.3}s ease-in-out infinite alternate` : undefined,
        cursor: idle ? 'pointer' : 'default',
        fontSize: `${Math.max(10, Math.round(size * 0.175))}px`,
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        border: '1.5px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(2px)',
        zIndex: 10,
      }}
    >
      {/* Specular highlight */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: '40%', height: '25%', top: '15%', left: '22%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, transparent 80%)' }} />
      <span className="relative z-10 px-1 text-center leading-tight">{word}</span>
    </button>
  );
}

// ─── Main game ─────────────────────────────────────────────────────────────
export default function WordBurstPage() {
  const [round,      setRound]     = useState(0);
  const [score,      setScore]     = useState(0);
  const [hp,         setHp]        = useState(3);
  const [streak,     setStreak]    = useState(0);
  const [gameOver,   setGameOver]  = useState<'win'|'lose'|null>(null);
  const [orbStates,  setOrbStates] = useState<('idle'|'correct'|'wrong'|'dimmed')[]>([]);
  const [bursts,     setBursts]    = useState<{ id:number; x:number; y:number; color:string }[]>([]);
  const [shakeScreen,setShake]     = useState(false);
  const burstId = useRef(0);
  const usedEnRef = useRef(new Set<string>());

  // Per-round data — stable as long as round doesn't change
  const [roundData, setRoundData] = useState(() => pickRound(new Set()));
  const [orbLayout, setOrbLayout] = useState<{ x:number; y:number; size:number; grad:string[]; floatDelay:number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Build layout randomised on each round
  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const positions: { x:number; y:number }[] = [];
    const minDist = 130;
    const layout = roundData.choices.map((_, idx) => {
      const grade = ORB_GRADIENTS[idx % ORB_GRADIENTS.length];
      const size  = 110 + Math.floor(Math.random() * 30);
      // Try to not overlap
      let x = 0, y = 0, attempts = 0;
      do {
        x = size / 2 + 80 + Math.random() * (W - size - 160);
        y = 120 + Math.random() * (H - size - 220);
        attempts++;
      } while (
        attempts < 40 &&
        positions.some(p => Math.hypot(p.x - x, p.y - y) < minDist)
      );
      positions.push({ x, y });
      return { x, y, size, grad: grade, floatDelay: idx };
    });
    setOrbLayout(layout);
    setOrbStates(roundData.choices.map(() => 'idle'));
  }, [roundData]);

  const advanceRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setGameOver('win');
    } else {
      const newRound = round + 1;
      setRound(newRound);
      usedEnRef.current.add(roundData.correct.en);
      const next = pickRound(usedEnRef.current);
      setRoundData(next);
    }
  }, [round, roundData.correct.en]);

  const handleOrbClick = useCallback((idx: number, e: React.MouseEvent) => {
    if (orbStates[idx] !== 'idle') return;
    const word    = roundData.choices[idx].en;
    const correct = word === roundData.correct.en;
    const newStates = roundData.choices.map((c, i) => {
      if (i === idx) return correct ? 'correct' : 'wrong';
      if (correct && c.en !== roundData.correct.en) return 'dimmed';
      return 'idle';
    }) as typeof orbStates;
    setOrbStates(newStates);

    const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect();
    const cx   = rect ? rect.left + rect.width / 2 : e.clientX;
    const cy   = rect ? rect.top + rect.height / 2 : e.clientY;
    const color = correct ? '#22ff88' : '#ff4444';
    const id    = ++burstId.current;
    setBursts(prev => [...prev, { id, x: cx, y: cy, color }]);

    if (correct) {
      const bonus = streak >= 2 ? 50 : 0;
      setScore(s => s + 100 + bonus);
      setStreak(s => s + 1);
      setTimeout(advanceRound, 750);
    } else {
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setHp(h => {
        const next = Math.max(0, h - 1);
        if (next <= 0) setTimeout(() => setGameOver('lose'), 600);
        return next;
      });
      // Show correct orb after brief delay
      setTimeout(() => {
        setOrbStates(prev => prev.map((s, i) =>
          roundData.choices[i].en === roundData.correct.en ? 'correct' : s === 'idle' ? 'dimmed' : s
        ));
        setTimeout(advanceRound, 900);
      }, 600);
    }
  }, [orbStates, roundData, streak, advanceRound]);

  const removeBurst = useCallback((id: number) => {
    setBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleReplay = () => window.location.reload();

  const stars = score >= 900 ? 3 : score >= 500 ? 2 : 1;

  return (
    <>
      {/* ── CSS animation keyframes ── */}
      <style>{`
        @keyframes orb-float {
          from { transform: translateY(0px) rotate(-2deg); }
          to   { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes burst-fly {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        @keyframes screen-shake {
          0%,100% { transform: translate(0,0); }
          20%     { transform: translate(-8px, 4px); }
          40%     { transform: translate(8px, -4px); }
          60%     { transform: translate(-5px, 2px); }
          80%     { transform: translate(5px, -2px); }
        }
        @keyframes title-pulse {
          0%,100% { text-shadow: 0 0 20px #f59e0b88, 0 0 40px #f59e0b44; }
          50%     { text-shadow: 0 0 40px #f59e0bcc, 0 0 80px #f59e0b88; }
        }
        @keyframes bg-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes star-in {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden select-none"
        style={{
          background: 'linear-gradient(-45deg, #0a0015, #0d0030, #00101a, #001a0a)',
          backgroundSize: '400% 400%',
          animation: shakeScreen ? 'screen-shake 0.45s ease' : 'bg-shift 12s ease infinite',
        } as any}
      >
        {/* ── Starfield ── */}
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width:   Math.random() > 0.85 ? 2 : 1,
            height:  Math.random() > 0.85 ? 2 : 1,
            left:    `${Math.random() * 100}%`,
            top:     `${Math.random() * 100}%`,
            background: '#ffffff',
            opacity: 0.2 + Math.random() * 0.5,
            animation: `orb-float ${3 + Math.random() * 4}s ${Math.random() * 3}s ease-in-out infinite alternate`,
          }} />
        ))}

        {/* ── HUD ── */}
        {!gameOver && (
          <div className="absolute top-0 inset-x-0 z-30 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              {/* Back */}
              <div className="pointer-events-auto">
                <Link href="/games"
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  ← Lobby
                </Link>
              </div>

              {/* Score + streak */}
              <div className="flex items-center gap-3">
                {streak >= 3 && (
                  <span className="text-sm font-black text-amber-400 animate-bounce">🔥 x{streak}</span>
                )}
                <span className="font-black text-lg" style={{ color: '#fbbf24', textShadow: '0 0 12px #fbbf2488' }}>
                  ⭐ {score}
                </span>
              </div>

              {/* HP as colored orbs */}
              <div className="flex gap-1.5">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full transition-all duration-300" style={{
                    background: i < hp
                      ? 'radial-gradient(circle at 35% 35%, #f87171, #dc2626)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: i < hp ? '0 0 8px #dc262688' : 'none',
                  }} />
                ))}
              </div>
            </div>

            {/* Progress dots + round */}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {Array(TOTAL_ROUNDS).fill(0).map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-500" style={{
                  width:  i === round ? 14 : 7,
                  height: 7,
                  background: i < round ? '#22c55e' : i === round ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                  boxShadow: i === round ? '0 0 10px #f59e0b88' : 'none',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Question word ── */}
        {!gameOver && orbLayout.length > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
            style={{ top: '13%' }}>
            <span className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Tìm nghĩa tiếng Anh của</span>
            <h1 className="font-black text-4xl sm:text-5xl mt-1"
              style={{
                color: '#fde68a',
                animation: 'title-pulse 2.2s ease-in-out infinite',
                letterSpacing: '0.02em',
              }}>
              {roundData.correct.vi}
            </h1>
          </div>
        )}

        {/* ── Orbs ── */}
        {!gameOver && orbLayout.map((orb, idx) => (
          roundData.choices[idx] && (
            <Orb
              key={`${round}-${idx}`}
              word={roundData.choices[idx].en}
              grad={orb.grad}
              size={orb.size}
              x={orb.x}
              y={orb.y}
              floatDelay={idx}
              state={orbStates[idx] || 'idle'}
              onClick={(e) => handleOrbClick(idx, e)}
            />
          )
        ))}

        {/* ── Burst particles ── */}
        {bursts.map(b => (
          <Burst key={b.id} x={b.x} y={b.y} color={b.color} onDone={() => removeBurst(b.id)} />
        ))}

        {/* ── Controls hint ── */}
        {!gameOver && round === 0 && orbStates.every(s => s === 'idle') && (
          <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
            Chạm vào quả cầu có nghĩa Tiếng Anh đúng 💫
          </div>
        )}

        {/* ── Win Screen ── */}
        {gameOver === 'win' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-40"
            style={{ background: 'radial-gradient(ellipse at center, #0f3310 0%, #000000 100%)' }}>
            {/* Stars */}
            <div className="flex gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="text-5xl" style={{
                  animation: `star-in 0.5s ${i * 0.2 + 0.3}s ease-out both`,
                  filter: i < stars ? 'drop-shadow(0 0 12px gold)' : 'grayscale(1) opacity(0.25)',
                }}>⭐</div>
              ))}
            </div>
            <h2 className="font-black text-5xl sm:text-6xl" style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))',
            }}>XUẤT SẮC!</h2>
            <p className="text-white/60 text-lg">{TOTAL_ROUNDS} câu · <span className="text-yellow-400 font-black">{score} điểm</span></p>
            <button onClick={handleReplay}
              className="px-10 py-4 rounded-full font-black text-xl text-black transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              🔄 Chơi lại
            </button>
            <Link href="/games" className="text-white/30 hover:text-white text-sm underline">
              Quay về lobby
            </Link>
          </div>
        )}

        {/* ── Lose Screen ── */}
        {gameOver === 'lose' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-40"
            style={{ background: 'radial-gradient(ellipse at center, #1a0000 0%, #000000 100%)' }}>
            <div className="text-7xl">💥</div>
            <h2 className="font-black text-5xl sm:text-6xl" style={{
              background: 'linear-gradient(135deg, #fc8181, #dc2626)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(220,38,38,0.6))',
            }}>GAME OVER</h2>
            <p className="text-white/60 text-lg">Điểm: <span className="text-orange-400 font-black">{score}</span></p>
            <button onClick={handleReplay}
              className="px-10 py-4 rounded-full font-black text-xl text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #dc2626, #7c3aed)', boxShadow: '0 0 30px rgba(220,38,38,0.4)' }}>
              🔄 Thử lại
            </button>
            <Link href="/games" className="text-white/30 hover:text-white text-sm underline">
              Quay về lobby
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
