'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_WORD_BANK, loadWordBank, toFiveLetterWords } from '@/lib/word-bank';

/* ─── Vocabulary: 5-letter words (defaults; replaced by the shared bank) ─── */
const WORDS = toFiveLetterWords(DEFAULT_WORD_BANK);

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

type TileState = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

function evaluateGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill('absent');
  const ansArr = answer.split('');
  const used = Array(WORD_LENGTH).fill(false);

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === ansArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  // Second pass: present but wrong position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const idx = ansArr.findIndex((c, j) => c === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = 'present';
      used[idx] = true;
    }
  }
  return result;
}

export default function WordPuzzlePage() {
  const [target, setTarget] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [shake, setShake] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);

  // Load the shared word bank and pick a fresh 5-letter target.
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (!active) return;
      const words = toFiveLetterWords(bank);
      setTarget(words[Math.floor(Math.random() * words.length)]);
    });
    return () => { active = false; };
  }, []);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // Derive keyboard letter states
  const keyStates = new Map<string, TileState>();
  guesses.forEach(g => {
    const states = evaluateGuess(g, target.en);
    g.split('').forEach((letter, i) => {
      const prev = keyStates.get(letter);
      const curr = states[i];
      if (curr === 'correct' || (curr === 'present' && prev !== 'correct') || (!prev)) {
        keyStates.set(letter, curr);
      }
    });
  });

  const submitGuess = useCallback(() => {
    if (current.length !== WORD_LENGTH) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      showToast('Cần nhập đủ 5 chữ cái');
      return;
    }
    const newGuesses = [...guesses, current];
    setRevealRow(guesses.length);
    setGuesses(newGuesses);
    setCurrent('');

    setTimeout(() => {
      setRevealRow(-1);
      if (current === target.en) {
        setGameState('won');
        showToast('Xuất sắc!');
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameState('lost');
        showToast(`Đáp án: ${target.en}`);
      }
    }, WORD_LENGTH * 350 + 200);
  }, [current, guesses, target, showToast]);

  const handleKey = useCallback((key: string) => {
    if (gameState !== 'playing') return;
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === '⌫' || key === 'BACKSPACE') {
      setCurrent(c => c.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent(c => c + key);
    }
  }, [gameState, current, submitGuess]);

  // Physical keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key.toUpperCase());
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const handleReplay = () => window.location.reload();

  // Build board rows
  const board = Array.from({ length: MAX_GUESSES }, (_, row) => {
    const isGuessed = row < guesses.length;
    const isCurrent = row === guesses.length && gameState === 'playing';
    const word = isGuessed ? guesses[row] : isCurrent ? current : '';
    const states: TileState[] = isGuessed
      ? evaluateGuess(guesses[row], target.en)
      : Array(WORD_LENGTH).fill(isCurrent && word.length > 0 ? 'tbd' : 'empty');
    const isRevealing = row === revealRow;

    return { word, states, isCurrent, isRevealing };
  });

  return (
    <>
      <style>{`
        @keyframes flip-in {
          0%   { transform: rotateX(0deg); }
          50%  { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes pop-in {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes shake-row {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes bounce-tile {
          0%,20%   { transform: translateY(0); }
          40%      { transform: translateY(-25px); }
          60%      { transform: translateY(0); }
          80%      { transform: translateY(-10px); }
          100%     { transform: translateY(0); }
        }
        @keyframes toast-in {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to   { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes celebration {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(170deg, #0a0a0f 0%, #111128 50%, #0a0f1a 100%)' }}>

        {/* â”€â”€ Toast â”€â”€ */}
        {toast && (
          <div className="fixed top-20 left-1/2 z-50 px-6 py-3 rounded-xl font-bold text-white text-sm"
            style={{
              background: 'rgba(30,30,50,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              animation: 'toast-in 0.3s ease-out',
              transform: 'translateX(-50%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
            {toast}
          </div>
        )}

        {/* â”€â”€ Header â”€â”€ */}
        <header className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/games" className="text-white/40 hover:text-white text-sm font-bold transition-colors">
            Quay lại
          </Link>
          <h1 className="font-black text-lg tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #93c5fd, #c084fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
            WORD PUZZLE
          </h1>
          <div className="w-14" />
        </header>

        {/* â”€â”€ Hint â”€â”€ */}
        <div className="text-center py-2">
          <span className="text-white/30 text-xs uppercase tracking-widest">Gợi ý</span>
          <div className="text-2xl font-black mt-0.5"
            style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))',
            }}>
            {target.vi}
          </div>
        </div>

        {/* â”€â”€ Board â”€â”€ */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 px-4 overflow-hidden">
          {board.map((row, ri) => (
            <div key={ri}
              className="flex gap-1.5"
              style={{
                animation: row.isCurrent && shake ? 'shake-row 0.5s ease' : undefined,
              }}>
              {Array.from({ length: WORD_LENGTH }, (_, ci) => {
                const letter = row.word[ci] || '';
                const state  = letter ? row.states[ci] : 'empty';
                const isRevealing = row.isRevealing;
                const isWinRow = gameState === 'won' && ri === guesses.length - 1;

                const bg =
                  state === 'correct' ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                  state === 'present' ? 'linear-gradient(135deg, #eab308, #ca8a04)' :
                  state === 'absent'  ? 'linear-gradient(135deg, #374151, #1f2937)' :
                  state === 'tbd'     ? 'transparent' : 'transparent';

                const border =
                  state === 'tbd'   ? '2px solid rgba(148,163,184,0.4)' :
                  state === 'empty' ? '2px solid rgba(255,255,255,0.08)' :
                  '2px solid transparent';

                const glow =
                  state === 'correct' ? '0 0 20px rgba(34,197,94,0.4)' :
                  state === 'present' ? '0 0 20px rgba(234,179,8,0.3)' :
                  'none';

                return (
                  <div key={ci}
                    className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl font-black text-xl sm:text-2xl text-white uppercase select-none shrink-0"
                    style={{
                      background: bg,
                      border,
                      boxShadow: glow,
                      animation: isRevealing
                        ? `flip-in 0.6s ${ci * 350}ms ease-in-out both`
                        : isWinRow
                        ? `bounce-tile 0.6s ${ci * 100}ms ease both`
                        : letter && state === 'tbd'
                        ? 'pop-in 0.1s ease'
                        : undefined,
                      textShadow: state !== 'empty' && state !== 'tbd' ? '0 2px 4px rgba(0,0,0,0.4)' : 'none',
                    }}>
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* â”€â”€ Keyboard â”€â”€ */}
        {gameState === 'playing' && (
          <div className="flex flex-col items-center gap-1.5 px-2 pb-3 pt-2 shrink-0">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map(key => {
                  const ks = keyStates.get(key);
                  const isWide = key === 'ENTER' || key === '⌫';
                  const bg =
                    ks === 'correct' ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                    ks === 'present' ? 'linear-gradient(135deg, #eab308, #ca8a04)' :
                    ks === 'absent'  ? '#1f2937' :
                    'rgba(255,255,255,0.12)';
                  const glow =
                    ks === 'correct' ? '0 0 12px rgba(34,197,94,0.4)' :
                    ks === 'present' ? '0 0 12px rgba(234,179,8,0.3)' :
                    'none';

                  return (
                    <button key={key}
                      onClick={() => handleKey(key)}
                      className="flex items-center justify-center rounded-lg font-bold text-white transition-all duration-150 active:scale-90 select-none"
                      style={{
                        background: bg,
                        width: isWide ? 58 : 32,
                        height: 44,
                        fontSize: isWide ? 11 : 15,
                        boxShadow: glow,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€ End screen â”€â”€ */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40"
            style={{
              background: gameState === 'won'
                ? 'radial-gradient(ellipse at center, rgba(15,50,20,0.97), rgba(0,0,0,0.98))'
                : 'radial-gradient(ellipse at center, rgba(50,15,15,0.97), rgba(0,0,0,0.98))',
            }}>
            <div className="text-5xl mb-4 font-black text-yellow-400">{gameState === 'won' ? 'WIN' : 'LOSE'}</div>
            <h2 className="font-black text-4xl sm:text-5xl mb-2" style={{
              background: gameState === 'won'
                ? 'linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24)'
                : 'linear-gradient(135deg, #fca5a5, #dc2626)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {gameState === 'won' ? 'TUYỆT VỜI!' : 'HẾT LƯỢT!'}
            </h2>
            <p className="text-white/50 text-lg mb-1">
              Đáp án: <span className="text-white font-black">{target.en}</span>
            </p>
            <p className="text-white/30 text-sm mb-6">{target.vi}</p>
            {gameState === 'won' && (
              <p className="text-white/40 text-sm mb-4">
                Hoàn thành trong <span className="text-yellow-400 font-black">{guesses.length}/{MAX_GUESSES}</span> lượt
              </p>
            )}
            <button onClick={handleReplay}
              className="px-10 py-4 rounded-full font-black text-lg text-black transition-transform hover:scale-105 active:scale-95"
              style={{
                background: gameState === 'won'
                  ? 'linear-gradient(135deg, #fde68a, #f59e0b)'
                  : 'linear-gradient(135deg, #fca5a5, #f87171)',
                boxShadow: '0 0 30px rgba(245,158,11,0.4)',
              }}>
              Chơi lại
            </button>
            <Link href="/games" className="text-white/30 hover:text-white text-sm underline mt-4">
              Quay vá» lobby
            </Link>
          </div>
        )}
      </div>
    </>
  );
}


