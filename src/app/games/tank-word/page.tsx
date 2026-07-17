'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadWordBank } from '@/lib/word-bank';

const FALLBACK_VOCAB = [
  { en: 'Apple',   vi: 'Quả táo' },  { en: 'Book',    vi: 'Quyển sách' },
  { en: 'Cat',     vi: 'Con mèo' },  { en: 'Dog',     vi: 'Con chó' },
  { en: 'Eagle',   vi: 'Đại bàng' }, { en: 'Fish',    vi: 'Con cá' },
  { en: 'Gold',    vi: 'Vàng' },     { en: 'House',   vi: 'Ngôi nhà' },
  { en: 'Ice',     vi: 'Băng đá' },  { en: 'Jungle',  vi: 'Rừng rậm' },
  { en: 'King',    vi: 'Nhà vua' },  { en: 'Lion',    vi: 'Sư tử' },
  { en: 'Moon',    vi: 'Mặt trăng' },{ en: 'Night',   vi: 'Màn đêm' },
  { en: 'Ocean',   vi: 'Đại dương' },{ en: 'Plane',   vi: 'Máy bay' },
  { en: 'Queen',   vi: 'Nữ hoàng' }, { en: 'River',   vi: 'Con sông' },
  { en: 'Star',    vi: 'Ngôi sao' }, { en: 'Tree',    vi: 'Cây cối' },
];

const KILLS_TO_WIN = 8;
const BASE = '/games/tank-word';

export default function TankWordPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<any>(null);

  const [score,    setScore]    = useState(0);
  const [hp,       setHp]       = useState(5);
  const [kills,    setKills]    = useState(0);
  const [target,   setTarget]   = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [initError, setInitError] = useState(false);

  const scoreRef = useRef(0);
  const hpRef    = useRef(5);
  const killsRef = useRef(0);
  const controlsRef = useRef({ up: false, down: false, left: false, right: false, fire: false });

  // ── Closure-shared game state (lives in Phaser's import closure) ──
  const cbRef = useRef({
    onCorrectKill: (_word: string) => {},
    onWrongKill:   () => {},
    onHit:         () => {},
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      let vocab = FALLBACK_VOCAB;
      void loadWordBank().then((loaded) => {
        const activeVocab = loaded
          .map((word) => ({ en: word.en.trim(), vi: word.vi.trim() }))
          .filter((word) => word.en && word.vi && word.en.length <= 16 && word.vi.length <= 24 && !word.vi.includes(','));
        if (!destroyed && activeVocab.length >= 12) vocab = activeVocab;
      }).catch(() => {});
      const Phaser = await import('phaser');
      if (destroyed || !containerRef.current) return;

      // ── Shared vocabulary state ──
      let enemyWords: string[] = [];      // word assigned to each enemy slot
      let currentTargetEn = '';

      function assignWords(count: number) {
        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        enemyWords = shuffled.slice(0, count).map(v => v.en);
        currentTargetEn = enemyWords[Math.floor(Math.random() * enemyWords.length)];
        const vi = vocab.find(v => v.en === currentTargetEn)?.vi || '';
        setTarget(vi);
      }

      function replaceWord(idx: number) {
        const used = new Set(enemyWords);
        const avail = vocab.filter(v => !used.has(v.en));
        const pool = avail.length > 0 ? avail : vocab;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        enemyWords[idx] = pick.en;
        return pick;
      }

      function pickNewTarget(skipIdx: number) {
        const aliveWords = enemyWords.filter((_, i) => i !== skipIdx);
        if (aliveWords.length === 0) return;
        currentTargetEn = aliveWords[Math.floor(Math.random() * aliveWords.length)];
        const vi = vocab.find(v => v.en === currentTargetEn)?.vi || '';
        setTarget(vi);
      }

      // ── PRELOADER ──────────────────────────────────────────────────────
      class PreloaderScene extends Phaser.Scene {
        constructor() { super({ key: 'PreloaderScene' }); }
        preload() {
          const cx = this.scale.width / 2, cy = this.scale.height / 2;
          const track = this.add.rectangle(cx, cy, 320, 22).setStrokeStyle(2, 0x22d3ee);
          const bar   = this.add.rectangle(cx - 158, cy, 2, 16, 0x22d3ee);
          this.add.text(cx, cy - 36, 'Word Tank Battle', {
            fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#22d3ee',
          }).setOrigin(0.5);
          this.add.text(cx, cy + 34, 'Loading...', {
            fontFamily: 'Arial', fontSize: '13px', color: '#94a3b8',
          }).setOrigin(0.5);
          this.load.on('progress', (p: number) => {
            bar.width = Math.max(2, 312 * p);
            bar.x = cx - 158 + bar.width / 2;
          });
          void track;

          this.load.tilemapTiledJSON('levelMap', `${BASE}/maps/levelMap.json`);
          this.load.image('tiles',               `${BASE}/tiles/tiles.png`);
          this.load.image('tankBlue',            `${BASE}/sprites/tank-blue.png`);
          this.load.image('tankRed',             `${BASE}/sprites/tank-red.png`);
          this.load.image('barrelBlue',          `${BASE}/sprites/barrel-blue.png`);
          this.load.image('barrelRed',           `${BASE}/sprites/barrel-red.png`);
          this.load.image('bulletBlue',          `${BASE}/sprites/bullet-blue.png`);
          this.load.image('bulletRed',           `${BASE}/sprites/bullet-red.png`);
          this.load.image('barrelGreyTop',       `${BASE}/obstacles/barrel-grey-top.png`);
          this.load.image('barrelGreySideRust',  `${BASE}/obstacles/barrel-grey-side-rust.png`);
          this.load.image('barrelGreySide',      `${BASE}/obstacles/barrel-grey-side.png`);
          this.load.image('barrelRedTop',        `${BASE}/obstacles/barrel-red-top.png`);
          this.load.image('barrelRedSide',       `${BASE}/obstacles/barrel-red-side.png`);
          this.load.image('treeLarge',           `${BASE}/obstacles/tree-large.png`);
          this.load.image('treeSmall',           `${BASE}/obstacles/tree-small.png`);
        }
        create() { this.scene.start('GameScene'); }
      }

      // ── GAME SCENE ─────────────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        private playerBody!:    Phaser.Physics.Arcade.Image;
        private playerBarrel!:  Phaser.GameObjects.Image;
        private playerBullets!: Phaser.Physics.Arcade.Group;
        private lastShoot = 0;
        private playerInvincible = false;

        private layer!: Phaser.Tilemaps.TilemapLayer;
        private obstacles!: Phaser.Physics.Arcade.StaticGroup;

        // Each slot: { body, barrel, bullets, label, hpBar, hp, last, alive, wordIdx }
        private slots: {
          body:    Phaser.Physics.Arcade.Image;
          barrel:  Phaser.GameObjects.Image;
          bullets: Phaser.Physics.Arcade.Group;
          label:   Phaser.GameObjects.Text;
          hpBar:   Phaser.GameObjects.Graphics;
          hp:      number;
          lastShoot: number;
          alive:   boolean;
          slotIdx: number;
        }[] = [];

        private cursors!:   Phaser.Types.Input.Keyboard.CursorKeys;
        private keySpace!:  Phaser.Input.Keyboard.Key;
        private WORLD_W = 3200;
        private WORLD_H = 2400;

        constructor() { super({ key: 'GameScene' }); }

        create() {
          // ── Tilemap ──
          const map   = this.make.tilemap({ key: 'levelMap' });
          const tiles = map.addTilesetImage('tiles', 'tiles');
          this.layer  = map.createLayer('tileLayer', tiles!, 0, 0)!;
          this.layer.setCollisionByProperty({ collide: true });
          this.WORLD_W = map.widthInPixels;
          this.WORLD_H = map.heightInPixels;
          this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);

          // ── Obstacles ──
          this.obstacles = this.physics.add.staticGroup();
          const OBSTACLE_TYPES = new Set([
            'barrelGreyTop','barrelGreySideRust','barrelGreySide',
            'barrelRedTop','barrelRedSide','treeLarge','treeSmall',
          ]);
          const objLayer = map.getObjectLayer('objects');
          const enemyObjs: any[] = [];

          if (objLayer) {
            objLayer.objects.forEach((obj: any) => {
              const t = (obj.type || (obj as any).class || '');
              if (OBSTACLE_TYPES.has(t)) {
                // Tiled tile-object: origin at bottom-left → center for Phaser
                this.obstacles.create(
                  obj.x + (obj.width || 0) / 2,
                  obj.y - (obj.height || 0) / 2,
                  t
                );
              }
              if (t === 'enemy') enemyObjs.push(obj);
            });
          }

          // ── Player ──
          const playerObj = objLayer?.objects.find(
            (o: any) => (o.type || (o as any).class || '') === 'player'
          );
          const px = playerObj ? (playerObj as any).x : 320;
          const py = playerObj ? (playerObj as any).y : 240;

          this.playerBody = this.physics.add.image(px, py, 'tankBlue')
            .setCollideWorldBounds(true).setDepth(10).setScale(1.1);
          this.playerBody.angle = 180;

          this.playerBarrel = this.add.image(px, py, 'barrelBlue')
            .setOrigin(0.5, 1).setDepth(11).setScale(1.1);
          this.playerBarrel.angle = 180;

          // ── Player bullets group ──
          this.playerBullets = this.physics.add.group();

          // ── ONE group collider for all player bullets ──
          this.physics.add.collider(this.playerBullets, this.layer, (b: any) => {
            if (b.active) b.destroy();
          });
          this.physics.add.collider(this.playerBullets, this.obstacles, (b: any) => {
            if (b.active) b.destroy();
          });

          // Player vs tilemap / obstacles
          this.physics.add.collider(this.playerBody, this.layer);
          this.physics.add.collider(this.playerBody, this.obstacles);

          // ── Camera ──
          this.cameras.main
            .setBounds(0, 0, this.WORLD_W, this.WORLD_H)
            .startFollow(this.playerBody, true, 0.08, 0.08)
            .setZoom(1.5);

          // ── Spawn enemies from object layer (use up to 7) ──
          const spawnList = enemyObjs.slice(0, 7);
          // Pad if fewer than 5
          while (spawnList.length < 5) spawnList.push({
            x: 400 + spawnList.length * 350,
            y: 600 + spawnList.length * 200,
          });

          assignWords(spawnList.length);

          spawnList.forEach((obj, idx) => {
            this._spawnSlot(idx, obj.x, obj.y);
          });

          // ── Input ──
          this.cursors  = this.input.keyboard!.createCursorKeys();
          this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

          // ── Wire React callbacks ──
          cbRef.current.onCorrectKill = (word: string) => {
            scoreRef.current += 100; setScore(scoreRef.current);
            killsRef.current++;      setKills(killsRef.current);
            setFeedback('correct');  setTimeout(() => setFeedback(null), 700);
            if (killsRef.current >= KILLS_TO_WIN) setGameOver('win');
            void word;
          };
          cbRef.current.onWrongKill = () => {
            hpRef.current = Math.max(0, hpRef.current - 1); setHp(hpRef.current);
            setFeedback('wrong'); setTimeout(() => setFeedback(null), 700);
            if (hpRef.current <= 0) setGameOver('lose');
          };
          cbRef.current.onHit = () => {
            hpRef.current = Math.max(0, hpRef.current - 1); setHp(hpRef.current);
            if (hpRef.current <= 0) setGameOver('lose');
          };
        }

        private _spawnSlot(idx: number, spawnX: number, spawnY: number) {
          const word = enemyWords[idx] || vocab[idx % vocab.length].en;

          const body = this.physics.add.image(spawnX, spawnY, 'tankRed')
            .setCollideWorldBounds(true).setDepth(10).setScale(1.1);
          body.angle = Phaser.Math.Between(0, 359);

          const barrel = this.add.image(spawnX, spawnY, 'barrelRed')
            .setOrigin(0.5, 1).setDepth(11).setScale(1.1);

          const bullets = this.physics.add.group();

          // Label with word
          const label = this.add.text(spawnX, spawnY - 58, word, {
            fontFamily: '"Arial Black", Arial',
            fontSize: '13px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 4,
            backgroundColor: '#1e293bcc',
            padding: { x: 6, y: 3 },
          }).setOrigin(0.5, 1).setDepth(20);

          // HP bar (3 bars × 8px = 24px wide, 5px tall)
          const hpBar = this.add.graphics().setDepth(21);
          this._drawHpBar(hpBar, spawnX, spawnY, 3, 3);

          const slot = { body, barrel, bullets, label, hpBar, hp: 3, lastShoot: 0, alive: true, slotIdx: idx };
          this.slots[idx] = slot;

          // Player bullets hit this enemy
          this.physics.add.overlap(this.playerBullets, body, (bullet: any) => {
            if (!bullet.active || !slot.alive) return;
            bullet.destroy();
            slot.hp--;
            this._drawHpBar(hpBar, body.x, body.y, slot.hp, 3);
            // Hit flash
            body.setTint(0xff4444);
            this.time.delayedCall(150, () => { if (body.active) body.clearTint(); });

            if (slot.hp <= 0) this._killSlot(idx);
          });

          // Enemy bullets hit player
          this.physics.add.overlap(bullets, this.playerBody, (b: any) => {
            if (!b.active || this.playerInvincible) return;
            b.destroy();
            this.playerInvincible = true;
            this.cameras.main.shake(180, 0.007);
            this.playerBody.setTint(0xff3333);
            cbRef.current.onHit();
            this.time.delayedCall(1200, () => {
              if (this.playerBody.active) this.playerBody.clearTint();
              this.playerInvincible = false;
            });
          });

          // Enemy bullets vs tilemap / obstacles
          this.physics.add.collider(bullets, this.layer, (b: any) => { if (b.active) b.destroy(); });
          this.physics.add.collider(bullets, this.obstacles, (b: any) => { if (b.active) b.destroy(); });

          // Enemy vs tilemap / obstacles
          this.physics.add.collider(body, this.layer);
          this.physics.add.collider(body, this.obstacles);
        }

        private _drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, hp: number, max: number) {
          g.clear();
          for (let i = 0; i < max; i++) {
            g.fillStyle(i < hp ? 0x22c55e : 0x374151);
            g.fillRect(x - (max * 9) / 2 + i * 9, y - 72, 7, 6);
          }
        }

        private _killSlot(idx: number) {
          const slot = this.slots[idx];
          if (!slot || !slot.alive) return;
          slot.alive = false;

          const isCorrect = slot.body.active && (enemyWords[idx] === currentTargetEn);

          // Explosion
          const ring = this.add.circle(slot.body.x, slot.body.y, 10, 0xff6600, 0.9).setDepth(25);
          this.tweens.add({
            targets: ring, radius: 70, alpha: 0, duration: 450,
            onUpdate: () => { ring.setRadius((ring as any).radius || 10); },
            onComplete: () => ring.destroy(),
          });
          const explosion = this.add.text(slot.body.x, slot.body.y, 'X', { fontSize: '36px' }).setOrigin(0.5).setDepth(26);
          this.tweens.add({ targets: explosion, y: explosion.y - 30, alpha: 0, duration: 600, onComplete: () => explosion.destroy() });

          // Hide enemy
          slot.body.setActive(false).setVisible(false);
          (slot.body.body as Phaser.Physics.Arcade.Body).setEnable(false);
          slot.barrel.setVisible(false);
          slot.label.setVisible(false);
          slot.hpBar.clear();
          slot.bullets.clear(true, true);

          if (isCorrect) {
            cbRef.current.onCorrectKill(enemyWords[idx]);
          } else {
            cbRef.current.onWrongKill();
          }

          // Pick new target from alive slots (excluding the one just killed)
          pickNewTarget(idx);

          if (killsRef.current < KILLS_TO_WIN && !destroyed) {
            // Assign new word to this slot
            const newWord = replaceWord(idx);
            // Respawn after 3.5s at a random map position
            const rx = Phaser.Math.Between(200, this.WORLD_W - 200);
            const ry = Phaser.Math.Between(200, this.WORLD_H - 200);
            this.time.delayedCall(3500, () => {
              if (destroyed || killsRef.current >= KILLS_TO_WIN) return;
              slot.hp    = 3;
              slot.alive = true;
              slot.body.setPosition(rx, ry).setActive(true).setVisible(true).clearTint();
              (slot.body.body as Phaser.Physics.Arcade.Body).setEnable(true).setVelocity(0, 0);
              slot.barrel.setPosition(rx, ry).setVisible(true);
              slot.label.setText(newWord.en).setPosition(rx, ry - 58).setVisible(true);
              this._drawHpBar(slot.hpBar, rx, ry, 3, 3);
            });
          }
        }

        update(time: number) {
          if (!this.playerBody?.active) return;

          // ── Player movement ──
          const pb    = this.playerBody.body as Phaser.Physics.Arcade.Body;
          const speed = 150;

          if (this.cursors.up.isDown || controlsRef.current.up) {
            this.physics.velocityFromRotation(this.playerBody.rotation - Math.PI / 2, speed, pb.velocity);
          } else if (this.cursors.down.isDown || controlsRef.current.down) {
            this.physics.velocityFromRotation(this.playerBody.rotation - Math.PI / 2, -speed * 0.55, pb.velocity);
          } else {
            pb.setVelocity(0, 0);
          }
          if (this.cursors.left.isDown || controlsRef.current.left)  this.playerBody.rotation -= 0.032;
          if (this.cursors.right.isDown || controlsRef.current.right) this.playerBody.rotation += 0.032;

          // ── Barrel aims at mouse ──
          const ptr = this.input.activePointer;
          const wp  = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
          const usingTouch = Object.values(controlsRef.current).some(Boolean);
          const aim = usingTouch
            ? this.playerBody.rotation - Math.PI / 2
            : Phaser.Math.Angle.Between(this.playerBody.x, this.playerBody.y, wp.x, wp.y);
          this.playerBarrel.setPosition(this.playerBody.x, this.playerBody.y);
          this.playerBarrel.rotation = aim + Math.PI / 2;

          // ── Player fires (SPACE or left click) ──
          const firing = this.keySpace.isDown || controlsRef.current.fire || (ptr.isDown && !ptr.rightButtonDown());
          if (firing && time > this.lastShoot) {
            this.lastShoot = time + 280;
            this.cameras.main.shake(16, 0.003);
            const bx = this.playerBody.x + Math.cos(aim) * 24;
            const by = this.playerBody.y + Math.sin(aim) * 24;
            const b  = this.physics.add.image(bx, by, 'bulletBlue').setDepth(15).setScale(1.2);
            // velocity is set via the body
            const bBody = b.body as Phaser.Physics.Arcade.Body;
            this.physics.velocityFromRotation(aim, 950, bBody.velocity);
            this.playerBullets.add(b);
            this.time.delayedCall(2200, () => { if (b?.active) b.destroy(); });
          }

          // ── Enemy AI ──
          this.slots.forEach(slot => {
            if (!slot.alive || !slot.body.active) return;

            const dx = this.playerBody.x - slot.body.x;
            const dy = this.playerBody.y - slot.body.y;
            const dist = Math.hypot(dx, dy);

            // Aim barrel at player
            const aimE = Phaser.Math.Angle.Between(slot.body.x, slot.body.y, this.playerBody.x, this.playerBody.y);
            slot.barrel.setPosition(slot.body.x, slot.body.y).rotation = aimE + Math.PI / 2;
            slot.label.setPosition(slot.body.x, slot.body.y - 58);
            this._drawHpBar(slot.hpBar, slot.body.x, slot.body.y, slot.hp, 3);

            const eb = slot.body.body as Phaser.Physics.Arcade.Body;
            if (dist < 700 && dist > 90) {
              // Steer and chase
              const desired = aimE + Math.PI / 2;
              const diff = Phaser.Math.Angle.Wrap(desired - (slot.body.rotation - Math.PI / 2));
              slot.body.rotation += diff * 0.025;
              this.physics.velocityFromRotation(slot.body.rotation - Math.PI / 2, 50, eb.velocity);
            } else {
              // Patrol
              if (time - (slot as any).lastPatrol > 2200) {
                (slot as any).lastPatrol = time;
                eb.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40));
              }
            }

            // Fire at player when close
            if (dist < 550 && time > slot.lastShoot) {
              slot.lastShoot = time + 2600 + Phaser.Math.Between(0, 900);
              const ex = slot.barrel.x + Math.cos(aimE) * 22;
              const ey = slot.barrel.y + Math.sin(aimE) * 22;
              const eb2 = this.physics.add.image(ex, ey, 'bulletRed').setDepth(15).setScale(1.1);
              const b2body = eb2.body as Phaser.Physics.Arcade.Body;
              this.physics.velocityFromRotation(aimE, 580, b2body.velocity);
              slot.bullets.add(eb2);
              this.time.delayedCall(2200, () => { if (eb2?.active) eb2.destroy(); });
            }
          });
        }
      }

      // ── Launch Phaser ──────────────────────────────────────────────────
      const cfg: any = {
        type: Phaser.CANVAS,
        backgroundColor: '#111827',
        parent: containerRef.current!,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [PreloaderScene, GameScene],
        render: { antialias: true, pixelArt: false },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width:  window.innerWidth,
          height: window.innerHeight,
        },
      };
      const game = new Phaser.Game(cfg);
      gameRef.current = game;
    })().catch((error) => {
      console.error('Tank Word failed to initialize', error);
      if (!destroyed) setInitError(true);
    });

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const handleReplay = () => window.location.reload();
  const hearts = Array(5).fill(0);

  return (
    <main className="h-screen overflow-hidden relative select-none" style={{ background: '#0d1117' }}>
      <div ref={containerRef} className="w-full h-full" />

      {initError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-sm rounded-3xl border border-cyan-500/40 bg-slate-900 p-6 shadow-2xl">
            <h1 className="text-2xl font-black text-cyan-300">Không tải được Tank Word</h1>
            <p className="mt-2 text-sm text-slate-300">Hãy tải lại trang để khởi động lại game.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-cyan-400 px-6 py-3 font-black text-slate-950">Tải lại</button>
          </div>
        </div>
      )}

      {/* ── HUD ── */}
      {!gameOver && (
        <div className="absolute top-0 inset-x-0 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, transparent 100%)' }}>
          <div className="flex items-center justify-between px-4 py-2 gap-3">

            {/* Back */}
            <div className="pointer-events-auto shrink-0">
              <Link href="/games"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-cyan-800 bg-black/50 transition-colors">
                ← Quay lại
              </Link>
            </div>

            {/* Target */}
            <div className="flex flex-col items-center gap-0">
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Bắn xe tăng mang từ:</span>
              <span className="max-w-[44vw] truncate text-yellow-300 font-black text-xl leading-tight drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">
                {target || '…'}
              </span>
            </div>

            {/* Score + HP */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <div className="text-yellow-400 font-black text-base">Score {score}</div>
                <div className="text-white/40 text-[10px]">{kills}/{KILLS_TO_WIN} kill</div>
              </div>
              <div className="flex gap-0.5">
                {hearts.map((_, i) => (
                  <span key={i} className={`text-sm transition-all duration-300 ${i < hp ? 'opacity-100' : 'opacity-20'}`}>
                    {i < hp ? '♥' : '♡'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Kill progress bar */}
          <div className="px-4 pb-1.5">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden max-w-[200px] mx-auto">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(kills / KILLS_TO_WIN) * 100}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                  boxShadow: '0 0 8px #22d3ee88',
                }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback flash ── */}
      {feedback && !gameOver && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full font-black text-white text-lg pointer-events-none
          shadow-2xl animate-bounce ${feedback === 'correct' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-600 shadow-red-600/50'}`}>
          {feedback === 'correct' ? 'Chính xác! +100' : 'Sai rồi! -1 HP'}
        </div>
      )}

      {/* ── Controls hint ── */}
      {!gameOver && (
        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-[10px] text-white/25 pointer-events-none md:block z-10">
          ↑↓ tiến / lùi &nbsp;•&nbsp; ←→ quay thân &nbsp;•&nbsp; chuột ngắm &nbsp;•&nbsp; Space / Click bắn
        </div>
      )}

      {!gameOver && (
        <div className="absolute inset-x-3 bottom-8 z-20 flex items-end justify-between md:hidden">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <button type="button" aria-label="Tiến" onPointerDown={() => { controlsRef.current.up = true; }} onPointerUp={() => { controlsRef.current.up = false; }} onPointerCancel={() => { controlsRef.current.up = false; }} onPointerLeave={() => { controlsRef.current.up = false; }} className="h-12 w-12 touch-none rounded-xl border border-cyan-300/50 bg-black/60 text-xl font-black text-cyan-200">↑</button>
            <span />
            <button type="button" aria-label="Quay trái" onPointerDown={() => { controlsRef.current.left = true; }} onPointerUp={() => { controlsRef.current.left = false; }} onPointerCancel={() => { controlsRef.current.left = false; }} onPointerLeave={() => { controlsRef.current.left = false; }} className="h-12 w-12 touch-none rounded-xl border border-cyan-300/50 bg-black/60 text-xl font-black text-cyan-200">←</button>
            <button type="button" aria-label="Lùi" onPointerDown={() => { controlsRef.current.down = true; }} onPointerUp={() => { controlsRef.current.down = false; }} onPointerCancel={() => { controlsRef.current.down = false; }} onPointerLeave={() => { controlsRef.current.down = false; }} className="h-12 w-12 touch-none rounded-xl border border-cyan-300/50 bg-black/60 text-xl font-black text-cyan-200">↓</button>
            <button type="button" aria-label="Quay phải" onPointerDown={() => { controlsRef.current.right = true; }} onPointerUp={() => { controlsRef.current.right = false; }} onPointerCancel={() => { controlsRef.current.right = false; }} onPointerLeave={() => { controlsRef.current.right = false; }} className="h-12 w-12 touch-none rounded-xl border border-cyan-300/50 bg-black/60 text-xl font-black text-cyan-200">→</button>
          </div>
          <button type="button" aria-label="Bắn" onPointerDown={() => { controlsRef.current.fire = true; }} onPointerUp={() => { controlsRef.current.fire = false; }} onPointerCancel={() => { controlsRef.current.fire = false; }} onPointerLeave={() => { controlsRef.current.fire = false; }} className="h-16 w-16 touch-none rounded-full border-2 border-amber-200 bg-amber-400 text-sm font-black text-slate-950 shadow-lg active:scale-95">BẮN</button>
        </div>
      )}

      {/* ── Win ── */}
      {gameOver === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
          style={{ background: 'radial-gradient(ellipse at center, #0f2027 0%, #000000 100%)' }}>
          <div className="text-5xl font-black text-yellow-400 animate-bounce drop-shadow-[0_0_30px_gold]">WIN</div>
          <h2 className="text-5xl font-black text-yellow-400" style={{ textShadow: '0 0 20px rgba(250,204,21,0.7)' }}>CHIẾN THẮNG!</h2>
          <p className="text-white/80 text-lg">Tiêu diệt <span className="text-green-400 font-black">{kills}</span> xe tăng đúng!</p>
          <div className="text-3xl font-black text-yellow-300">Score {score} điểm</div>
          <button onClick={handleReplay}
            className="mt-2 px-10 py-4 rounded-full font-black text-xl text-black transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
            Chơi lại
          </button>
          <Link href="/games" className="text-white/40 hover:text-white text-sm underline">Quay về danh sách</Link>
        </div>
      )}

      {/* ── Lose ── */}
      {gameOver === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
          style={{ background: 'radial-gradient(ellipse at center, #1a0000 0%, #000000 100%)' }}>
          <div className="text-5xl font-black text-red-400">LOSE</div>
          <h2 className="text-5xl font-black text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.7)' }}>XE TĂNG HỎNG!</h2>
          <div className="text-3xl font-black text-orange-300">Score {score} điểm</div>
          <button onClick={handleReplay}
            className="mt-2 px-10 py-4 rounded-full font-black text-xl text-white transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)', boxShadow: '0 0 30px rgba(220,38,38,0.5)' }}>
            Thử lại
          </button>
          <Link href="/games" className="text-white/40 hover:text-white text-sm underline">Quay về danh sách</Link>
        </div>
      )}
    </main>
  );
}
