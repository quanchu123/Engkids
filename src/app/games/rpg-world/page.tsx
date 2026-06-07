'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DEFAULT_WORD_BANK, loadWordBank, toChoiceQuestions } from '@/lib/word-bank';

// ─── Vocabulary questions for battle (defaults; replaced by shared bank) ────
let VOCAB_QUESTIONS = toChoiceQuestions(DEFAULT_WORD_BANK);

const NPC_DIALOGUES = [
  { name: 'Elder Oak', msg: 'Welcome, hero!\n"Forest" = Khu rừng\nBeware the monsters ahead!' },
  { name: 'Merchant', msg: 'Buy a "Potion" = Thuốc hồi phục\nto survive the dungeon!' },
  { name: 'Villager', msg: 'The "Dragon" = Con rồng\nlives in the dark cave\nto the east.' },
  { name: 'Knight', msg: '"Armor" = Áo giáp\nand "Sword" = Thanh kiếm\nare your best friends!' },
  { name: 'Wizard', msg: '"Magic" = Ma thuật\ncan defeat any monster.\nLearn your words!' },
];

const BASE = '/games/rpg-world';
const SHEET = `${BASE}/spritesheets`;

interface BattleState {
  active: boolean;
  monsterType: 'treant' | 'mole';
  hp: number;
  maxHp: number;
  question: typeof VOCAB_QUESTIONS[0];
  result: 'none' | 'correct' | 'wrong';
}

export default function RpgWorldPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [npcMsg, setNpcMsg] = useState<string | null>(null);

  const battleRef = useRef<BattleState | null>(null);
  const scoreRef = useRef(0);
  const hpRef = useRef(3);
  // On-screen D-pad state, read every frame by the Phaser update loop.
  const moveRef = useRef({ up: false, down: false, left: false, right: false });

  // Load the shared word bank into the battle question pool.
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) VOCAB_QUESTIONS = toChoiceQuestions(bank);
    });
    return () => { active = false; };
  }, []);
  // Direct callback: Phaser registers, React calls when battle ends
  const battleResolveCbRef = useRef<((won: boolean) => void) | null>(null);

  const cbRef = useRef({
    startBattle: (_state: BattleState) => {},
    showNpc: (_msg: string) => {},
    win: () => {},
  });

  // Single clean answer handler — 1 attempt per encounter
  const handleAnswer = useCallback((choice: string) => {
    if (!battleRef.current?.active) return;
    const correct = choice === battleRef.current.question.en;

    setBattle(prev => prev ? { ...prev, result: correct ? 'correct' : 'wrong' } : null);

    if (correct) {
      scoreRef.current += 50;
      setScore(s => s + 50);
    } else {
      hpRef.current = Math.max(0, hpRef.current - 1);
      setHp(hpRef.current);
    }

    // After feedback: close battle, notify Phaser, check game-over
    setTimeout(() => {
      setBattle(null);
      battleRef.current = null;
      const cb = battleResolveCbRef.current;
      battleResolveCbRef.current = null;
      cb?.(correct);
      if (!correct && hpRef.current <= 0) setGameOver('lose');
    }, 750);
  }, []);

  useEffect(() => { battleRef.current = battle; }, [battle]);

  // Clear held D-pad direction when a battle starts or the game ends.
  useEffect(() => {
    if (battle || gameOver) moveRef.current = { up: false, down: false, left: false, right: false };
  }, [battle, gameOver]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('phaser').then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      // ─── PRELOADER ─────────────────────────────────────────────────────
      class PreloaderScene extends Phaser.Scene {
        constructor() { super({ key: 'PreloaderScene' }); }
        preload() {
          const cx = this.scale.width / 2;
          const cy = this.scale.height / 2;
          const pbar = this.add.rectangle(cx - 148, cy, 4, 20, 0x7c3aed);
          this.add.rectangle(cx, cy, 304, 24).setStrokeStyle(2, 0x7c3aed);
          this.add.text(cx, cy - 40, 'Loading RPG World...', {
            fontFamily: 'Arial', fontSize: '18px', color: '#a78bfa',
          }).setOrigin(0.5);
          this.load.on('progress', (p: number) => {
            pbar.width = 4 + 296 * p;
            pbar.x = cx - 148 + pbar.width / 2 - 2;
          });

          this.load.tilemapTiledJSON('map1', `${BASE}/tilemaps/tilemap.json`);
          this.load.image('tiles', `${BASE}/tilemaps/tileset.png`);
          this.load.spritesheet('player-walk-down',   `${SHEET}/hero/walk/hero-walk-front.png`,     { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-walk-up',     `${SHEET}/hero/walk/hero-walk-back.png`,      { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-walk-side',   `${SHEET}/hero/walk/hero-walk-side.png`,      { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-idle-down',   `${SHEET}/hero/idle/hero-idle-front.png`,     { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-idle-up',     `${SHEET}/hero/idle/hero-idle-back.png`,      { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-idle-side',   `${SHEET}/hero/idle/hero-idle-side.png`,      { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('player-attack-down', `${SHEET}/hero/attack/hero-attack-front.png`, { frameWidth: 32, frameHeight: 32 });
          this.load.spritesheet('npc',                `${BASE}/npc.png`,                            { frameWidth: 16, frameHeight: 16 });
          this.load.spritesheet('treant-walk-down',   `${SHEET}/treant/walk/treant-walk-front.png`, { frameWidth: 31, frameHeight: 35 });
          this.load.spritesheet('treant-walk-side',   `${SHEET}/treant/walk/treant-walk-side.png`,  { frameWidth: 31, frameHeight: 35 });
          this.load.spritesheet('treant-idle-down',   `${SHEET}/treant/idle/treant-idle-front.png`, { frameWidth: 31, frameHeight: 35 });
          this.load.spritesheet('mole-walk-down',     `${SHEET}/mole/walk/mole-walk-front.png`,     { frameWidth: 24, frameHeight: 24 });
          this.load.spritesheet('mole-walk-side',     `${SHEET}/mole/walk/mole-walk-side.png`,      { frameWidth: 24, frameHeight: 24 });
          this.load.spritesheet('mole-idle-down',     `${SHEET}/mole/idle/mole-idle-front.png`,     { frameWidth: 24, frameHeight: 24 });
          this.load.spritesheet('enemy-death',        `${SHEET}/misc/enemy-death.png`,              { frameWidth: 30, frameHeight: 32 });
          this.load.image('heart',       `${BASE}/heart.png`);
          this.load.image('heart-empty', `${BASE}/heart-empty.png`);
        }
        create() {
          const animDefs = [
            { key: 'player-move-down',  sheet: 'player-walk-down',  s: 0, e: 2, fps: 10 },
            { key: 'player-move-up',    sheet: 'player-walk-up',    s: 0, e: 2, fps: 10 },
            { key: 'player-move-left',  sheet: 'player-walk-side',  s: 0, e: 2, fps: 10 },
            { key: 'player-move-right', sheet: 'player-walk-side',  s: 0, e: 2, fps: 10 },
            { key: 'player-idle-down',  sheet: 'player-idle-down',  s: 0, e: 0, fps: 5  },
            { key: 'player-idle-up',    sheet: 'player-idle-up',    s: 0, e: 0, fps: 5  },
            { key: 'player-idle-side',  sheet: 'player-idle-side',  s: 0, e: 0, fps: 5  },
            { key: 'player-attack',     sheet: 'player-attack-down',s: 0, e: 2, fps: 10 },
            { key: 'treant-walk',       sheet: 'treant-walk-down',  s: 0, e: 3, fps: 7  },
            { key: 'treant-idle',       sheet: 'treant-idle-down',  s: 0, e: 0, fps: 5  },
            { key: 'mole-walk',         sheet: 'mole-walk-down',    s: 0, e: 3, fps: 7  },
            { key: 'mole-idle',         sheet: 'mole-idle-down',    s: 0, e: 0, fps: 5  },
            { key: 'enemy-death',       sheet: 'enemy-death',       s: 0, e: 6, fps: 15 },
          ];
          animDefs.forEach(a => {
            this.anims.create({
              key: a.key,
              frames: this.anims.generateFrameNumbers(a.sheet, { start: a.s, end: a.e }),
              frameRate: a.fps,
              repeat: a.key === 'enemy-death' ? 0 : -1,
              hideOnComplete: a.key === 'enemy-death',
            });
          });
          this.scene.start('GameScene');
        }
      }

      // ─── GAME SCENE ────────────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        private player!: Phaser.Physics.Arcade.Sprite;
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private monsters!: Phaser.Physics.Arcade.Group;
        private npcs!: Phaser.Physics.Arcade.Group;
        private inBattle = false;
        private battleCooldownUntil = 0;
        private usedVocab = new Set<number>();
        private killed = 0;
        private direction = 'down';

        constructor() { super({ key: 'GameScene' }); }

        create() {
          // ── Tilemap ──
          const map = this.make.tilemap({ key: 'map1' });
          const tileset = map.addTilesetImage('tileset', 'tiles', 16, 16, 0, 0);

          let groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
          let decoLayer:   Phaser.Tilemaps.TilemapLayer | null = null;

          map.layers.forEach(layerData => {
            const name = layerData.name.toLowerCase();
            const layer = map.createLayer(layerData.name, tileset!, 0, 0);
            if (!layer) return;
            if (name.includes('terrain') || name.includes('background') || name.includes('ground')) {
              groundLayer = layer;
              layer.setCollisionByProperty({ collides: true });
            } else if (name.includes('deco')) {
              decoLayer = layer;
              layer.setCollisionByProperty({ collides: true });
            }
          });

          this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

          // ── Player ──
          this.player = this.physics.add.sprite(200, 300, 'player-idle-down', 0)
            .setScale(2).setSize(10, 10).setOffset(11, 18)
            .setCollideWorldBounds(true).setDepth(10);
          this.player.play('player-idle-down');

          // ── Camera ──
          this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
          this.cameras.main.setZoom(1.5);

          if (groundLayer) this.physics.add.collider(this.player, groundLayer);
          if (decoLayer)   this.physics.add.collider(this.player, decoLayer);

          // ── Monsters ──
          this.monsters = this.physics.add.group();
          const monsterLayer = map.getObjectLayer('monsters') || map.getObjectLayer('Monsters');
          const treantPos: {x:number,y:number}[] = [];
          const molePos:   {x:number,y:number}[] = [];

          if (monsterLayer) {
            monsterLayer.objects.forEach((obj: any) => {
              if (obj.name === 'treant') treantPos.push({ x: obj.x, y: obj.y });
              else molePos.push({ x: obj.x, y: obj.y });
            });
          }
          while (treantPos.length < 3) treantPos.push({ x: 200 + treantPos.length * 130, y: 450 });
          while (molePos.length < 4) molePos.push({ x: 270 + molePos.length * 110, y: 210 });

          treantPos.forEach(pos => {
            const m = this.physics.add.sprite(pos.x, pos.y, 'treant-idle-down', 0).setScale(2).setDepth(9);
            m.play('treant-idle');
            (m as any).monsterType = 'treant';
            (m as any).hp = 3;
            (m as any)._maxHp = 3;
            this.monsters.add(m);
          });
          molePos.forEach(pos => {
            const m = this.physics.add.sprite(pos.x, pos.y, 'mole-idle-down', 0).setScale(2).setDepth(9);
            m.play('mole-idle');
            (m as any).monsterType = 'mole';
            (m as any).hp = 2;
            (m as any)._maxHp = 2;
            this.monsters.add(m);
          });

          if (groundLayer) this.physics.add.collider(this.monsters, groundLayer);
          if (decoLayer)   this.physics.add.collider(this.monsters, decoLayer);

          // ── NPCs ──
          this.npcs = this.physics.add.group();
          const npcLayer = map.getObjectLayer('npcs') || map.getObjectLayer('Npcs') || map.getObjectLayer('NPCS');
          const npcPositions: {x:number,y:number,msg:string}[] = [];

          if (npcLayer) {
            npcLayer.objects.forEach((obj: any, i: number) => {
              npcPositions.push({ x: obj.x, y: obj.y, msg: NPC_DIALOGUES[i % NPC_DIALOGUES.length].msg });
            });
          }
          if (npcPositions.length === 0) {
            NPC_DIALOGUES.forEach((d, i) => npcPositions.push({ x: 150 + i * 90, y: 350, msg: d.msg }));
          }
          npcPositions.forEach(pos => {
            const n = this.physics.add.sprite(pos.x, pos.y, 'npc', 0).setScale(2).setDepth(9).setImmovable(true);
            (n.body as Phaser.Physics.Arcade.Body).moves = false;
            (n as any).dialogue = pos.msg;
            this.npcs.add(n);
          });

          // ── Player-Monster overlap → trigger battle ──
          this.physics.add.overlap(this.player, this.monsters, (_p, monster: any) => {
            if (this.inBattle || !monster.active || this.time.now < this.battleCooldownUntil) return;
            this.inBattle = true;

            // Push player far back so they don't immediately re-trigger
            const dx = this.player.x - monster.x;
            const dy = this.player.y - monster.y;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            this.player.setVelocity((dx / norm) * 320, (dy / norm) * 320);
            this.time.delayedCall(500, () => { if (this.player?.active) this.player.setVelocity(0, 0); });

            // Register direct callback — no event bus
            battleResolveCbRef.current = (won: boolean) => {
              this.inBattle = false;
              this.battleCooldownUntil = this.time.now + 2500; // 2.5s cooldown after each battle
              if (won && monster.active) {
                monster.hp--;
                if (monster.hp <= 0) {
                  monster.setVelocity(0, 0);
                  monster.play('enemy-death');
                  monster.once('animationcomplete-enemy-death', () => {
                    monster.destroy();
                    this.killed++;
                    if (this.killed >= 5) cbRef.current.win();
                  });
                }
              }
            };

            const q = this._pickQuestion();
            cbRef.current.startBattle({
              active: true,
              monsterType: monster.monsterType,
              hp: monster.hp,
              maxHp: monster._maxHp,
              question: q,
              result: 'none',
            });
          });

          // ── Player-NPC overlap → show dialogue ──
          this.physics.add.overlap(this.player, this.npcs, (_p, npc: any) => {
            if (npc.lastTalk && this.time.now - npc.lastTalk < 5000) return;
            npc.lastTalk = this.time.now;
            cbRef.current.showNpc(npc.dialogue);
          });

          // ── Wire up React callbacks ──
          cbRef.current.startBattle = (state: BattleState) => setBattle({ ...state });
          cbRef.current.showNpc = (msg: string) => {
            setNpcMsg(msg);
            setTimeout(() => setNpcMsg(null), 4500);
          };
          cbRef.current.win = () => setGameOver('win');

          // ── Keyboard ──
          this.cursors = this.input.keyboard!.createCursorKeys();
        }

        update() {
          if (!this.player?.active) return;

          if (this.inBattle) {
            this.player.setVelocity(0, 0);
            return;
          }

          // ── Player movement (keyboard arrows + on-screen D-pad) ──
          const c = this.cursors;
          const m = moveRef.current;
          const left = c.left.isDown || m.left;
          const right = c.right.isDown || m.right;
          const up = c.up.isDown || m.up;
          const down = c.down.isDown || m.down;
          const spd = 110;

          if (left) {
            this.player.setVelocity(-spd, 0);
            this.player.setFlipX(true);
            this.player.play('player-move-left', true);
            this.direction = 'left';
          } else if (right) {
            this.player.setVelocity(spd, 0);
            this.player.setFlipX(false);
            this.player.play('player-move-right', true);
            this.direction = 'right';
          } else if (up) {
            this.player.setVelocity(0, -spd);
            this.player.play('player-move-up', true);
            this.direction = 'up';
          } else if (down) {
            this.player.setVelocity(0, spd);
            this.player.play('player-move-down', true);
            this.direction = 'down';
          } else {
            this.player.setVelocity(0, 0);
            const idle = this.direction === 'up' ? 'player-idle-up'
              : (this.direction === 'left' || this.direction === 'right') ? 'player-idle-side'
              : 'player-idle-down';
            this.player.play(idle, true);
          }

          // ── Monster AI (per-frame smooth chase/patrol) ──
          this.monsters.getChildren().forEach((m: any) => {
            if (!m.active) return;
            const dx = this.player.x - m.x;
            const dy = this.player.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = m.monsterType === 'treant' ? 38 : 58;

            if (dist < 200 && dist > 15) {
              m.setVelocity((dx / dist) * speed, (dy / dist) * speed);
              m.play(m.monsterType === 'treant' ? 'treant-walk' : 'mole-walk', true);
            } else if (dist >= 200) {
              if (!m.lastPatrol || this.time.now - m.lastPatrol > 2000) {
                m.patrolVx = Phaser.Math.Between(-22, 22);
                m.patrolVy = Phaser.Math.Between(-22, 22);
                m.lastPatrol = this.time.now;
              }
              m.setVelocity(m.patrolVx || 0, m.patrolVy || 0);
              if (m.patrolVx !== 0 || m.patrolVy !== 0) {
                m.play(m.monsterType === 'treant' ? 'treant-walk' : 'mole-walk', true);
              } else {
                m.play(m.monsterType === 'treant' ? 'treant-idle' : 'mole-idle', true);
              }
            }
          });
        }

        private _pickQuestion() {
          if (this.usedVocab.size >= VOCAB_QUESTIONS.length) this.usedVocab.clear();
          let idx: number;
          do { idx = Phaser.Math.Between(0, VOCAB_QUESTIONS.length - 1); } while (this.usedVocab.has(idx));
          this.usedVocab.add(idx);
          return VOCAB_QUESTIONS[idx];
        }
      }

      // ─── Launch Phaser (full-screen RESIZE mode) ───────────────────────
      const config: any = {
        type: Phaser.AUTO,
        backgroundColor: '#1a2e05',
        parent: containerRef.current!,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [PreloaderScene, GameScene],
        render: { pixelArt: true, antialias: false },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const handleReplay = () => window.location.reload();
  const hearts = [0, 1, 2];

  return (
    <main className="h-screen overflow-hidden bg-black relative">
      {/* Full-screen Phaser canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── HUD top bar ── */}
      {!gameOver && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
        >
          <div className="pointer-events-auto">
            <Link
              href="/games"
              className="text-emerald-400 hover:text-white text-sm font-bold px-3 py-1.5 bg-black/50 rounded-lg border border-emerald-700 transition-colors"
            >
              ← Quay lại
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 font-black text-lg drop-shadow">Score {score}</span>
            <div className="flex gap-1">
              {hearts.map((_, i) => (
                <Image
                  key={i}
                  src={i < hp ? `${BASE}/heart.png` : `${BASE}/heart-empty.png`}
                  alt=""
                  width={24}
                  height={24}
                  className={`w-6 h-6 object-contain transition-all duration-300 ${i < hp ? "" : "opacity-25 grayscale"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Controls hint (bottom) ── */}
      {!gameOver && !battle && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white/35 text-xs pointer-events-none select-none">
          Dùng phím mũi tên hoặc nút điều hướng &nbsp;·&nbsp; Chạm quái → chiến đấu &nbsp;·&nbsp; Diệt 5 quái để thắng!
        </div>
      )}

      {/* ── On-screen D-pad (touch controls for mobile) ── */}
      {!gameOver && !battle && (
        <div
          className="absolute bottom-5 right-5 z-20 select-none"
          style={{ width: 168, height: 168, touchAction: 'none' }}
        >
          {([
            { dir: 'up', label: '▲', style: 'left-1/2 top-0 -translate-x-1/2' },
            { dir: 'left', label: '◀', style: 'left-0 top-1/2 -translate-y-1/2' },
            { dir: 'right', label: '▶', style: 'right-0 top-1/2 -translate-y-1/2' },
            { dir: 'down', label: '▼', style: 'left-1/2 bottom-0 -translate-x-1/2' },
          ] as const).map((b) => {
            const press = (on: boolean) => () => { moveRef.current[b.dir] = on; };
            return (
              <button
                key={b.dir}
                aria-label={b.dir}
                onPointerDown={(e) => { e.preventDefault(); moveRef.current[b.dir] = true; }}
                onPointerUp={press(false)}
                onPointerLeave={press(false)}
                onPointerCancel={press(false)}
                onContextMenu={(e) => e.preventDefault()}
                className={`absolute ${b.style} flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white active:scale-90`}
                style={{
                  background: 'rgba(124,58,237,0.45)',
                  border: '2px solid rgba(167,139,250,0.7)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                  touchAction: 'none',
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Battle Overlay ── */}
      {battle && !gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, rgba(0,0,0,0.85) 100%)' }}>
          <div className="w-full max-w-xs mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1e1040 0%, #0f172a 100%)', boxShadow: '0 0 60px rgba(124,58,237,0.3)' }}>

            {/* Monster header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/10">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-4xl"
                style={{ background: battle.monsterType === 'treant' ? '#14532d44' : '#3b0764aa' }}>
                {battle.monsterType === 'treant' ? 'TR' : 'MO'}
              </div>
              <div className="flex-1">
                <div className="text-white font-black text-base">
                  {battle.monsterType === 'treant' ? 'Treant' : 'Mole'} tấn công!
                </div>
                <div className="flex gap-1 mt-1.5">
                  {Array(battle.maxHp).fill(0).map((_, i) => (
                    <div key={i} className="h-2 rounded-full transition-all"
                      style={{ width: '18px', background: i < battle.hp ? '#ef4444' : '#374151' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-2">
              {/* Question */}
              <div className="rounded-xl p-3 mb-4 text-center"
                style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.35)' }}>
                <div className="text-yellow-400/70 text-[11px] font-bold uppercase tracking-wider mb-1">Dịch sang tiếng Anh</div>
                <div className="text-yellow-200 font-black text-2xl">&quot;{battle.question.vi}&quot;</div>
              </div>

              {/* Result */}
              {battle.result !== 'none' && (
                <div className={`text-center font-black text-lg mb-3 py-2 rounded-xl ${
                  battle.result === 'correct'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {battle.result === 'correct' ? 'Chính xác! +50 điểm' : 'Sai rồi! -1 HP'}
                </div>
              )}

              {/* Choices */}
              {battle.result === 'none' && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {battle.question.choices.map(c => (
                    <button key={c} onClick={() => handleAnswer(c)}
                      className="py-3 px-2 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-105 active:scale-95"
                      style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.5)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.25)'}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NPC Dialogue ── */}
      {npcMsg && !battle && !gameOver && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/95 border-2 border-blue-400 rounded-xl px-5 py-3 max-w-xs text-center z-10 shadow-xl pointer-events-none">
          <div className="text-blue-300 text-xs font-bold mb-1">NPC</div>
          <div className="text-white text-sm font-semibold whitespace-pre-line">{npcMsg}</div>
        </div>
      )}

      {/* ── Win Overlay ── */}
      {gameOver === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
          style={{ background: 'radial-gradient(ellipse at center, #052e16 0%, #000000 100%)' }}>
          <div className="text-4xl font-black text-yellow-400 animate-bounce">WIN</div>
          <h2 className="text-5xl font-black text-yellow-400" style={{ textShadow: '0 0 30px rgba(250,204,21,0.7)' }}>CHIẾN THẮNG!</h2>
          <p className="text-white/70 text-lg">Điểm: <span className="text-yellow-400 font-black text-2xl">{score}</span></p>
          <button onClick={handleReplay}
            className="px-10 py-4 rounded-full font-black text-xl text-black hover:scale-105 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
            Chơi lại
          </button>
          <Link href="/games" className="text-white/40 hover:text-white text-sm underline">
            Quay về danh sách game
          </Link>
        </div>
      )}

      {/* ── Lose Overlay ── */}
      {gameOver === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
          style={{ background: 'radial-gradient(ellipse at center, #1c0505 0%, #000000 100%)' }}>
          <div className="text-4xl font-black text-red-400">LOSE</div>
          <h2 className="text-5xl font-black text-red-400" style={{ textShadow: '0 0 30px rgba(239,68,68,0.7)' }}>GAME OVER</h2>
          <p className="text-white/70 text-lg">Điểm: <span className="text-orange-400 font-black text-2xl">{score}</span></p>
          <button onClick={handleReplay}
            className="px-10 py-4 rounded-full font-black text-xl text-white hover:scale-105 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
            Thử lại
          </button>
          <Link href="/games" className="text-white/40 hover:text-white text-sm underline">
            Quay về danh sách game
          </Link>
        </div>
      )}
    </main>
  );
}
