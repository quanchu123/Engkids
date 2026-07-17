'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { DEFAULT_WORD_BANK, loadWordBank, toCoinQuestions } from '@/lib/word-bank';

// ─── Adapted from: digitsensitive/phaser3-typescript (coin-runner) ────────────
// Background + coin sprites from real GitHub repo (768x576 landscape scene)
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
  vi: string;           // Vietnamese shown at top
  choices: string[];    // 4 English words on coins
  correct: number;      // index of correct choice
}

const ALL_QUESTIONS: Question[] = [
  { vi: 'Quả táo', choices: ['Apple', 'Orange', 'Banana', 'Grape'], correct: 0 },
  { vi: 'Mặt trời', choices: ['Moon', 'Sun', 'Star', 'Cloud'], correct: 1 },
  { vi: 'Con mèo', choices: ['Dog', 'Bird', 'Cat', 'Fish'], correct: 2 },
  { vi: 'Quyển sách', choices: ['Pencil', 'Table', 'Chair', 'Book'], correct: 3 },
  { vi: 'Quả cam', choices: ['Orange', 'Mango', 'Apple', 'Lemon'], correct: 0 },
  { vi: 'Chạy', choices: ['Sleep', 'Run', 'Jump', 'Swim'], correct: 1 },
  { vi: 'Trường học', choices: ['Hospital', 'Hotel', 'School', 'Market'], correct: 2 },
  { vi: 'Bạn bè', choices: ['Enemy', 'Teacher', 'Parent', 'Friend'], correct: 3 },
  { vi: 'Màu đỏ', choices: ['Red', 'Blue', 'Green', 'Yellow'], correct: 0 },
  { vi: 'Vui vẻ', choices: ['Sad', 'Happy', 'Angry', 'Tired'], correct: 1 },
  { vi: 'To lớn', choices: ['Thin', 'Short', 'Big', 'Long'], correct: 2 },
  { vi: 'Con chim', choices: ['Cat', 'Fish', 'Dog', 'Bird'], correct: 3 },
  { vi: 'Nước', choices: ['Water', 'Fire', 'Earth', 'Wind'], correct: 0 },
  { vi: 'Bơi lội', choices: ['Fly', 'Swim', 'Walk', 'Run'], correct: 1 },
  { vi: 'Nhỏ bé', choices: ['Tall', 'Fat', 'Small', 'Dark'], correct: 2 },
  { vi: 'Con thỏ', choices: ['Tiger', 'Bear', 'Elephant', 'Rabbit'], correct: 3 },
  { vi: 'Màu xanh lá', choices: ['Green', 'Purple', 'Brown', 'White'], correct: 0 },
  { vi: 'Nhảy', choices: ['Sit', 'Jump', 'Dance', 'Clap'], correct: 1 },
  { vi: 'Lạnh', choices: ['Warm', 'Hot', 'Cold', 'Wet'], correct: 2 },
  { vi: 'Bông hoa', choices: ['Leaf', 'Root', 'Branch', 'Flower'], correct: 3 },
  { vi: 'Ăn', choices: ['Eat', 'Sleep', 'Drink', 'Read'], correct: 0 },
  { vi: 'Màu vàng', choices: ['Red', 'Yellow', 'Pink', 'Grey'], correct: 1 },
  { vi: 'Nóng', choices: ['Cold', 'Warm', 'Hot', 'Cool'], correct: 2 },
  { vi: 'Sữa', choices: ['Juice', 'Tea', 'Water', 'Milk'], correct: 3 },
  { vi: 'Ngôi nhà', choices: ['House', 'Street', 'Forest', 'River'], correct: 0 },
  { vi: 'Bay', choices: ['Swim', 'Fly', 'Drive', 'Walk'], correct: 1 },
  { vi: 'Tốt giỏi', choices: ['Bad', 'Wrong', 'Good', 'Hard'], correct: 2 },
  { vi: 'Con cá', choices: ['Bird', 'Cat', 'Dog', 'Fish'], correct: 3 },
  { vi: 'Đọc', choices: ['Read', 'Write', 'Listen', 'Speak'], correct: 0 },
  { vi: 'Cao', choices: ['Short', 'Tall', 'Thin', 'Wide'], correct: 1 },
];

export default function WordCollectorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<Question[]>(toCoinQuestions(DEFAULT_WORD_BANK, 30));

  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) questionsRef.current = toCoinQuestions(bank, 30);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let game: any = null;
    let cancelled = false;

    (async () => {
      const Phaser = ((await import('phaser')) as any).default;
      if (cancelled) return;

      const W = 768, H = 480;
      const COIN_COUNT = 4;

      // ══════════════════════════════════════
      //  PRELOADER
      // ══════════════════════════════════════
      class PreloaderScene extends Phaser.Scene {
        constructor() { super({ key: 'Preload' }); }

        preload() {
          this.cameras.main.setBackgroundColor('#3A99D9');

          // Progress bar
          const bar = this.add.graphics();
          const bg  = this.add.graphics();
          bg.fillStyle(0x000000, 0.4);
          bg.fillRoundedRect(W / 2 - 160, H / 2 - 10, 320, 20, 10);
          this.load.on('progress', (v: number) => {
            bar.clear();
            bar.fillStyle(0xfbbf24);
            bar.fillRoundedRect(W / 2 - 158, H / 2 - 8, 316 * v, 16, 8);
          });
          this.add.text(W / 2, H / 2 - 35, 'Word Collector', {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
          }).setOrigin(0.5);

          // Real assets from coin-runner GitHub repo
          this.load.image('background', '/games/word-collector/background.png');
          this.load.image('coin',       '/games/word-collector/coin.png');
        }

        create() { this.scene.start('Game'); }
      }

      // ══════════════════════════════════════
      //  GAME SCENE
      // ══════════════════════════════════════
      class GameScene extends Phaser.Scene {
        constructor() { super({ key: 'Game' }); }

        create() {
          // ── Init state ────────────────────
          const self = this as any;
          const sourceQuestions = questionsRef.current.length >= COIN_COUNT ? questionsRef.current : ALL_QUESTIONS;
          self.qs       = [...sourceQuestions].sort(() => Math.random() - 0.5);
          self.qi       = 0;
          self.score    = 0;
          self.hp       = 3;
          self.busy     = false;
          self.coinObjs = [];
          self.tweens_  = [];

          // ── Background ────────────────────
          // Using real 768x576 landscape background from digitsensitive/phaser3-typescript
          const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
          // Crop to fit 768x480 (it's 768x576 so just show top portion)
          bg.setCrop(0, 0, 768, 480);

          // Semi-transparent overlay so cards are readable
          this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.22);

          // ── Top question bar ──────────────
          const topBar = this.add.graphics();
          topBar.fillStyle(0x1e1b4b, 0.88);
          topBar.fillRoundedRect(W / 2 - 300, 10, 600, 54, 16);

          self.questionText = this.add.text(W / 2, 37, '', {
            fontSize: '20px', color: '#fbbf24', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(5);

          // ── Hearts ──────────────────────
          self.heartTexts = [];
          for (let i = 0; i < 3; i++) {
            const h = this.add.text(680 + i * 26, 14, '?', {
              fontSize: '18px',
            }).setDepth(5);
            self.heartTexts.push(h);
          }

          // ── Score text ────────────────────
          self.scoreText = this.add.text(12, 14, 'Score: 0', {
            fontSize: '15px', color: '#4ade80', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
          }).setDepth(5);

          // ── Progress bar ──────────────────
          const totalQ = Math.min(self.qs.length, 20);
          const progBg = this.add.graphics();
          progBg.fillStyle(0x000000, 0.4);
          progBg.fillRoundedRect(W / 2 - 130, H - 16, 260, 8, 4);
          self.progBar = this.add.graphics();
          self.totalQ  = totalQ;

          // ── Floating coins ────────────────
          for (let i = 0; i < COIN_COUNT; i++) {
            // coin image (real 56x56 coin from coin-runner)
            const cx = 150 + (i % 2) * 450;
            const cy = 160 + Math.floor(i / 2) * 180;

            const coinImg = this.add.image(cx, cy, 'coin').setScale(1.2).setDepth(3);
            // Rotate coin
            this.tweens.add({
              targets: coinImg,
              angle: 360, duration: 1800 + i * 220,
              repeat: -1, ease: 'Linear',
            });
            // Bob up/down
            this.tweens.add({
              targets: coinImg,
              y: { from: cy - 8, to: cy + 8 },
              duration: 900 + i * 100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });

            // Word text ON the coin
            const wordTxt = this.add.text(cx, cy, '', {
              fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 3,
              wordWrap: { width: 80 }, align: 'center',
            }).setOrigin(0.5).setDepth(4);

            // Invisible hit zone on top
            const zone = this.add.zone(cx, cy, 80, 80).setInteractive({ useHandCursor: true });
            zone.setDepth(6);

            const idx = i;
            zone.on('pointerover', () => { if (!self.busy) coinImg.setScale(1.35); });
            zone.on('pointerout',  () => { coinImg.setScale(1.2); });
            zone.on('pointerdown', () => { if (!self.busy) this._pick(idx); });

            self.coinObjs.push({ img: coinImg, txt: wordTxt, zone, baseX: cx, baseY: cy });
          }

          // ── Status popup text ─────────────
          self.popup = this.add.text(W / 2, H / 2 - 10, '', {
            fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 5,
          }).setOrigin(0.5).setDepth(10).setAlpha(0);

          this._loadQuestion();
        }

        // ─────────────────────────────────────
        _loadQuestion() {
          const self = this as any;
          if (self.qi >= Math.min(self.qs.length, self.totalQ)) {
            this._endGame(true);
            return;
          }

          const q   = self.qs[self.qi];
          self._curQ = q;

          // Update question bar
          self.questionText.setText(`Từ tiếng Anh nào có nghĩa là "${q.vi}"?`);

          // Update progress bar
          const pct = self.qi / self.totalQ;
          self.progBar.clear();
          self.progBar.fillStyle(0x4ade80);
          self.progBar.fillRoundedRect(W / 2 - 130, H - 16, 260 * pct, 8, 4);

          // Assign words to coins (shuffle so correct isn't always in same slot)
          const shuffle = [...q.choices];
          // Rearrange: correct should still be at index q.correct within shuffle
          // Just set text directly (order same as choices array)
          for (let i = 0; i < COIN_COUNT; i++) {
            const { img, txt, zone, baseX, baseY } = self.coinObjs[i];
            txt.setText(q.choices[i]);
            txt.setPosition(baseX, baseY);
            img.setTint(0xffffff).setAlpha(1).setScale(1.2);
            zone.setActive(true).setVisible(true);
          }

          self.busy = false;
        }

        // ─────────────────────────────────────
        _pick(idx: number) {
          const self = this as any;
          if (self.busy || !self._curQ) return;
          self.busy = true;

          const correct = idx === self._curQ.correct;
          const { img, txt, baseX, baseY } = self.coinObjs[idx];

          if (correct) {
            // Correct flash + fly to score
            img.setTint(0xffd700);
            this._popup('Dung!', '#4ade80');
            self.score++;
            self.scoreText.setText(`Score: ${self.score}`);
            this._coinCollect(idx, () => {
              self.qi++;
              this._loadQuestion();
            });
          } else {
            // Wrong — flash red, shake
            img.setTint(0xff3333);
            this._popup('Sai!', '#f87171');
            this.cameras.main.shake(200, 0.007);

            self.hp = Math.max(0, self.hp - 1);
            self.heartTexts.forEach((h: any, i: number) => {
              h.setText(i < self.hp ? '?' : '?');
            });

            // Show correct briefly
            self.coinObjs[self._curQ.correct].img.setTint(0x4ade80);

            this.time.delayedCall(900, () => {
              if (self.hp <= 0) {
                this._endGame(false);
              } else {
                self.qi++;
                this._loadQuestion();
              }
            });
          }
        }

        _coinCollect(idx: number, cb: () => void) {
          const { img, txt, baseX, baseY } = (this as any).coinObjs[idx];
          // Fly up and scale up
          this.tweens.add({
            targets: [img, txt],
            y: '-=80', scaleX: 2, scaleY: 2, alpha: 0,
            duration: 500, ease: 'Power2',
            onComplete: () => {
              // Reset
              img.setAlpha(1).setScale(1.2).setTint(0xffffff).setY(baseY);
              txt.setAlpha(1).setY(baseY);
              cb();
            },
          });
        }

        _popup(msg: string, color: string) {
          const p = (this as any).popup;
          p.setText(msg).setColor(color).setAlpha(1);
          this.tweens.add({ targets: p, alpha: 0, delay: 600, duration: 300 });
        }

        // ─────────────────────────────────────
        _endGame(win: boolean) {
          const self = this as any;
          self.busy = true;

          this.time.delayedCall(300, () => {
            // Overlay
            this.add.rectangle(W / 2, H / 2, W, H, win ? 0x0a1128 : 0x1a0505, 0.86).setDepth(20);

            const title = win ? 'XUẤT SẮC!' : 'THUA RỒI!';
            const color = win ? '#fbbf24' : '#f87171';
            this.add.text(W / 2, H / 2 - 80, title, {
              fontSize: '36px', color, fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 6,
            }).setOrigin(0.5).setDepth(21);

            this.add.text(W / 2, H / 2 - 30, `Điểm của bạn: ${self.score} / ${self.totalQ}`, {
              fontSize: '18px', color: '#e2e8f0',
            }).setOrigin(0.5).setDepth(21);

            if (!win) {
              this.add.text(W / 2, H / 2 + 0, 'Cố lên! Luyện từ vựng thêm nhé', {
                fontSize: '14px', color: '#94a3b8',
              }).setOrigin(0.5).setDepth(21);
            }

            // Replay button
            const btn = this.add.rectangle(W / 2, H / 2 + 55, 200, 44, win ? 0x7c3aed : 0xdc2626)
              .setInteractive({ useHandCursor: true }).setDepth(21);
            this.add.text(W / 2, H / 2 + 55, 'Chơi Lại', {
              fontSize: '16px', color: '#fff', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(22);
            btn.on('pointerover', () => btn.setFillStyle(win ? 0x9333ea : 0xef4444));
            btn.on('pointerout',  () => btn.setFillStyle(win ? 0x7c3aed : 0xdc2626));
            btn.on('pointerdown', () => this.scene.restart());
          });
        }
      }

      // ══════════════════════════════════════
      //  LAUNCH
      // ══════════════════════════════════════
      game = new Phaser.Game({
        type: Phaser.CANVAS,
        backgroundColor: '#3A99D9',
        parent: containerRef.current!,
        render: { pixelArt: false, antialias: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: W,
          height: H,
        },
        scene: [PreloaderScene, GameScene],
      });
    })();

    return () => {
      cancelled = true;
      if (game) { game.destroy(true); game = null; }
    };
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#1a2744] flex flex-col items-center pb-8">
        <div className="w-full max-w-3xl px-4 pt-4">
          <Link href="/games" className="text-yellow-400 hover:text-yellow-300 font-bold text-sm transition-colors">
            Quay lại
          </Link>
        </div>

        <div className="text-center my-4">
          <h1 className="text-2xl font-black text-white drop-shadow-lg">Word Collector</h1>
          <p className="text-yellow-300 text-sm mt-1">Chạm vào đồng xu có nghĩa tiếng Anh đúng!</p>
        </div>

        <p className="text-yellow-600/70 text-xs mb-3">Đọc câu hỏi ở trên cùng rồi chạm vào từ đúng</p>

        <div
          ref={containerRef}
          className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.25)] border-2 border-yellow-700"
          style={{ aspectRatio: '768/480' }}
        />

      </main>
    </>
  );
}
