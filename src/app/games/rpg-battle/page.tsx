'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';

// ─────────────────────────────────────────────
//  VOCABULARY QUESTION DATA  (module-level)
// ─────────────────────────────────────────────
interface Question {
  q: string;
  choices: string[];
  correct: number;
}

const ALL_QUESTIONS: Question[] = [
  { q: '"apple" nghĩa là gì?',    choices: ['Quả táo',   'Quả cam',    'Quả nho',    'Quả lê'],      correct: 0 },
  { q: '"book" nghĩa là gì?',     choices: ['Bút chì',   'Quyển sách', 'Cái bàn',    'Cái ghế'],     correct: 1 },
  { q: '"run" nghĩa là gì?',      choices: ['Bay',       'Bơi',        'Chạy',       'Nhảy'],         correct: 2 },
  { q: '"cat" nghĩa là gì?',      choices: ['Con chó',   'Con cá',     'Con bướm',   'Con mèo'],      correct: 3 },
  { q: '"sun" nghĩa là gì?',      choices: ['Mặt trời',  'Mưa',        'Mây',        'Gió'],          correct: 0 },
  { q: '"school" nghĩa là gì?',   choices: ['Bệnh viện', 'Trường học', 'Cửa hàng',  'Ngân hàng'],    correct: 1 },
  { q: '"eat" nghĩa là gì?',      choices: ['Ngủ',       'Uống',       'Ăn',         'Đọc'],          correct: 2 },
  { q: '"dog" nghĩa là gì?',      choices: ['Con thỏ',   'Con mèo',    'Con cừu',    'Con chó'],      correct: 3 },
  { q: '"water" nghĩa là gì?',    choices: ['Nước',      'Lửa',        'Đất',        'Gió'],          correct: 0 },
  { q: '"happy" nghĩa là gì?',    choices: ['Buồn',      'Vui vẻ',     'Tức giận',   'Sợ hãi'],      correct: 1 },
  { q: '"big" nghĩa là gì?',      choices: ['Nhỏ',       'Dài',        'To lớn',     'Tròn'],         correct: 2 },
  { q: '"bird" nghĩa là gì?',     choices: ['Con cá',    'Con rắn',    'Con kiến',   'Con chim'],     correct: 3 },
  { q: '"red" nghĩa là gì?',      choices: ['Màu đỏ',   'Màu xanh',   'Màu vàng',   'Màu tím'],      correct: 0 },
  { q: '"sleep" nghĩa là gì?',    choices: ['Ăn uống',   'Ngủ',        'Chơi',       'Học'],          correct: 1 },
  { q: '"small" nghĩa là gì?',    choices: ['Cao lớn',   'Dài',        'Nhỏ bé',     'Béo'],          correct: 2 },
  { q: '"fish" nghĩa là gì?',     choices: ['Con bướm',  'Con chim',   'Con chuột',  'Con cá'],       correct: 3 },
  { q: '"yellow" nghĩa là gì?',   choices: ['Màu vàng', 'Màu xanh',   'Màu trắng',  'Màu đen'],      correct: 0 },
  { q: '"play" nghĩa là gì?',     choices: ['Học bài',   'Chơi đùa',   'Đọc sách',   'Viết bài'],    correct: 1 },
  { q: '"hot" nghĩa là gì?',      choices: ['Lạnh',      'Ẩm ướt',     'Nóng',       'Gió'],          correct: 2 },
  { q: '"tree" nghĩa là gì?',     choices: ['Cây hoa',   'Cỏ xanh',   'Lá cây',     'Cái cây'],      correct: 3 },
  { q: '"house" nghĩa là gì?',    choices: ['Ngôi nhà',  'Xe đạp',     'Con đường',  'Khu rừng'],     correct: 0 },
  { q: '"jump" nghĩa là gì?',     choices: ['Ngã',       'Nhảy',       'Chạy',       'Đi'],           correct: 1 },
  { q: '"cold" nghĩa là gì?',     choices: ['Nóng',      'Ấm',         'Lạnh',       'Đẹp'],          correct: 2 },
  { q: '"rabbit" nghĩa là gì?',   choices: ['Con hổ',    'Con gấu',    'Con voi',    'Con thỏ'],      correct: 3 },
  { q: '"blue" nghĩa là gì?',     choices: ['Màu xanh',  'Màu đỏ',    'Màu hồng',   'Màu cam'],      correct: 0 },
  { q: '"swim" nghĩa là gì?',     choices: ['Chạy',      'Bơi lội',    'Leo trèo',   'Nhảy'],         correct: 1 },
  { q: '"good" nghĩa là gì?',     choices: ['Xấu',       'Khó',        'Tốt giỏi',   'Sai'],          correct: 2 },
  { q: '"flower" nghĩa là gì?',   choices: ['Cỏ xanh',   'Lá cây',    'Cội cây',    'Bông hoa'],     correct: 3 },
  { q: '"black" nghĩa là gì?',    choices: ['Màu đen',   'Màu trắng', 'Màu nâu',    'Màu xám'],      correct: 0 },
  { q: '"fly" nghĩa là gì?',      choices: ['Bơi',       'Bay',        'Chạy',       'Ngủ'],          correct: 1 },
  { q: '"green" nghĩa là gì?',    choices: ['Màu vàng',  'Màu tím',   'Màu xanh lá','Màu trắng'],    correct: 2 },
  { q: '"milk" nghĩa là gì?',     choices: ['Nước lọc',  'Nước cam',  'Trà',        'Sữa'],          correct: 3 },
  { q: '"friend" nghĩa là gì?',   choices: ['Bạn bè',    'Kẻ thù',    'Thầy giáo',  'Gia đình'],     correct: 0 },
  { q: '"read" nghĩa là gì?',     choices: ['Viết',      'Đọc',        'Nghe',       'Nói'],          correct: 1 },
  { q: '"tall" nghĩa là gì?',     choices: ['Thấp',      'Béo',        'Cao',        'Gầy'],          correct: 2 },
];

// ─────────────────────────────────────────────
//  ENEMY WAVE CONFIG  (module-level)
// ─────────────────────────────────────────────
const WAVES = [
  { name: 'Mole Nhỏ',   sprite: 'mole',   anim: 'mole-walk-anim',   maxHp: 50  },
  { name: 'Mole Lớn',   sprite: 'mole',   anim: 'mole-walk-anim',   maxHp: 60  },
  { name: 'Treant Non', sprite: 'treant', anim: 'treant-walk-anim', maxHp: 70  },
  { name: 'Treant Già', sprite: 'treant', anim: 'treant-walk-anim', maxHp: 80  },
  { name: 'TRUM',    sprite: 'treant', anim: 'treant-walk-anim', maxHp: 100 },
];

// ─────────────────────────────────────────────
//  PAGE COMPONENT
// ─────────────────────────────────────────────
export default function RpgBattlePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: any = null;
    let cancelled = false;

    (async () => {
      // Dynamically import Phaser (client-only, avoids SSR issues)
      const Phaser = ((await import('phaser')) as any).default;

      if (cancelled) return;

      // ══════════════════════════════════════
      //  PRELOADER SCENE
      // ══════════════════════════════════════
      class PreloaderScene extends Phaser.Scene {
        constructor() { super({ key: 'Preloader' }); }

        preload() {
          this.cameras.main.setBackgroundColor('#0f0c2a');

          // Loading UI
          this.add.text(240, 140, 'Word Battle RPG', {
            fontSize: '18px', color: '#c084fc', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5);
          this.add.text(240, 166, 'Đang tải tài nguyên...', {
            fontSize: '12px', color: '#a78bfa',
          }).setOrigin(0.5);

          const bgBar = this.add.graphics();
          bgBar.fillStyle(0x1e1b4b);
          bgBar.fillRoundedRect(90, 186, 300, 12, 6);
          const bar = this.add.graphics();
          this.load.on('progress', (v: number) => {
            bar.clear();
            bar.fillStyle(0x9333ea);
            bar.fillRoundedRect(93, 189, 294 * v, 6, 3);
          });

          // Sprites — correct frame dimensions from original repo
          const base = '/games/rpg-battle/spritesheets';
          this.load.spritesheet('hero-walk',   `${base}/hero/walk/hero-walk-front.png`,   { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('hero-attack', `${base}/hero/attack/hero-attack-front.png`, { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('mole-walk',   `${base}/mole/walk/mole-walk-front.png`,   { frameWidth: 24, frameHeight: 24 });
          this.load.spritesheet('treant-walk', `${base}/treant/walk/treant-walk-front.png`, { frameWidth: 31, frameHeight: 35 });
          this.load.spritesheet('death',       `${base}/misc/enemy-death.png`,             { frameWidth: 30, frameHeight: 32 });
        }

        create() {
          const anim = (key: string, tex: string, s: number, e: number, fps: number, rep: number) => {
            this.anims.create({
              key, frameRate: fps, repeat: rep,
              frames: this.anims.generateFrameNumbers(tex, { start: s, end: e }),
            });
          };
          anim('hero-walk-anim',   'hero-walk',   0, 2, 8,  -1);  // 3 frames (0-2)
          anim('hero-attack-anim', 'hero-attack', 0, 2, 10,  0);  // 3 frames (0-2)
          anim('mole-walk-anim',   'mole-walk',   0, 3, 7,  -1);  // 4 frames (0-3)
          anim('treant-walk-anim', 'treant-walk', 0, 3, 7,  -1);  // 4 frames (0-3)
          anim('death-anim',       'death',       0, 6, 15,  0);  // 7 frames (0-6)

          this.scene.start('Battle');
        }
      }

      // ══════════════════════════════════════
      //  BATTLE SCENE
      // ══════════════════════════════════════
      class BattleScene extends Phaser.Scene {
        constructor() { super({ key: 'Battle' }); }

        create() {
          // ── State ──────────────────
          (this as any).heroHp     = 100;
          (this as any).heroMaxHp  = 100;
          (this as any).wave       = 0;
          (this as any).busy       = false;  // blocks input during animations
          // Shuffle questions
          (this as any).qs = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
          (this as any).qi = 0;

          this._buildUI();
          this._loadWave(0);
          this._showQuestion();
        }

        // ────────────────────────────────────
        _buildUI() {
          const W = 480, H = 340;
          const self = this as any;

          // ── Background ──────────────────
          const bg = this.add.graphics();
          bg.fillStyle(0x0c0a23);
          bg.fillRect(0, 0, W, H);

          // Battle area gradient bars
          bg.fillStyle(0x1a0a3e, 0.6);
          bg.fillRect(0, 0, W, 55);
          bg.fillStyle(0x160932, 0.4);
          bg.fillRect(0, 55, W, 140);

          // Ground shadow
          bg.fillStyle(0x2d1b69, 0.8);
          bg.fillRect(0, 175, W, 16);

          // Hero platform shadow
          bg.fillStyle(0x4c1d95, 0.35);
          bg.fillEllipse(110, 180, 88, 14);

          // Enemy platform shadow
          bg.fillStyle(0x7f1d1d, 0.35);
          bg.fillEllipse(370, 180, 88, 14);

          // ── HP bar tracks ──────────────
          const tracks = this.add.graphics();
          tracks.fillStyle(0x1e1b4b);
          tracks.fillRoundedRect(8,  22, 162, 10, 5);   // hero
          tracks.fillRoundedRect(310, 22, 162, 10, 5);  // enemy

          // ── HP bars (dynamic) ──────────
          self.heroHpBar  = this.add.graphics();
          self.enemyHpBar = this.add.graphics();

          // ── Labels ─────────────────────
          this.add.text(8, 8, 'Anh Hung', {
            fontSize: '11px', color: '#a78bfa', fontStyle: 'bold',
          });
          self.heroHpText = this.add.text(8, 35, 'HP: 100/100', {
            fontSize: '9px', color: '#6ee7b7',
          });

          self.enemyNameText = this.add.text(472, 8, '...', {
            fontSize: '11px', color: '#fca5a5', fontStyle: 'bold',
          }).setOrigin(1, 0);
          self.enemyHpText = this.add.text(472, 35, 'HP: -/-', {
            fontSize: '9px', color: '#fca5a5',
          }).setOrigin(1, 0);

          self.waveText = this.add.text(W / 2, 10, 'WAVE 1/5', {
            fontSize: '10px', color: '#fbbf24', fontStyle: 'bold',
          }).setOrigin(0.5, 0);

          // ── Sprites ────────────────────
          self.heroSprite = this.add.sprite(110, 130, 'hero-walk').setScale(3);
          self.heroSprite.play('hero-walk-anim');
          this.tweens.add({
            targets: self.heroSprite,
            y: { from: 130, to: 125 },
            duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });

          self.enemySprite = this.add.sprite(370, 130, 'mole-walk').setScale(3).setFlipX(true);
          self.enemySprite.play('mole-walk-anim');
          this.tweens.add({
            targets: self.enemySprite,
            y: { from: 130, to: 124 },
            duration: 720, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 250,
          });

          // ── Question panel ─────────────
          const panel = this.add.graphics();
          panel.fillStyle(0x0f172a, 0.96);
          panel.fillRect(0, 192, W, 148);
          panel.lineStyle(2, 0x4c1d95, 1);
          panel.strokeRect(0, 192, W, 148);
          // Panel header line
          panel.lineStyle(1, 0x7c3aed, 0.5);
          panel.strokeRect(4, 196, W - 8, 36);

          self.questionText = this.add.text(W / 2, 213, '', {
            fontSize: '13px', color: '#e2e8f0',
            wordWrap: { width: W - 24 }, align: 'center',
          }).setOrigin(0.5, 0.5);

          // ── Answer buttons (2×2 grid) ───
          const btnColors  = [0x1e3a8a, 0x064e3b, 0x7c2d12, 0x4a1d96];
          const btnXs      = [120, 360, 120, 360];
          const btnYs      = [255, 255, 295, 295];
          const labels     = ['A', 'B', 'C', 'D'];

          self.buttons   = [];
          self.btnTexts  = [];

          for (let i = 0; i < 4; i++) {
            const btn = this.add.rectangle(btnXs[i], btnYs[i], 210, 30, btnColors[i])
              .setInteractive({ useHandCursor: true });

            this.add.text(btnXs[i] - 98, btnYs[i], labels[i] + ')', {
              fontSize: '11px', color: '#94a3b8',
            }).setOrigin(0, 0.5);

            const txt = this.add.text(btnXs[i] - 78, btnYs[i], '', {
              fontSize: '12px', color: '#f1f5f9', wordWrap: { width: 160 },
            }).setOrigin(0, 0.5);

            const idx = i;
            btn.on('pointerover', () => { if (!(this as any).busy) btn.setScale(1.04); });
            btn.on('pointerout',  () => { btn.setScale(1); });
            btn.on('pointerdown', () => { if (!(this as any).busy) this._answer(idx); });

            self.buttons.push(btn);
            self.btnTexts.push(txt);
          }

          // ── Status overlay text ─────────
          self.statusText = this.add.text(W / 2, 170, '', {
            fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(10).setAlpha(0);

          this._redrawHeroBars();
        }

        // ────────────────────────────────────
        _loadWave(idx: number) {
          const self = this as any;
          const wave = WAVES[idx];
          self.enemyMaxHp  = wave.maxHp;
          self.enemyHp     = wave.maxHp;
          self.wave        = idx;

          self.enemyNameText.setText(wave.name);
          self.waveText.setText(`WAVE ${idx + 1}/5`);

          self.enemySprite
            .setTexture(wave.sprite + '-walk')
            .setFlipX(true)
            .setAlpha(1)
            .clearTint();
          self.enemySprite.play(wave.anim);

          this._redrawEnemyBars();
        }

        // ────────────────────────────────────
        _redrawHeroBars() {
          const self = this as any;
          const pct   = Math.max(0, self.heroHp / self.heroMaxHp);
          const color = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
          self.heroHpBar.clear();
          self.heroHpBar.fillStyle(color);
          self.heroHpBar.fillRoundedRect(8, 22, 162 * pct, 10, 5);
          self.heroHpText.setText(`HP: ${self.heroHp}/${self.heroMaxHp}`);
        }

        _redrawEnemyBars() {
          const self = this as any;
          const pct   = Math.max(0, self.enemyHp / self.enemyMaxHp);
          const color = pct > 0.5 ? 0xf87171 : pct > 0.25 ? 0xfbbf24 : 0xff2222;
          self.enemyHpBar.clear();
          self.enemyHpBar.fillStyle(color);
          self.enemyHpBar.fillRoundedRect(310, 22, 162 * pct, 10, 5);
          self.enemyHpText.setText(`HP: ${self.enemyHp}/${self.enemyMaxHp}`);
        }

        // ────────────────────────────────────
        _showQuestion() {
          const self = this as any;
          if (self.qi >= self.qs.length) {
            self.qs = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
            self.qi = 0;
          }
          const q = self.qs[self.qi++];
          self._curQ = q;

          self.questionText.setText(q.q);

          const btnColors = [0x1e3a8a, 0x064e3b, 0x7c2d12, 0x4a1d96];
          for (let i = 0; i < 4; i++) {
            self.btnTexts[i].setText(q.choices[i]);
            self.buttons[i].setFillStyle(btnColors[i]).setScale(1);
          }
        }

        // ────────────────────────────────────
        _answer(idx: number) {
          const self = this as any;
          if (self.busy || !self._curQ) return;
          self.busy = true;

          const correct = idx === self._curQ.correct;
          if (correct) {
            self.buttons[idx].setFillStyle(0x16a34a);
            this._flash('Đúng rồi!', '#4ade80');
            this._heroAttacks();
          } else {
            self.buttons[idx].setFillStyle(0xdc2626);
            self.buttons[self._curQ.correct].setFillStyle(0x16a34a);
            this._flash('Sai rồi!', '#f87171');
            this._enemyAttacks();
          }
        }

        _flash(msg: string, color: string) {
          const st = (this as any).statusText;
          st.setText(msg).setColor(color).setAlpha(1);
          this.tweens.add({ targets: st, alpha: 0, delay: 700, duration: 350 });
        }

        _dmgNumber(x: number, y: number, dmg: number, isHero: boolean) {
          const t = this.add.text(x, y, `-${dmg}`, {
            fontSize: '20px',
            color: isHero ? '#fbbf24' : '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
          }).setOrigin(0.5).setDepth(20);

          this.tweens.add({
            targets: t, y: y - 45, alpha: 0, duration: 800,
            ease: 'Power1', onComplete: () => t.destroy(),
          });
        }

        // ────────────────────────────────────
        _heroAttacks() {
          const self   = this as any;
          const heroX  = 110;
          const dmg    = 20 + Math.floor(Math.random() * 11);  // 20–30

          this.tweens.killTweensOf(self.heroSprite);
          self.heroSprite.play('hero-attack-anim');

          // Lunge forward
          this.tweens.add({
            targets: self.heroSprite,
            x: 270, duration: 190, ease: 'Power2',
            onComplete: () => {
              // Impact
              this.cameras.main.shake(90, 0.006);
              self.enemySprite.setTint(0xff3333);
              this.time.delayedCall(110, () => self.enemySprite.clearTint());
              this._dmgNumber(370, 100, dmg, false);

              self.enemyHp = Math.max(0, self.enemyHp - dmg);
              this._redrawEnemyBars();

              // Return hero
              this.tweens.add({
                targets: self.heroSprite,
                x: heroX, duration: 170, ease: 'Power1',
                onComplete: () => {
                  self.heroSprite.play('hero-walk-anim');
                  // Restart bob
                  this.tweens.add({
                    targets: self.heroSprite,
                    y: { from: 130, to: 125 },
                    duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                  });

                  if (self.enemyHp <= 0) {
                    this._killEnemy();
                  } else {
                    self.busy = false;
                    this._showQuestion();
                  }
                },
              });
            },
          });
        }

        // ────────────────────────────────────
        _enemyAttacks() {
          const self   = this as any;
          const enemyX = 370;
          const dmg    = 15 + Math.floor(Math.random() * 6);  // 15–20

          this.tweens.killTweensOf(self.enemySprite);

          this.tweens.add({
            targets: self.enemySprite,
            x: 210, duration: 190, ease: 'Power2',
            onComplete: () => {
              this.cameras.main.shake(75, 0.005);
              self.heroSprite.setTint(0xff3333);
              this.time.delayedCall(100, () => self.heroSprite.clearTint());
              this._dmgNumber(110, 100, dmg, true);

              self.heroHp = Math.max(0, self.heroHp - dmg);
              this._redrawHeroBars();

              this.tweens.add({
                targets: self.enemySprite,
                x: enemyX, duration: 170, ease: 'Power1',
                onComplete: () => {
                  // Restart enemy bob
                  const wave = WAVES[self.wave];
                  self.enemySprite.play(wave.anim);
                  this.tweens.add({
                    targets: self.enemySprite,
                    y: { from: 130, to: 124 },
                    duration: 720, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 250,
                  });

                  if (self.heroHp <= 0) {
                    this._gameOver(false);
                  } else {
                    self.busy = false;
                    this._showQuestion();
                  }
                },
              });
            },
          });
        }

        // ────────────────────────────────────
        _killEnemy() {
          const self = this as any;
          this.tweens.killTweensOf(self.enemySprite);
          self.enemySprite.play('death-anim');

          self.enemySprite.once('animationcomplete', () => {
            this.tweens.add({
              targets: self.enemySprite, alpha: 0, duration: 350,
              onComplete: () => {
                const nextWave = self.wave + 1;
                if (nextWave >= WAVES.length) {
                  this._gameOver(true);
                } else {
                  this._flash(`Wave ${nextWave + 1}!`, '#fbbf24');
                  this.time.delayedCall(900, () => {
                    this._loadWave(nextWave);
                    // Restart enemy bob after loading new wave
                    this.tweens.add({
                      targets: self.enemySprite,
                      y: { from: 130, to: 124 },
                      duration: 720, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 250,
                    });
                    self.busy = false;
                    this._showQuestion();
                  });
                }
              },
            });
          });
        }

        // ────────────────────────────────────
        _gameOver(win: boolean) {
          const W = 480, H = 340;
          const self = this as any;
          self.busy = true;

          // Slight delay for dramatic effect
          this.time.delayedCall(400, () => {
            // Dark overlay
            const overlay = this.add.rectangle(W / 2, H / 2, W, H, win ? 0x0a0528 : 0x200808, 0.88).setDepth(30);

            // Title
            const titleCfg = win
              ? { text: 'CHIẾN THẮNG!', color: '#fbbf24' }
              : { text: 'THẤT BẠI!',    color: '#f87171' };

            this.add.text(W / 2, H / 2 - 55, titleCfg.text, {
              fontSize: '26px', color: titleCfg.color, fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 5,
            }).setOrigin(0.5).setDepth(31);

            const sub = win
              ? `Xuất sắc! Bạn đã vượt qua tất cả 5 làn sóng!`
              : `Đừng nản lòng! Luyện tập thêm nhé!`;

            this.add.text(W / 2, H / 2 - 14, sub, {
              fontSize: '12px', color: '#e2e8f0', wordWrap: { width: 360 }, align: 'center',
            }).setOrigin(0.5).setDepth(31);

            if (win) {
              this.add.text(W / 2, H / 2 + 8, `HP còn lại: ${self.heroHp}/${self.heroMaxHp}`, {
                fontSize: '11px', color: '#4ade80',
              }).setOrigin(0.5).setDepth(31);
            }

            // Play-again button
            const reBtn = this.add.rectangle(W / 2, H / 2 + 40, 180, 36, 0x7c3aed)
              .setInteractive({ useHandCursor: true }).setDepth(31);

            this.add.text(W / 2, H / 2 + 40, 'Chơi Lại', {
              fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(32);

            reBtn.on('pointerover', () => reBtn.setFillStyle(0x9333ea));
            reBtn.on('pointerout',  () => reBtn.setFillStyle(0x7c3aed));
            reBtn.on('pointerdown', () => this.scene.restart());
          });
        }
      }

      // ══════════════════════════════════════
      //  LAUNCH PHASER GAME
      // ══════════════════════════════════════
      game = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: '#0f0c2a',
        parent: containerRef.current!,
        render: { pixelArt: true, antialias: false },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 480,
          height: 340,
        },
        scene: [PreloaderScene, BattleScene],
      });
    })();

    return () => {
      cancelled = true;
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0c0a23] flex flex-col items-center pb-8">
        {/* Back link */}
        <div className="w-full max-w-xl px-4 pt-4">
          <Link href="/games" className="text-purple-400 hover:text-purple-300 font-bold text-sm transition-colors">
            ← Quay lại
          </Link>
        </div>

        {/* Title */}
        <div className="text-center my-4">
          <h1 className="text-2xl font-black text-white drop-shadow-lg">Word Battle RPG</h1>
          <p className="text-purple-300 text-sm mt-1">Đánh bại quái vật bằng từ vựng tiếng Anh!</p>
        </div>

        <p className="text-purple-500/70 text-xs mb-3">Dung -&gt; tan cong | Sai -&gt; bi danh</p>

        {/* Game canvas container */}
        <div
          ref={containerRef}
          className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.4)] border-2 border-purple-800"
          style={{ aspectRatio: '480/340' }}
        />

        {/* Tip */}
        <p className="text-purple-600/60 text-xs mt-4 text-center max-w-xs">
          Đánh bại 5 làn sóng quái vật để giành chiến thắng!
        </p>
      </main>
    </>
  );
}
