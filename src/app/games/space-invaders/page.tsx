'use client';

import { useEffect, useRef } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';

// ─── Adapted from: digitsensitive/phaser3-typescript (space-invaders) ────────
// Original repo: https://github.com/digitsensitive/phaser3-typescript
// Assets: sprites/octopus.png, crab.png, squid.png, player.png, bullet.png
// ─────────────────────────────────────────────────────────────────────────────

export default function SpaceInvadersPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() =>{
    if (!containerRef.current) return;
    let game: any = null;
    let cancelled = false;

    (async () =>{
      const Phaser = ((await import('phaser')) as any).default;
      if (cancelled) return;

      const W = 480, H = 320;
      const SPR_BASE ='/games/space-invaders/sprites';
      const FONT_BASE ='/games/space-invaders/font';

      // ──────────────────────────────────────
      //  SHARED STATE  (registry keys)
      // ──────────────────────────────────────
      // points, lives, level  → set in BootScene, read everywhere

      // ══════════════════════════════════════
      //  BOOT / PRELOADER SCENE
      // ══════════════════════════════════════
      class BootScene extends Phaser.Scene {
        private bar!: any;
        private bg!: any;

        constructor() { super({ key:'BootScene'}); }

        preload() {
          // Background
          this.cameras.main.setBackgroundColor(0x000010);

          // Loading bar
          this.bg = this.add.graphics();
          this.bg.fillStyle(0x111133);
          this.bg.fillRoundedRect(W / 2 - 120, H / 2 - 8, 240, 16, 8);
          this.bar = this.add.graphics();

          this.load.on('progress', (v: number) =>{
            this.bar.clear();
            this.bar.fillStyle(0x4ade80);
            this.bar.fillRoundedRect(W / 2 - 118, H / 2 - 6, 236 * v, 12, 6);
          });

          this.add.text(W / 2, H / 2 - 30,'SPACE INVADERS', {
            fontSize:'16px', color:'#4ade80', fontStyle:'bold',
          }).setOrigin(0.5);

          // ── Assets from cloned repo ──────
          this.load.bitmapFont('font',`${FONT_BASE}/font.png`,`${FONT_BASE}/font.fnt`);
          this.load.image('bullet',`${SPR_BASE}/bullet.png`);
          this.load.image('player',`${SPR_BASE}/player.png`);
          this.load.spritesheet('octopus',`${SPR_BASE}/octopus.png`, { frameWidth: 12, frameHeight: 8 });
          this.load.spritesheet('crab',`${SPR_BASE}/crab.png`,    { frameWidth: 11, frameHeight: 8 });
          this.load.spritesheet('squid',`${SPR_BASE}/squid.png`,   { frameWidth:  8, frameHeight: 8 });
        }

        create() {
          // Animations exactly as defined in the original animations.json
          const makeAnim = (key: string, tex: string, s: number, e: number, repeat: number) =>{
            this.anims.create({
              key, frameRate: 4, repeat,
              frames: this.anims.generateFrameNumbers(tex, { start: s, end: e }),
            });
          };
          makeAnim('octopusFly','octopus', 0, 1, -1);
          makeAnim('octopusDead','octopus', 2, 2,  0);
          makeAnim('crabFly','crab',    0, 1, -1);
          makeAnim('crabDead','crab',    2, 2,  0);
          makeAnim('squidFly','squid',   0, 1, -1);
          makeAnim('squidDead','squid',   2, 2,  0);

          this.registry.set('points', 0);
          this.registry.set('lives', 3);
          this.registry.set('level', 1);
          this.scene.start('MenuScene');
        }
      }

      // ══════════════════════════════════════
      //  MENU SCENE
      // ══════════════════════════════════════
      class MenuScene extends Phaser.Scene {
        private startKey!: any;

        constructor() { super({ key:'MenuScene'}); }

        create() {
          this.cameras.main.setBackgroundColor(0x000010);
          // Star field
          for (let i = 0; i< 80; i++) {
            const x = Phaser.Math.RND.between(0, W);
            const y = Phaser.Math.RND.between(0, H);
            const s = Phaser.Math.RND.between(1, 2);
            this.add.rectangle(x, y, s, s, 0xffffff, Phaser.Math.RND.realInRange(0.3, 1));
          }

          this.add.bitmapText(W / 2, H / 2 - 60,'font','SPACE INVADERS', 16).setOrigin(0.5);
          this.add.bitmapText(W / 2, H / 2 - 10,'font','PRESS SPACE TO PLAY', 8).setOrigin(0.5);
          this.add.bitmapText(W / 2, H / 2 + 14,'font','ARROW KEYS: MOVE    SPACE: SHOOT', 8).setOrigin(0.5);

          // Enemy preview
          const types = ['squid','crab','octopus'];
          const scores = [60, 40, 20];
          for (let i = 0; i< 3; i++) {
            const sp = this.add.sprite(W / 2 - 30, H / 2 + 50 + i * 18, types[i]).setScale(3);
            sp.play(types[i] +'Fly');
            this.add.bitmapText(W / 2 - 10, H / 2 + 44 + i * 18,'font',`= ${scores[i]} PTS`, 8);
          }

          this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
          this.startKey.isDown = false;
        }

        update() {
          if (this.startKey.isDown) {
            this.registry.set('points', 0);
            this.registry.set('lives', 3);
            this.scene.start('HUDScene');
            this.scene.start('GameScene');
            this.scene.bringToTop('HUDScene');
          }
        }
      }

      // ══════════════════════════════════════
      //  GAME SCENE  (adapted from original GameScene + Player + Enemy + Bullet)
      // ══════════════════════════════════════
      class GameScene extends Phaser.Scene {
        private playerSprite!: any;
        private playerBullets!: any;
        private cursors!: any;
        private shootKey!: any;
        private enemies!: any[];
        private enemyBullets!: any[];
        private lastShoot = 0;
        private playerLives = 3;
        private tweenGroup!: Phaser.Tweens.Tween[];

        constructor() { super({ key:'GameScene'}); }

        create() {
          this.cameras.main.setBackgroundColor(0x000010);

          // Star field
          for (let i = 0; i< 60; i++) {
            const x = Phaser.Math.RND.between(0, W);
            const y = Phaser.Math.RND.between(0, H);
            this.add.rectangle(x, y, 1, 1, 0xffffff, Phaser.Math.RND.realInRange(0.3, 0.9));
          }

          // Ground line
          this.add.rectangle(W / 2, H - 18, W, 1, 0x22c55e, 0.6);

          // Player
          this.playerSprite = this.physics.add.image(W / 2, H - 25,'player').setScale(3);
          (this.playerSprite.body as any).setSize(13, 8);
          this.playerBullets = this.add.group();

          // Enemies — 5 rows × 10 cols
          this.enemies = [];
          this.enemyBullets = [];
          this.tweenGroup = [];

          for (let row = 0; row< 5; row++) {
            for (let col = 0; col< 10; col++) {
              const type = row === 0 ?'squid': (row<= 2 ?'crab':'octopus');
              const tint = row === 0 ? 0x4a4e4d : (row<= 2 ? 0x42a4aa : 0xffffff);
              const ex = 28 + col * 40;
              const ey = 30 + row * 22;

              const sp = this.physics.add.sprite(ex, ey, type).setScale(3).setTint(tint);
              sp.play(type +'Fly');
              (sp as any)._type    = type;
              (sp as any)._lives   = (type ==='squid') ? 2 : (type ==='crab'? 2 : 1);
              (sp as any)._value   = (type ==='squid') ? 60 : (type ==='crab'? 40 : 20);
              (sp as any)._tint    = tint;
              (sp as any)._hurtTime = 0;
              (sp as any)._reloadT = type ==='squid'? 12000 : (type ==='crab'? 10000 : 9000);

              const tween = this.tweens.add({
                targets: sp, x: ex + 50 + col * 3,
                ease:'Power0', duration: 5000 + row * 800,
                yoyo: true, repeat: -1,
              });
              this.tweenGroup.push(tween);
              this.enemies.push(sp);
              this.enemyBullets.push(this.add.group());
            }
          }

          // Input
          this.cursors  = this.input.keyboard.createCursorKeys();
          this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
          this.lastShoot = 0;
          this.playerLives = this.registry.get('lives');
        }

        update(time: number) {
          if (!this.playerSprite.active) return;

          // ── Player movement ──────────────
          const body = this.playerSprite.body as any;
          if (this.cursors.right.isDown && this.playerSprite.x< W - 16) {
            body.setVelocityX(180);
          } else if (this.cursors.left.isDown && this.playerSprite.x >16) {
            body.setVelocityX(-180);
          } else {
            body.setVelocityX(0);
          }

          // ── Player shoot ─────────────────
          if (this.shootKey.isDown && time >this.lastShoot && this.playerBullets.getLength()< 1) {
            const b = this.physics.add.image(this.playerSprite.x, this.playerSprite.y - 20,'bullet').setScale(3);
            (b.body as any).setVelocityY(-400);
            this.playerBullets.add(b);
            this.lastShoot = time + 500;
          }

          // ── Player bullets ───────────────
          this.playerBullets.getChildren().forEach((b: any) =>{
            if (b.y< 0) b.destroy();
          });

          // ── Enemy update ─────────────────
          let enemyReachedBottom = false;
          const aliveEnemies: any[] = [];

          for (let i = 0; i< this.enemies.length; i++) {
            const en = this.enemies[i];
            if (!en.active) continue;
            aliveEnemies.push(en);

            // Check if enemy reaches ground
            if (en.y >H - 30) { enemyReachedBottom = true; break; }

            // Hurt cooldown
            if ((en as any)._hurtTime >0) {
              (en as any)._hurtTime -= 16;
              if ((en as any)._hurtTime<= 0) {
                en.clearTint();
                en.setTint((en as any)._tint);
                en.setScale(3);
                en.setAlpha(1);
              }
            }

            // Enemy random shoot
            if (Phaser.Math.RND.between(0, (en as any)._reloadT / 16) === 0) {
              const eb = this.physics.add.image(en.x, en.y + 8,'bullet').setScale(2).setTint(0xff4444);
              (eb.body as any).setVelocityY(160);
              this.enemyBullets[i].add(eb);
            }

            // Check enemy bullets vs player
            this.enemyBullets[i].getChildren().forEach((eb: any) =>{
              if (eb.y >H) { eb.destroy(); return; }
              if (Phaser.Geom.Intersects.RectangleToRectangle(eb.getBounds(), this.playerSprite.getBounds())) {
                eb.destroy();
                this._hurtPlayer();
              }
            });

            // Check player bullets vs enemy
            this.playerBullets.getChildren().forEach((pb: any) =>{
              if (Phaser.Geom.Intersects.RectangleToRectangle(pb.getBounds(), en.getBounds())) {
                pb.destroy();
                this._hurtEnemy(en, i);
              }
            });
          }

          // ── Win / Lose check ─────────────
          if (aliveEnemies.length === 0) {
            this._endGame(true);
          } else if (this.playerLives<= 0 || enemyReachedBottom) {
            this._endGame(false);
          }
        }

        _hurtEnemy(en: any, i: number) {
          en._lives -= 1;
          if (en._lives<= 0) {
            en.play(en._type +'Dead');
            en.once('animationcomplete', () =>{
              // Add points
              const pts = this.registry.get('points') + en._value;
              this.registry.set('points', pts);
              this.events.emit('pointsChanged');
              this.tweenGroup[i]?.stop();
              en.destroy();
            });
          } else {
            // Flash hurt
            en.setTint(0xfc8a75);
            en.setScale(2.5);
            en.setAlpha(0.8);
            en._hurtTime = 200;
          }
        }

        _hurtPlayer() {
          this.playerLives = Math.max(0, this.playerLives - 1);
          this.registry.set('lives', this.playerLives);
          this.events.emit('livesChanged');
          this.cameras.main.shake(120, 0.008);
          this.playerSprite.setTint(0xff3333);
          this.time.delayedCall(200, () =>this.playerSprite.clearTint());
          // Reset player position
          this.playerSprite.setX(W / 2);
        }

        _endGame(win: boolean) {
          this.scene.stop('HUDScene');
          this.scene.start('GameOverScene', { win, points: this.registry.get('points') });
        }
      }

      // ══════════════════════════════════════
      //  HUD SCENE
      // ══════════════════════════════════════
      class HUDScene extends Phaser.Scene {
        private livesText!: any;
        private pointsText!: any;

        constructor() { super({ key:'HUDScene'}); }

        create() {
          this.pointsText = this.add.bitmapText(8,  8,'font',`SCORE: ${this.registry.get('points')}`, 8);
          this.livesText  = this.add.bitmapText(8, 22,'font',`LIVES: ${this.registry.get('lives')}`, 8);

          const level = this.scene.get('GameScene');
          level.events.on('pointsChanged', () =>{
            this.pointsText.setText(`SCORE: ${this.registry.get('points')}`);
          });
          level.events.on('livesChanged', () =>{
            this.livesText.setText(`LIVES: ${this.registry.get('lives')}`);
          });
        }
      }

      // ══════════════════════════════════════
      //  GAME OVER SCENE
      // ══════════════════════════════════════
      class GameOverScene extends Phaser.Scene {
        constructor() { super({ key:'GameOverScene'}); }

        create(data: { win: boolean; points: number }) {
          this.cameras.main.setBackgroundColor(0x000010);

          // Stars
          for (let i = 0; i< 60; i++) {
            const x = Phaser.Math.RND.between(0, W);
            const y = Phaser.Math.RND.between(0, H);
            this.add.rectangle(x, y, 1, 1, 0xffffff, 0.5);
          }

          const color = data.win ?'#4ade80':'#f87171';
          const title = data.win ?'YOU WIN!':'GAME OVER';

          this.add.bitmapText(W / 2, H / 2 - 50,'font', title, 16).setOrigin(0.5).setTint(data.win ? 0x4ade80 : 0xf87171);
          this.add.bitmapText(W / 2, H / 2 - 20,'font',`SCORE: ${data.points}`, 8).setOrigin(0.5);
          this.add.bitmapText(W / 2, H / 2 + 0,'font','PRESS SPACE TO PLAY AGAIN', 8).setOrigin(0.5);

          // Show enemy sprites decoratively
          if (data.win) {
            ['octopus','crab','squid'].forEach((t, i) =>{
              const sp = this.add.sprite(W / 2 - 60 + i * 60, H / 2 + 40, t).setScale(4);
              sp.play(t +'Fly');
            });
          }

          const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
          spaceKey.isDown = false;
          (this as any)._spaceKey = spaceKey;
        }

        update() {
          if ((this as any)._spaceKey?.isDown) {
            this.registry.set('points', 0);
            this.registry.set('lives', 3);
            this.scene.start('MenuScene');
          }
        }
      }

      // ══════════════════════════════════════
      //  LAUNCH GAME
      // ══════════════════════════════════════
      game = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: 0x000010,
        parent: containerRef.current!,
        physics: { default:'arcade', arcade: { gravity: { x: 0, y: 0 } } },
        render: { pixelArt: true, antialias: false },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: W,
          height: H,
        },
        scene: [BootScene, MenuScene, GameScene, HUDScene, GameOverScene],
      });
    })();

    return () =>{
      cancelled = true;
      if (game) { game.destroy(true); game = null; }
    };
  }, []);

  return (<><Header /><main className="min-h-screen bg-[#000010] flex flex-col items-center pb-8"><div className="w-full max-w-xl px-4 pt-4"><Link href="/games" className="text-green-400 hover:text-green-300 font-bold text-sm transition-colors">← Quay lại</Link></div><div className="text-center my-4"><h1 className="text-2xl font-black text-white drop-shadow-lg">Space Invaders</h1><p className="text-green-300 text-sm mt-1">Tiêu diệt tất cả UFO để giành chiến thắng!</p></div><p className="text-green-600/70 text-xs mb-3">← → Di chuyển  |  Space Bắn</p><div
          ref={containerRef}
          className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(74,222,128,0.3)] border-2 border-green-900"
          style={{ aspectRatio:'480/320'}}
        /><p className="text-green-700/50 text-xs mt-4 text-center max-w-xs">Clone từ: digitsensitive/phaser3-typescript   |  Pixel art sprites included</p></main></>);
}
