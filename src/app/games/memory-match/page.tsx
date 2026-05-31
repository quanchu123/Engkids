'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_WORD_BANK, loadWordBank, toMemoryPairs } from '@/lib/word-bank';

/* ─── Vocabulary pairs (defaults; replaced by the shared word bank) ──────── */
const PAIRS = toMemoryPairs(DEFAULT_WORD_BANK);

const GRID_SIZE = 8; // 4x4 grid = 8 pairs (16 cards)
const GRADIENTS = [
  ['#f43f5e','#e11d48'], ['#f97316','#ea580c'], ['#eab308','#ca8a04'],
  ['#22c55e','#16a34a'], ['#06b6d4','#0891b2'], ['#8b5cf6','#7c3aed'],
  ['#ec4899','#db2777'], ['#14b8a6','#0d9488'], ['#f59e0b','#d97706'],
  ['#6366f1','#4f46e5'], ['#a855f7','#9333ea'], ['#10b981','#059669'],
];

interface Card {
  id: number;
  pairId: number;
  type: 'en' | 'vi';
  text: string;
  emoji: string;
  grad: string[];
  matched: boolean;
}

function buildDeck(pairs: Array<{ en: string; vi: string; emoji: string }> = PAIRS): Card[] {
  const selected = [...pairs].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
  const cards: Card[] = [];
  selected.forEach((pair, idx) => {
    const grad = GRADIENTS[idx % GRADIENTS.length];
    cards.push({ id: idx * 2,     pairId: idx, type: 'en', text: pair.en,  emoji: pair.emoji, grad, matched: false });
    cards.push({ id: idx * 2 + 1, pairId: idx, type: 'vi', text: pair.vi,  emoji: pair.emoji, grad, matched: false });
  });
  return cards.sort(() => Math.random() - 0.5);
}

export default function MemoryMatchPage() {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [shakePair, setShakePair] = useState<number[]>([]);
  const lockRef = useRef(false);
  const particleId = useRef(0);
  const startTime = useRef(Date.now());

  // Load the shared word bank and rebuild the deck with it.
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) setCards(buildDeck(toMemoryPairs(bank)));
    });
    return () => { active = false; };
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const id = ++particleId.current;
    setParticles(p => [...p, { id, x, y, color }]);
    setTimeout(() => setParticles(p => p.filter(pp => pp.id !== id)), 900);
  }, []);

  const handleFlip = useCallback((cardId: number) => {
    if (lockRef.current) return;
    if (flipped.includes(cardId)) return;
    if (matched.has(cardId)) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      const cardA = cards.find(c => c.id === a)!;
      const cardB = cards.find(c => c.id === b)!;

      if (cardA.pairId === cardB.pairId && cardA.type !== cardB.type) {
        // Match!
        setTimeout(() => {
          setMatched(prev => {
            const next = new Set(prev);
            next.add(a);
            next.add(b);
            if (next.size === cards.length) {
              setTimeout(() => setGameOver(true), 600);
            }
            return next;
          });
          setCombo(c => c + 1);
          setScore(s => s + 100 + combo * 25);
          setFlipped([]);
          lockRef.current = false;
          // particles from card positions
          const els = document.querySelectorAll(`[data-card-id="${a}"],[data-card-id="${b}"]`);
          els.forEach(el => {
            const rect = el.getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, cardA.grad[0]);
          });
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setShakePair([a, b]);
          setTimeout(() => setShakePair([]), 500);
        }, 500);
        setTimeout(() => {
          setFlipped([]);
          setCombo(0);
          lockRef.current = false;
        }, 1000);
      }
    }
  }, [flipped, matched, cards, combo, spawnParticles]);

  const elapsed = gameOver ? Math.round((Date.now() - startTime.current) / 1000) : 0;
  const stars = moves <= GRID_SIZE + 2 ? 3 : moves <= GRID_SIZE * 2 ? 2 : 1;

  return (
    <>
      <style>{`
        .card-container { perspective: 800px; }
        .card-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped { transform: rotateY(180deg); }
        .card-front, .card-back {
          position: absolute; inset: 0; border-radius: 16px;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .card-front { transform: rotateY(180deg); }
        @keyframes match-pop {
          0%   { transform: rotateY(180deg) scale(1); }
          50%  { transform: rotateY(180deg) scale(1.1); }
          100% { transform: rotateY(180deg) scale(1); }
        }
        .card-inner.matched { animation: match-pop 0.5s ease; }
        @keyframes card-shake {
          0%,100% { transform: rotateY(180deg) translateX(0); }
          25%     { transform: rotateY(180deg) translateX(-6px); }
          75%     { transform: rotateY(180deg) translateX(6px); }
        }
        .card-inner.shaking { animation: card-shake 0.4s ease; }
        @keyframes sparkle-fly {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        @keyframes float-bg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes star-pop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      `}</style>

      <div className="fixed inset-0 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(-45deg, #0f0720, #0a1628, #0d1f2d, #0a0020)',
          backgroundSize: '400% 400%',
          animation: 'float-bg 15s ease infinite',
        }}>

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 py-3 z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/games" className="text-white/40 hover:text-white text-sm font-bold transition-colors">
            ← Lobby
          </Link>
          <h1 className="font-black text-lg tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #f0abfc, #c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
            MEMORY MATCH
          </h1>
          <div className="flex items-center gap-2 text-sm">
            {combo >= 2 && (
              <span className="text-amber-400 font-black animate-bounce text-xs">x{combo}</span>
            )}
            <span className="text-white/40 font-bold">{moves} lượt</span>
          </div>
        </header>

        {/* ── Score bar ── */}
        <div className="flex items-center justify-center gap-6 py-2 z-10">
          <span className="text-yellow-400 font-black text-sm" style={{ textShadow: '0 0 12px rgba(250,204,21,0.5)' }}>
            Score {score}
          </span>
          <div className="flex gap-0.5">
            {Array(GRID_SIZE).fill(0).map((_, i) => (
              <div key={i} className="w-3 h-1.5 rounded-full transition-all duration-500" style={{
                background: i < matched.size / 2 ? '#22c55e' : 'rgba(255,255,255,0.1)',
                boxShadow: i < matched.size / 2 ? '0 0 6px #22c55e88' : 'none',
              }} />
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="flex-1 flex items-center justify-center px-4 z-10">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-sm">
            {cards.map(card => {
              const isFlipped = flipped.includes(card.id) || matched.has(card.id);
              const isMatched = matched.has(card.id);
              const isShaking = shakePair.includes(card.id);

              return (
                <div key={card.id}
                  data-card-id={card.id}
                  className="card-container aspect-[3/4] cursor-pointer"
                  onClick={() => handleFlip(card.id)}>
                  <div className={`card-inner ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${isShaking ? 'shaking' : ''}`}>
                    {/* Back (face-down) */}
                    <div className="card-back"
                      style={{
                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                        border: '2px solid rgba(139,92,246,0.25)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(139,92,246,0.08)',
                      }}>
                      <div className="text-3xl opacity-30">?</div>
                      {/* Decorative shine */}
                      <div className="absolute top-3 left-3 w-8 h-8 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, white, transparent)' }} />
                    </div>

                    {/* Front (face-up) */}
                    <div className="card-front"
                      style={{
                        background: `linear-gradient(135deg, ${card.grad[0]}22, ${card.grad[1]}44)`,
                        border: `2px solid ${card.grad[0]}66`,
                        boxShadow: isMatched
                          ? `0 0 24px ${card.grad[0]}55, inset 0 0 15px ${card.grad[0]}22`
                          : `0 4px 20px rgba(0,0,0,0.3)`,
                      }}>
                      <div className="text-2xl mb-1.5">{card.emoji}</div>
                      <div className="font-black text-white text-sm sm:text-base px-1 text-center leading-tight"
                        style={{ textShadow: `0 0 8px ${card.grad[0]}88` }}>
                        {card.text}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: card.type === 'en' ? 'rgba(59,130,246,0.3)' : 'rgba(234,179,8,0.3)',
                          color: card.type === 'en' ? '#93c5fd' : '#fde68a',
                          border: `1px solid ${card.type === 'en' ? 'rgba(59,130,246,0.3)' : 'rgba(234,179,8,0.3)'}`,
                        }}>
                        {card.type === 'en' ? 'ENG' : 'VIE'}
                      </div>
                      {isMatched && (
                        <div className="absolute top-2 right-2 text-xs font-black">OK</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint */}
        <div className="text-center pb-3 z-10">
          <span className="text-white/20 text-xs">Ghép thẻ Tiếng Anh 🇬🇧 với Tiếng Việt 🇻🇳</span>
        </div>

        {/* ── Sparkle particles ── */}
        {particles.map(p => (
          <div key={p.id} className="fixed pointer-events-none z-50" style={{ left: p.x, top: p.y }}>
            {Array.from({ length: 10 }, (_, i) => {
              const angle = (i / 10) * 360;
              const dist = 40 + Math.random() * 40;
              const rad = (angle * Math.PI) / 180;
              return (
                <div key={i} className="absolute w-2 h-2 rounded-full" style={{
                  background: p.color,
                  left: -4, top: -4,
                  boxShadow: `0 0 6px ${p.color}`,
                  animation: `sparkle-fly 0.7s ${i * 30}ms ease-out forwards`,
                  ['--dx' as any]: `${Math.cos(rad) * dist}px`,
                  ['--dy' as any]: `${Math.sin(rad) * dist}px`,
                }} />
              );
            })}
          </div>
        ))}

        {/* ── Win screen ── */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-40"
            style={{ background: 'radial-gradient(ellipse at center, rgba(15,50,30,0.98), rgba(0,0,0,0.98))' }}>
            <div className="flex gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="text-5xl" style={{
                  animation: `star-pop 0.5s ${i * 0.2 + 0.3}s ease-out both`,
                  filter: i < stars ? 'drop-shadow(0 0 12px gold)' : 'grayscale(1) opacity(0.25)',
                }}>S{i + 1}</div>
              ))}
            </div>
            <h2 className="font-black text-4xl sm:text-5xl" style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))',
            }}>HOÀN HẢO!</h2>
            <p className="text-white/50 text-sm">
              {moves} lượt · {elapsed}s · <span className="text-yellow-400 font-black">{score} điểm</span>
            </p>
            <button onClick={() => window.location.reload()}
              className="px-10 py-4 rounded-full font-black text-lg text-black transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              Chơi lại
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
