'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ─── Vocabulary ────────────────────────────────────────────────────────── */
const VOCAB = [
  { en: 'APPLE',   vi: 'Quả táo' },   { en: 'OCEAN',   vi: 'Đại dương' },
  { en: 'CLOUD',   vi: 'Đám mây' },   { en: 'FLAME',   vi: 'Ngọn lửa' },
  { en: 'MAGIC',   vi: 'Ma thuật' },   { en: 'SWORD',   vi: 'Thanh kiếm' },
  { en: 'FROST',   vi: 'Băng giá' },   { en: 'EAGLE',   vi: 'Đại bàng' },
  { en: 'STONE',   vi: 'Hòn đá' },    { en: 'CROWN',   vi: 'Vương miện' },
  { en: 'DREAM',   vi: 'Giấc mơ' },   { en: 'LIGHT',   vi: 'Ánh sáng' },
  { en: 'MUSIC',   vi: 'Âm nhạc' },   { en: 'HONEY',   vi: 'Mật ong' },
  { en: 'RIVER',   vi: 'Con sông' },   { en: 'TOWER',   vi: 'Tòa tháp' },
  { en: 'PLANT',   vi: 'Cây cối' },   { en: 'STORM',   vi: 'Cơn bão' },
  { en: 'PEARL',   vi: 'Ngọc trai' }, { en: 'EARTH',   vi: 'Trái đất' },
];

const COLOR_PALETTES = [
  ['#f43f5e', '#e11d48'], ['#f97316', '#ea580c'], ['#eab308', '#ca8a04'],
  ['#22c55e', '#16a34a'], ['#06b6d4', '#0891b2'], ['#8b5cf6', '#7c3aed'],
  ['#ec4899', '#db2777'], ['#14b8a6', '#0d9488'],
];

const BLOCK_HEIGHT = 50;
const BASE_WIDTH = 200;
const SHRINK = 6;

interface Block {
  x: number;
  y: number;
  width: number;
  letter: string;
  color: string[];
  perfect: boolean;
  status: 'stacked' | 'falling' | 'missed';
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  vy: number;
  color: string[];
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  life: number;
}

export default function TowerWordPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    blocks: Block[];
    fallingPieces: FallingPiece[];
    particles: Particle[];
    swingX: number;
    swingDir: number;
    swingSpeed: number;
    currentWidth: number;
    currentLetter: string;
    currentColor: string[];
    cameraY: number;
    targetCameraY: number;
    word: typeof VOCAB[0];
    letterIndex: number;
    score: number;
    combo: number;
    gameOver: boolean;
    won: boolean;
    started: boolean;
  } | null>(null);
  const animRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting');
  const [currentWord, setCurrentWord] = useState<typeof VOCAB[0]>(VOCAB[0]);
  const [letterIndex, setLetterIndex] = useState(0);

  const initGame = useCallback(() => {
    const word = VOCAB[Math.floor(Math.random() * VOCAB.length)];
    setCurrentWord(word);
    setLetterIndex(0);
    setScore(0);
    setCombo(0);

    const canvas = canvasRef.current!;
    const W = canvas.width;

    const baseBlock: Block = {
      x: W / 2 - BASE_WIDTH / 2,
      y: canvas.height - BLOCK_HEIGHT - 20,
      width: BASE_WIDTH,
      letter: '',
      color: ['#4b5563', '#374151'],
      perfect: false,
      status: 'stacked',
    };

    gameRef.current = {
      blocks: [baseBlock],
      fallingPieces: [],
      particles: [],
      swingX: 0,
      swingDir: 1,
      swingSpeed: 2.5,
      currentWidth: BASE_WIDTH - SHRINK,
      currentLetter: word.en[0],
      currentColor: COLOR_PALETTES[0],
      cameraY: 0,
      targetCameraY: 0,
      word,
      letterIndex: 0,
      score: 0,
      combo: 0,
      gameOver: false,
      won: false,
      started: true,
    };
    setGameState('playing');
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    if (!gameRef.current) return;
    for (let i = 0; i < count; i++) {
      gameRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        size: 3 + Math.random() * 4,
        color,
        life: 1,
      });
    }
  }, []);

  const dropBlock = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.gameOver) return;

    const canvas = canvasRef.current!;
    const W = canvas.width;
    const topBlock = g.blocks[g.blocks.length - 1];
    const blockY = topBlock.y - BLOCK_HEIGHT;
    const blockX = g.swingX + W / 2 - g.currentWidth / 2;

    // Check overlap with top block
    const overlapLeft = Math.max(blockX, topBlock.x);
    const overlapRight = Math.min(blockX + g.currentWidth, topBlock.x + topBlock.width);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // Missed completely
      g.fallingPieces.push({
        x: blockX, y: blockY,
        width: g.currentWidth, vy: 0,
        color: g.currentColor,
      });
      g.gameOver = true;
      g.combo = 0;
      spawnParticles(blockX + g.currentWidth / 2, blockY, '#ff4444', 20);
      setGameState('lost');
      return;
    }

    const perfectThreshold = topBlock.width * 0.05;
    const isPerfect = Math.abs(blockX - topBlock.x) < perfectThreshold && Math.abs(g.currentWidth - topBlock.width) < perfectThreshold;

    if (isPerfect) {
      // Perfect stack
      const newBlock: Block = {
        x: topBlock.x, y: blockY,
        width: topBlock.width,
        letter: g.currentLetter,
        color: g.currentColor, perfect: true,
        status: 'stacked',
      };
      g.blocks.push(newBlock);
      g.combo++;
      g.score += 200 + g.combo * 50;
      g.currentWidth = Math.min(g.currentWidth + 4, BASE_WIDTH); // reward: grow slightly
      spawnParticles(newBlock.x + newBlock.width / 2, newBlock.y, '#fde68a', 25);
    } else {
      // Partial overlap
      const newBlock: Block = {
        x: overlapLeft, y: blockY,
        width: overlapWidth,
        letter: g.currentLetter,
        color: g.currentColor, perfect: false,
        status: 'stacked',
      };
      g.blocks.push(newBlock);

      // Falling piece (the missed part)
      if (blockX < topBlock.x) {
        g.fallingPieces.push({
          x: blockX, y: blockY,
          width: topBlock.x - blockX, vy: 0,
          color: g.currentColor,
        });
      }
      if (blockX + g.currentWidth > topBlock.x + topBlock.width) {
        g.fallingPieces.push({
          x: topBlock.x + topBlock.width, y: blockY,
          width: (blockX + g.currentWidth) - (topBlock.x + topBlock.width), vy: 0,
          color: g.currentColor,
        });
      }

      g.currentWidth = overlapWidth;
      g.combo = 0;
      g.score += 100;
      spawnParticles(newBlock.x + newBlock.width / 2, newBlock.y, g.currentColor[0], 12);
    }

    // Advance letter
    g.letterIndex++;
    setLetterIndex(g.letterIndex);
    setScore(g.score);
    setCombo(g.combo);

    if (g.letterIndex >= g.word.en.length) {
      g.gameOver = true;
      g.won = true;
      setGameState('won');
      spawnParticles(W / 2, blockY, '#fde68a', 40);
      return;
    }

    g.currentLetter = g.word.en[g.letterIndex];
    g.currentColor = COLOR_PALETTES[g.letterIndex % COLOR_PALETTES.length];
    g.swingSpeed = Math.min(g.swingSpeed + 0.15, 6);

    // Camera adjustment
    g.targetCameraY = Math.max(0, (g.blocks.length - 5) * BLOCK_HEIGHT);

    // Check if width is too small
    if (g.currentWidth < 15) {
      g.gameOver = true;
      g.combo = 0;
      setGameState('lost');
    }
  }, [spawnParticles]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 500);
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const g = gameRef.current;
      if (!g || !g.started) {
        // Draw title screen
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;

      // Camera
      g.cameraY += (g.targetCameraY - g.cameraY) * 0.08;

      // Clear
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0a0020');
      grad.addColorStop(0.5, '#0d0030');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5) % W;
        const sy = ((i * 97.3 + g.cameraY * 0.1) % H);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(Date.now() * 0.001 + i) * 0.1})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      ctx.save();
      ctx.translate(0, g.cameraY);

      // Draw blocks
      g.blocks.forEach((block, idx) => {
        if (idx === 0) {
          // Base platform
          const pg = ctx.createLinearGradient(block.x, block.y, block.x, block.y + BLOCK_HEIGHT);
          pg.addColorStop(0, '#374151');
          pg.addColorStop(1, '#1f2937');
          ctx.fillStyle = pg;
          roundRect(ctx, block.x, block.y, block.width, BLOCK_HEIGHT, 6);
          ctx.fill();
          // Platform text
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('NỀN TẢNG', block.x + block.width / 2, block.y + BLOCK_HEIGHT / 2 + 4);
          return;
        }

        const bg = ctx.createLinearGradient(block.x, block.y, block.x + block.width, block.y + BLOCK_HEIGHT);
        bg.addColorStop(0, block.color[0]);
        bg.addColorStop(1, block.color[1]);
        ctx.fillStyle = bg;
        roundRect(ctx, block.x, block.y, block.width, BLOCK_HEIGHT, 8);
        ctx.fill();

        // Glow
        if (block.perfect) {
          ctx.shadowColor = block.color[0];
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(ctx, block.x + 4, block.y + 3, block.width - 8, BLOCK_HEIGHT * 0.4, 4);
        ctx.fill();

        // Letter
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;
        ctx.fillText(block.letter, block.x + block.width / 2, block.y + BLOCK_HEIGHT / 2);
        ctx.shadowBlur = 0;
      });

      // Swing block (current)
      if (!g.gameOver) {
        g.swingX += g.swingDir * g.swingSpeed;
        const maxSwing = W / 2 - 20;
        if (Math.abs(g.swingX) > maxSwing) {
          g.swingDir *= -1;
          g.swingX = Math.sign(g.swingX) * maxSwing;
        }

        const topBlock = g.blocks[g.blocks.length - 1];
        const bx = g.swingX + W / 2 - g.currentWidth / 2;
        const by = topBlock.y - BLOCK_HEIGHT;

        // Draw swing line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(W / 2, by - 40);
        ctx.lineTo(bx + g.currentWidth / 2, by);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw swinging block
        const sbg = ctx.createLinearGradient(bx, by, bx + g.currentWidth, by + BLOCK_HEIGHT);
        sbg.addColorStop(0, g.currentColor[0]);
        sbg.addColorStop(1, g.currentColor[1]);
        ctx.fillStyle = sbg;
        ctx.shadowColor = g.currentColor[0];
        ctx.shadowBlur = 20;
        roundRect(ctx, bx, by, g.currentWidth, BLOCK_HEIGHT, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        roundRect(ctx, bx + 4, by + 3, g.currentWidth - 8, BLOCK_HEIGHT * 0.35, 4);
        ctx.fill();

        // Letter on swing block
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(g.currentLetter, bx + g.currentWidth / 2, by + BLOCK_HEIGHT / 2);
        ctx.shadowBlur = 0;
      }

      // Falling pieces
      g.fallingPieces.forEach(fp => {
        fp.vy += 0.5;
        fp.y += fp.vy;
        const fbg = ctx.createLinearGradient(fp.x, fp.y, fp.x + fp.width, fp.y + BLOCK_HEIGHT);
        fbg.addColorStop(0, fp.color[0]);
        fbg.addColorStop(1, fp.color[1]);
        ctx.fillStyle = fbg;
        ctx.globalAlpha = Math.max(0, 1 - fp.vy / 20);
        roundRect(ctx, fp.x, fp.y, fp.width, BLOCK_HEIGHT, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      g.fallingPieces = g.fallingPieces.filter(fp => fp.y < H + 200);

      // Particles
      g.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
      g.particles = g.particles.filter(p => p.life > 0);

      ctx.restore();
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Click / tap / space to drop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (gameState === 'waiting') initGame();
        else dropBlock();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, dropBlock, initGame]);

  const handleTap = () => {
    if (gameState === 'waiting') initGame();
    else if (gameState === 'playing') dropBlock();
  };

  const stars = score >= 800 ? 3 : score >= 400 ? 2 : 1;

  return (
    <>
      <style>{`
        @keyframes star-pop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes glow-text {
          0%,100% { filter: drop-shadow(0 0 10px rgba(251,191,36,0.4)); }
          50%     { filter: drop-shadow(0 0 30px rgba(251,191,36,0.8)); }
        }
      `}</style>

      <div className="fixed inset-0 flex flex-col items-center"
        style={{ background: '#0a0a1a' }}
        onClick={handleTap}>

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* ── HUD ── */}
        <div className="relative z-10 w-full max-w-md flex items-center justify-between px-4 pt-3">
          <Link href="/games"
            className="text-white/40 hover:text-white text-sm font-bold transition-colors"
            onClick={e => e.stopPropagation()}>
            ← Lobby
          </Link>
          {gameState === 'playing' && (
            <span className="text-yellow-400 font-black text-lg" style={{ textShadow: '0 0 12px rgba(250,204,21,0.5)' }}>
              ⭐ {score}
            </span>
          )}
          {combo >= 2 && (
            <span className="text-amber-400 font-black text-sm animate-bounce">
              PERFECT x{combo} 🔥
            </span>
          )}
        </div>

        {/* ── Word display ── */}
        {gameState === 'playing' && (
          <div className="relative z-10 mt-4 flex flex-col items-center">
            <span className="text-white/30 text-xs uppercase tracking-widest mb-1">Đánh vần</span>
            <div className="flex gap-1.5 mb-2">
              {currentWord.en.split('').map((letter, i) => (
                <div key={i}
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all duration-300"
                  style={{
                    background: i < letterIndex
                      ? `linear-gradient(135deg, ${COLOR_PALETTES[i % COLOR_PALETTES.length][0]}, ${COLOR_PALETTES[i % COLOR_PALETTES.length][1]})`
                      : i === letterIndex
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    color: i < letterIndex ? '#fff' : i === letterIndex ? '#fde68a' : 'rgba(255,255,255,0.2)',
                    border: i === letterIndex ? '2px solid rgba(253,230,138,0.5)' : '2px solid transparent',
                    boxShadow: i < letterIndex ? `0 0 12px ${COLOR_PALETTES[i % COLOR_PALETTES.length][0]}55` : 'none',
                  }}>
                  {i < letterIndex ? letter : i === letterIndex ? letter : '·'}
                </div>
              ))}
            </div>
            <span className="text-lg font-bold" style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {currentWord.vi}
            </span>
          </div>
        )}

        {/* ── Start screen ── */}
        {gameState === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <h1 className="font-black text-5xl sm:text-6xl mb-4" style={{
              background: 'linear-gradient(135deg, #c084fc, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'glow-text 2s ease-in-out infinite',
            }}>
              🏗️ TOWER WORD
            </h1>
            <p className="text-white/40 text-sm mb-8 text-center px-6">
              Chạm/Nhấn Space để thả khối · Xếp chồng để đánh vần từ tiếng Anh!
            </p>
            <div className="px-10 py-4 rounded-full font-black text-lg text-white cursor-pointer transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                boxShadow: '0 0 30px rgba(139,92,246,0.5)',
              }}>
              🎮 Bắt đầu
            </div>
          </div>
        )}

        {/* ── Tap hint ── */}
        {gameState === 'playing' && (
          <div className="absolute bottom-6 inset-x-0 text-center z-10 pointer-events-none">
            <span className="text-white/15 text-xs">Chạm để thả khối</span>
          </div>
        )}

        {/* ── Win ── */}
        {gameState === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-30"
            onClick={e => e.stopPropagation()}
            style={{ background: 'radial-gradient(ellipse at center, rgba(15,50,20,0.97), rgba(0,0,0,0.98))' }}>
            <div className="flex gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="text-5xl" style={{
                  animation: `star-pop 0.5s ${i * 0.2 + 0.3}s ease-out both`,
                  filter: i < stars ? 'drop-shadow(0 0 12px gold)' : 'grayscale(1) opacity(0.25)',
                }}>⭐</div>
              ))}
            </div>
            <h2 className="font-black text-4xl sm:text-5xl" style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))',
            }}>TUYỆT VỜI!</h2>
            <p className="text-white/50">
              {currentWord.en} = {currentWord.vi} · <span className="text-yellow-400 font-black">{score} điểm</span>
            </p>
            <button onClick={() => window.location.reload()}
              className="px-10 py-4 rounded-full font-black text-lg text-black transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              🔄 Chơi lại
            </button>
            <Link href="/games" className="text-white/30 hover:text-white text-sm underline">
              Quay về lobby
            </Link>
          </div>
        )}

        {/* ── Lose ── */}
        {gameState === 'lost' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-30"
            onClick={e => e.stopPropagation()}
            style={{ background: 'radial-gradient(ellipse at center, rgba(40,10,10,0.97), rgba(0,0,0,0.98))' }}>
            <div className="text-7xl">💥</div>
            <h2 className="font-black text-4xl sm:text-5xl" style={{
              background: 'linear-gradient(135deg, #fca5a5, #dc2626)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>SỤP ĐỔ!</h2>
            <p className="text-white/50">
              Điểm: <span className="text-orange-400 font-black">{score}</span>
            </p>
            <button onClick={() => window.location.reload()}
              className="px-10 py-4 rounded-full font-black text-lg text-white transition-transform hover:scale-105 active:scale-95"
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

/* ── Helper: rounded rectangle ── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
