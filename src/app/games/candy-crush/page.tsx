'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

// ─── Vocabulary mapping: candy type → { en, vi } ───────────────────────────
// These map each candy SPRITE to the bakery word it depicts, so the legend and
// toasts stay semantically correct. They are intentionally NOT pulled from the
// shared word bank: a positional mapping would label the cookie sprite with an
// unrelated CEFR word (e.g. "Hello"), breaking the picture↔word match.
const CANDY_VOCAB: Record<string, { en: string; vi: string }> = {
  cookie1:    { en: 'Cookie',     vi: 'Bánh quy tròn' },
  cookie2:    { en: 'Biscuit',    vi: 'Bánh biscuit' },
  croissant:  { en: 'Croissant',  vi: 'Bánh sừng bò' },
  cupcake:    { en: 'Cupcake',    vi: 'Bánh cupcake' },
  donut:      { en: 'Donut',      vi: 'Bánh donut' },
  eclair:     { en: 'Éclair',     vi: 'Bánh eclair' },
  macaroon:   { en: 'Macaroon',   vi: 'Bánh macaroon' },
  pie:        { en: 'Pie',        vi: 'Bánh pie' },
  poptart1:   { en: 'Pop-Tart',   vi: 'Bánh kẹp nướng' },
  poptart2:   { en: 'Wafer',      vi: 'Bánh xốp wafer' },
  starcookie1:{ en: 'Star Cookie',vi: 'Bánh quy ngôi sao' },
  starcookie2:{ en: 'Gingerbread',vi: 'Bánh gừng' },
};

const CANDY_TYPES = Object.keys(CANDY_VOCAB);

// Grid constants (matching original repo)
const COLS = 8;
const ROWS = 8;
const TILE_W = 64;
const TILE_H = 72;
const GAME_W = COLS * TILE_W;       // 512
const GAME_H = ROWS * TILE_H + 80; // 656 (extra for score bar)
const OFFSET_Y = 80; // score bar height

// ─── Score target ─────────────────────────────────────────────────────────
const TARGET_SCORE = 500;
const MOVES_MAX = 25;

export default function CandyCrushPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVES_MAX);
  const [status, setStatus] = useState<'playing' | 'win' | 'lose'>('playing');
  const [targetWord, setTargetWord] = useState<{ key: string; en: string; vi: string } | null>(null);
  const [candyVocab] = useState(CANDY_VOCAB);
  const [toast, setToast] = useState<string | null>(null);
  // expose score/moves/status to Phaser via ref
  const scoreRef = useRef(0);
  const movesRef = useRef(MOVES_MAX);
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const targetRef = useRef<string | null>(null);
  const setScoreRef = useRef(setScore);
  const setMovesRef = useRef(setMoves);
  const setStatusRef = useRef(setStatus);
  const setTargetRef = useRef(setTargetWord);
  const candyVocabRef = useRef(CANDY_VOCAB);
  const getCandyVocab = (key: string) => candyVocabRef.current[key] ?? CANDY_VOCAB[key];
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('phaser').then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      // ─── Phaser Boot scene ─────────────────────────────────────────────
      class BootScene extends Phaser.Scene {
        constructor() { super({ key: 'BootScene' }); }
        preload() {
          // Load all candy sprites
          CANDY_TYPES.forEach(key => {
            this.load.image(key, `/games/candy-crush/${key}.png`);
          });
        }
        create() { this.scene.start('GameScene'); }
      }

      // ─── Phaser Game scene ─────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        private tileGrid!: any[][];
        private firstTile!: any;
        private canMove!: boolean;
        private scoreText!: Phaser.GameObjects.Text;
        private movesText!: Phaser.GameObjects.Text;
        private targetText!: Phaser.GameObjects.Text;
        private currentTarget!: string;

        constructor() { super({ key: 'GameScene' }); }

        create() {
          this.canMove = true;
          this.tileGrid = [];

          // Background gradient
          const bg = this.add.graphics();
          bg.fillGradientStyle(0x1a0533, 0x1a0533, 0x2d1b69, 0x2d1b69, 1);
          bg.fillRect(0, 0, GAME_W, GAME_H);

          // Header bar
          const header = this.add.graphics();
          header.fillGradientStyle(0x7c3aed, 0x7c3aed, 0xdb2777, 0xdb2777, 1);
          header.fillRect(0, 0, GAME_W, OFFSET_Y);

          // Score UI
          this.add.text(12, 8, 'ĐIỂM', {
            fontFamily: 'Arial Black', fontSize: '11px', color: '#fbbf24',
          });
          this.scoreText = this.add.text(12, 26, '0', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
          });

          // Moves UI
          this.add.text(GAME_W / 2 - 30, 8, 'MUC TIEU', {
            fontFamily: 'Arial Black', fontSize: '11px', color: '#fbbf24',
          });
          this.add.text(GAME_W / 2 - 30, 26, `${TARGET_SCORE}pt`, {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff',
          });

          this.add.text(GAME_W - 90, 8, 'BUOC', {
            fontFamily: 'Arial Black', fontSize: '11px', color: '#fbbf24',
          });
          this.movesText = this.add.text(GAME_W - 90, 26, `${MOVES_MAX}`, {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
          });

          // Target word UI - bottom bar
          const bottomBar = this.add.graphics();
          bottomBar.fillStyle(0x0f172a, 0.9);
          bottomBar.fillRect(0, OFFSET_Y + ROWS * TILE_H, GAME_W, 80);

          this.targetText = this.add.text(GAME_W / 2, OFFSET_Y + ROWS * TILE_H + 12, '', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#fbbf24',
            align: 'center',
          }).setOrigin(0.5, 0);

          // Grid separator line
          this.add.graphics().lineStyle(2, 0x7c3aed, 0.3).strokeRect(0, OFFSET_Y, GAME_W, ROWS * TILE_H);

          // Build grid
          for (let row = 0; row < ROWS; row++) {
            this.tileGrid[row] = [];
            for (let col = 0; col < COLS; col++) {
              this.tileGrid[row][col] = this._addTile(col, row);
            }
          }

          // Input
          this.input.on('gameobjectdown', this._tileDown, this);

          // Pick first target word
          this._pickTarget();

          // Check initial matches
          this._checkMatches(false);
        }

        private _pickTarget() {
          const key = CANDY_TYPES[Phaser.Math.RND.between(0, CANDY_TYPES.length - 1)];
          this.currentTarget = key;
          targetRef.current = key;
          const vocab = getCandyVocab(key);
          setTargetRef.current({ key, en: vocab.en, vi: vocab.vi });
          this.targetText.setText(`Match: "${vocab.en}" = ${vocab.vi}`);
        }

        private _addTile(col: number, row: number) {
          const key = CANDY_TYPES[Phaser.Math.RND.between(0, CANDY_TYPES.length - 1)];
          const x = col * TILE_W + TILE_W / 2;
          const y = OFFSET_Y + row * TILE_H + TILE_H / 2;
          const img = this.add.image(x, y, key)
            .setDisplaySize(TILE_W - 4, TILE_H - 4)
            .setInteractive({ useHandCursor: true });
          // Store grid position
          (img as any).gridCol = col;
          (img as any).gridRow = row;
          (img as any).candyKey = key;
          return img;
        }

        private _tileDown(_ptr: any, obj: any): void {
          if (!this.canMove || statusRef.current !== 'playing') return;

          if (!this.firstTile) {
            // First selection — highlight
            this.firstTile = obj;
            this.tweens.add({ targets: obj, scaleX: 0.85, scaleY: 0.85, duration: 100, yoyo: true, repeat: 1 });
          } else {
            const second = obj;
            const dc = Math.abs(this.firstTile.gridCol - second.gridCol);
            const dr = Math.abs(this.firstTile.gridRow - second.gridRow);

            if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
              this.canMove = false;
              this._swap(this.firstTile, second, true);
            } else {
              // Not adjacent — re-select
              this.firstTile = second;
              this.tweens.add({ targets: second, scaleX: 0.85, scaleY: 0.85, duration: 100, yoyo: true, repeat: 1 });
            }
          }
        }

        private _swap(a: any, b: any, checkAfter: boolean) {
          // Swap in grid
          const [ar, ac, br, bc] = [a.gridRow, a.gridCol, b.gridRow, b.gridCol];
          this.tileGrid[ar][ac] = b;
          this.tileGrid[br][bc] = a;
          a.gridRow = br; a.gridCol = bc;
          b.gridRow = ar; b.gridCol = ac;

          const ax = ac * TILE_W + TILE_W / 2;
          const ay = OFFSET_Y + ar * TILE_H + TILE_H / 2;
          const bx = bc * TILE_W + TILE_W / 2;
          const by = OFFSET_Y + br * TILE_H + TILE_H / 2;

          this.tweens.add({ targets: a, x: bx, y: by, duration: 250, ease: 'Back.easeOut' });
          this.tweens.add({
            targets: b, x: ax, y: ay, duration: 250, ease: 'Back.easeOut',
            onComplete: () => {
              if (checkAfter) {
                const matches = this._getMatches();
                if (matches.length > 0) {
                  // Decrement moves
                  const newMoves = movesRef.current - 1;
                  movesRef.current = newMoves;
                  setMovesRef.current(newMoves);
                  this.movesText.setText(`${newMoves}`);
                  this._checkMatches(true);
                } else {
                  // No match — swap back
                  this._swap(b, a, false);
                  this.firstTile = undefined;
                  this.canMove = true;
                }
              } else {
                this.firstTile = undefined;
                this.canMove = true;
              }
            }
          });
        }

        private _checkMatches(countedMove: boolean) {
          const matches = this._getMatches();
          if (matches.length === 0) {
            this.firstTile = undefined;
            this.canMove = true;
            if (movesRef.current <= 0 && scoreRef.current < TARGET_SCORE) {
              statusRef.current = 'lose';
              setStatusRef.current('lose');
            }
            return;
          }

          // Count matching tiles, bonus if they match target word
          let pts = 0;
          const allTiles: Set<any> = new Set();
          for (const group of matches) {
            for (const tile of group) {
              if (!allTiles.has(tile)) {
                allTiles.add(tile);
                pts += tile.candyKey === this.currentTarget ? 30 : 10;
              }
            }
          }

          // Check if target was matched → show toast + new target
          let targetMatched = false;
          for (const tile of allTiles) {
            if (tile.candyKey === this.currentTarget) { targetMatched = true; break; }
          }

          // Score update
          const newScore = scoreRef.current + pts;
          scoreRef.current = newScore;
          setScoreRef.current(newScore);
          this.scoreText.setText(`${newScore}`);

          if (targetMatched) {
            toastRef.current(`+${pts} điểm! "${getCandyVocab(this.currentTarget).en}" đúng rồi!`);
            this._pickTarget();
          }

          // Remove matched tiles with pop animation
          for (const tile of allTiles) {
            const row = tile.gridRow;
            const col = tile.gridCol;
            this.tileGrid[row][col] = undefined;
            this.tweens.add({
              targets: tile,
              scaleX: 0, scaleY: 0,
              angle: 180,
              alpha: 0,
              duration: 300,
              ease: 'Back.easeIn',
              onComplete: () => tile.destroy()
            });
          }

          // After pop anim, fill grid
          this.time.delayedCall(350, () => {
            this._dropTiles();
            this._fillGaps();
            this.time.delayedCall(350, () => {
              this._checkMatches(false);
              // Win check
              if (scoreRef.current >= TARGET_SCORE && statusRef.current === 'playing') {
                statusRef.current = 'win';
                setStatusRef.current('win');
              }
            });
          });
        }

        private _dropTiles() {
          for (let col = 0; col < COLS; col++) {
            for (let row = ROWS - 1; row >= 0; row--) {
              if (this.tileGrid[row][col] === undefined) {
                // Find a tile above to fall down
                for (let above = row - 1; above >= 0; above--) {
                  if (this.tileGrid[above][col] !== undefined) {
                    const tile = this.tileGrid[above][col];
                    this.tileGrid[row][col] = tile;
                    this.tileGrid[above][col] = undefined;
                    tile.gridRow = row;
                    const targetY = OFFSET_Y + row * TILE_H + TILE_H / 2;
                    this.tweens.add({ targets: tile, y: targetY, duration: 200, ease: 'Bounce.easeOut' });
                    break;
                  }
                }
              }
            }
          }
        }

        private _fillGaps() {
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              if (this.tileGrid[row][col] === undefined) {
                const tile = this._addTile(col, row);
                // Animate from above
                const finalY = OFFSET_Y + row * TILE_H + TILE_H / 2;
                tile.y = OFFSET_Y - TILE_H;
                this.tweens.add({ targets: tile, y: finalY, duration: 300, ease: 'Bounce.easeOut' });
                this.tileGrid[row][col] = tile;
              }
            }
          }
        }

        private _getMatches(): any[][] {
          const matches: any[][] = [];

          // Horizontal
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS - 2; col++) {
              const a = this.tileGrid[row][col];
              const b = this.tileGrid[row][col + 1];
              const c = this.tileGrid[row][col + 2];
              if (a && b && c && a.candyKey === b.candyKey && b.candyKey === c.candyKey) {
                const group = [a, b, c];
                if (col + 3 < COLS && this.tileGrid[row][col + 3]?.candyKey === a.candyKey) group.push(this.tileGrid[row][col + 3]);
                if (col + 4 < COLS && this.tileGrid[row][col + 4]?.candyKey === a.candyKey) group.push(this.tileGrid[row][col + 4]);
                matches.push(group);
              }
            }
          }

          // Vertical
          for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS - 2; row++) {
              const a = this.tileGrid[row][col];
              const b = this.tileGrid[row + 1][col];
              const c = this.tileGrid[row + 2][col];
              if (a && b && c && a.candyKey === b.candyKey && b.candyKey === c.candyKey) {
                const group = [a, b, c];
                if (row + 3 < ROWS && this.tileGrid[row + 3]?.[col]?.candyKey === a.candyKey) group.push(this.tileGrid[row + 3][col]);
                matches.push(group);
              }
            }
          }

          return matches;
        }
      }

      // ─── Launch Phaser ─────────────────────────────────────────────────
      const config: any = {
        type: Phaser.AUTO,
        width: GAME_W,
        height: GAME_H,
        backgroundColor: '#1a0533',
        parent: containerRef.current!,
        scene: [BootScene, GameScene],
        render: { pixelArt: false, antialias: true, roundPixels: false },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameRef.current = new Phaser.Game(config);
    });

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const handleReplay = () => {
    scoreRef.current = 0;
    movesRef.current = MOVES_MAX;
    statusRef.current = 'playing';
    setScore(0);
    setMoves(MOVES_MAX);
    setStatus('playing');
    gameRef.current?.destroy(true);
    gameRef.current = null;
    // remount by forcing re-render
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <>
      <Head><title>Candy Word Crush – Engkids</title></Head>
      <main className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950 flex flex-col items-center py-6 px-4">

        {/* Header */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-4">
          <Link href="/games" className="text-purple-400 hover:text-purple-300 font-bold text-sm transition-colors">
            ← Quay lại
          </Link>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-yellow-400 font-black text-xl">{score}</div>
              <div className="text-purple-400 text-xs">Điểm</div>
            </div>
            <div className="text-center">
              <div className="text-white font-black text-xl">{moves}</div>
              <div className="text-purple-400 text-xs">Bước còn</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-black text-xl">{TARGET_SCORE}</div>
              <div className="text-purple-400 text-xs">Mục tiêu</div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-black text-white drop-shadow-lg">Candy Word Crush</h1>
          <p className="text-purple-300 text-sm mt-1">Match 3 bánh giống nhau để học từ vựng!</p>
        </div>

        {/* Target word indicator */}
        {targetWord && status === 'playing' && (
          <div className="w-full max-w-2xl mb-3">
            <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-2xl px-4 py-2 text-center">
              <span className="text-yellow-300 font-bold text-sm">Nhiệm vụ: Match </span>
              <span className="text-white font-black text-lg">&quot;{targetWord.en}&quot;</span>
              <span className="text-yellow-300 font-bold text-sm"> = {targetWord.vi} → +30 điểm!</span>
            </div>
          </div>
        )}

        {/* Game canvas */}
        <div className="relative w-full max-w-2xl">
          <div
            ref={containerRef}
            className="w-full rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(124,58,237,0.5)] border-2 border-purple-700"
            style={{ aspectRatio: `${GAME_W}/${GAME_H}` }}
          />

          {/* Win overlay */}
          {status === 'win' && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center gap-4 z-10">
              <div className="text-4xl font-black text-yellow-400 animate-bounce">WIN</div>
              <h2 className="text-4xl font-black text-yellow-400 drop-shadow-lg">THẮNG RỒI!</h2>
              <p className="text-white text-lg">Điểm của bạn: <span className="text-yellow-400 font-black">{score}</span></p>
              <button
                onClick={handleReplay}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-lg px-8 py-3 rounded-full hover:scale-105 transition-transform shadow-lg"
              >
                Chơi lại
              </button>
            </div>
          )}

          {/* Lose overlay */}
          {status === 'lose' && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center gap-4 z-10">
              <div className="text-4xl font-black text-red-400">LOSE</div>
              <h2 className="text-4xl font-black text-red-400 drop-shadow-lg">THUA RỒI!</h2>
              <p className="text-white text-lg">Điểm của bạn: <span className="text-orange-400 font-black">{score}</span> / {TARGET_SCORE}</p>
              <button
                onClick={handleReplay}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg px-8 py-3 rounded-full hover:scale-105 transition-transform shadow-lg"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Toast notification */}
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white font-black px-6 py-2 rounded-full shadow-xl z-20 animate-bounce text-sm whitespace-nowrap">
              {toast}
            </div>
          )}
        </div>

        {/* Vocabulary legend */}
        <div className="w-full max-w-2xl mt-5">
          <p className="text-purple-400 text-xs font-bold mb-2 text-center">Bảng từ vựng bánh ngọt:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {CANDY_TYPES.map(key => (
              <div
                key={key}
                className={`flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border ${targetWord?.key === key ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10'}`}
              >
                <Image src={`/games/candy-crush/${key}.png`} alt={key} width={28} height={28} className="w-7 h-7 object-contain" />
                <div>
                  <div className="text-white text-[10px] font-bold leading-tight">{candyVocab[key].en}</div>
                  <div className="text-purple-400 text-[9px] leading-tight">{candyVocab[key].vi}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-purple-700/50 text-xs mt-4 text-center">
          Clone tu: digitsensitive/phaser3-typescript (candy-crush) - Da sua cho Engkids
        </p>
      </main>
    </>
  );
}
