'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DEFAULT_WORD_BANK, loadWordBank, toChoiceQuestions } from '@/lib/word-bank';

// ─── Vocabulary questions for battle (defaults; replaced by shared bank) ────
let VOCAB_QUESTIONS = toChoiceQuestions(DEFAULT_WORD_BANK);

const NPC_DIALOGUES = [
  { name: 'Trưởng lão Oak', msg: 'Chào mừng, dũng sĩ!\n"Dungeon" = Hầm ngục\nHãy cẩn thận với quái vật!' },
  { name: 'Thương nhân', msg: '"Potion" = Thuốc hồi phục\nHọc đúng từ để giữ trọn sinh lực nhé!' },
  { name: 'Người canh cửa', msg: '"Dragon" = Con rồng\nNó đang ngủ sau cánh cửa lớn phía bắc.' },
  { name: 'Hiệp sĩ', msg: '"Armor" = Áo giáp\n"Sword" = Thanh kiếm\nĐó là hành trang của một anh hùng!' },
  { name: 'Pháp sư', msg: '"Magic" = Ma thuật\nKiến thức chính là phép thuật mạnh nhất.' },
];

const BASE = '/games/rpg-world';
const SHEET = `${BASE}/spritesheets`;
const MAP_SIZE = 1254;
const MONSTERS_TO_WIN = 8;
const MAX_HP = 3;
const PLAYER_SPEED = 175;
const SAFE_FLOOR_BOUNDS = { left: 62, right: 1192, top: 84, bottom: 1168 } as const;
const TREASURE_CHEST = { x: 1008, y: 288, width: 240, height: 210 } as const;

// Collision rectangles trace the visible masonry and large props in
// dungeon-map-v2.png. Coordinates use the original 1254×1254 image pixels.
const DUNGEON_WALLS = [
  // Outer stone frame — thicker at the top so the hero's feet never reach it.
  [0, 0, MAP_SIZE, 72], [0, 1174, MAP_SIZE, 80],
  [0, 0, 56, MAP_SIZE], [1198, 0, 56, MAP_SIZE],

  // Upper room dividers and their lower walls.
  [390, 24, 52, 374], [812, 24, 54, 374],
  [24, 402, 174, 62], [302, 402, 87, 62],
  [865, 402, 126, 62], [1082, 402, 148, 62],

  // Central hall side walls; the gaps are the actual walkable doorways.
  [286, 448, 86, 158], [286, 690, 86, 142],
  [882, 448, 86, 158], [882, 690, 86, 142],
  [410, 405, 136, 82], [708, 405, 136, 82],
  [410, 746, 148, 88], [696, 746, 148, 88],

  // Lower room dividers and upper walls.
  [24, 776, 174, 58], [302, 776, 87, 58],
  [865, 776, 126, 58], [1082, 776, 148, 58],
  [388, 834, 52, 390], [814, 834, 54, 390],

  // Large visible props that cannot be walked through.
  [154, 202, 174, 176],
  [930, 198, 182, 146], // treasure chest and rug
  [158, 922, 206, 174], [926, 922, 206, 174],
  [72, 506, 126, 94], [1050, 500, 128, 102],
] as const;

const TREANT_POSITIONS = [
  { x: 238, y: 178 }, { x: 1008, y: 184 }, { x: 222, y: 581 }, { x: 1030, y: 584 },
];
const MOLE_POSITIONS = [
  { x: 487, y: 330 }, { x: 768, y: 332 }, { x: 527, y: 910 }, { x: 746, y: 914 },
];
const NPC_POSITIONS = [
  { x: 620, y: 1050 }, { x: 510, y: 532 }, { x: 748, y: 530 }, { x: 224, y: 690 }, { x: 1031, y: 690 },
];

const TORCH_POSITIONS = [
  [157, 88], [326, 91], [532, 101], [716, 105], [925, 89], [1093, 88],
  [341, 548], [515, 489], [735, 489], [915, 549],
  [316, 655], [937, 653], [433, 972], [804, 970], [166, 1152], [1093, 1150],
] as const;

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
  const [defeated, setDefeated] = useState(0);

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
    progress: (_count: number) => {},
    reward: (_kind: 'score' | 'hp', _amount: number) => {},
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
          this.add.text(cx, cy - 40, 'Đang mở cổng hầm ngục...', {
            fontFamily: 'Arial', fontSize: '18px', color: '#67e8f9',
          }).setOrigin(0.5);
          this.load.on('progress', (p: number) => {
            pbar.width = 4 + 296 * p;
            pbar.x = cx - 148 + pbar.width / 2 - 2;
          });

          this.load.image('dungeon-map', `${BASE}/dungeon-map-v2.png`);
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
            { key: 'enemy-death',       sheet: 'enemy-death',       s: 0, e: 5, fps: 15 },
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
        private walls!: Phaser.Physics.Arcade.StaticGroup;
        private inBattle = false;
        private battleCooldownUntil = 0;
        private usedVocab = new Set<number>();
        private killed = 0;
        private direction = 'down';

        constructor() { super({ key: 'GameScene' }); }

        create() {
          // ── Hand-painted dungeon environment ──
          this.add.image(MAP_SIZE / 2, MAP_SIZE / 2, 'dungeon-map')
            .setDisplaySize(MAP_SIZE, MAP_SIZE)
            .setDepth(0);
          this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

          // The cyan rune and wall torches get a subtle animated glow so the
          // generated map feels alive while keeping the canvas light-weight.
          const runeGlow = this.add.circle(627, 625, 96, 0x22d3ee, 0.08)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
          this.tweens.add({
            targets: runeGlow, alpha: { from: 0.045, to: 0.14 }, scale: { from: 0.9, to: 1.12 },
            duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
          TORCH_POSITIONS.forEach(([x, y], index) => {
            const glow = this.add.circle(x, y, 34, 0xff9b35, 0.075)
              .setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
            this.tweens.add({
              targets: glow, alpha: { from: 0.035, to: 0.13 }, scale: { from: 0.82, to: 1.18 },
              duration: 720 + (index % 5) * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
          });

          // Invisible blockers match the large architectural silhouettes.
          this.walls = this.physics.add.staticGroup();
          DUNGEON_WALLS.forEach(([x, y, width, height]) => {
            const wall = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x000000, 0);
            this.physics.add.existing(wall, true);
            this.walls.add(wall);
          });

          // ── Player ──
          this.player = this.physics.add.sprite(627, 1090, 'player-idle-up', 0)
            .setScale(2.4).setSize(10, 10).setOffset(11, 18)
            .setCollideWorldBounds(true).setDepth(10);
          this.player.play('player-idle-up');
          this.player.setData({ safeX: this.player.x, safeY: this.player.y });

          // ── Treasure chest ──
          // The chest artwork is baked into the map. This larger proximity
          // zone lets the player open it while the chest itself remains solid.
          const chestZone = this.add.zone(
            TREASURE_CHEST.x,
            TREASURE_CHEST.y,
            TREASURE_CHEST.width,
            TREASURE_CHEST.height,
          );
          this.physics.add.existing(chestZone, true);

          const chestFrame = this.add.rectangle(
            TREASURE_CHEST.x,
            TREASURE_CHEST.y,
            164,
            126,
            0xffc857,
            0.025,
          ).setStrokeStyle(3, 0xfbbf24, 0.9).setDepth(6);
          const chestLabel = this.add.text(TREASURE_CHEST.x, 368, 'RƯƠNG BÁU\nChạm để mở', {
            fontFamily: 'Arial', fontStyle: 'bold', fontSize: '13px', color: '#fde68a',
            align: 'center', stroke: '#1c1004', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(7);
          this.tweens.add({
            targets: chestFrame, alpha: { from: 0.45, to: 1 }, scale: { from: 0.97, to: 1.04 },
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });

          this.physics.add.overlap(this.player, chestZone, () => {
            if (chestZone.getData('opened')) return;
            chestZone.setData('opened', true);

            const canHeal = hpRef.current < MAX_HP;
            const rewardHp = canHeal && Phaser.Math.Between(0, 1) === 0;
            const rewardKind = rewardHp ? 'hp' : 'score';
            const amount = rewardHp ? 1 : 150;
            cbRef.current.reward(rewardKind, amount);

            chestFrame.setFillStyle(0x111827, 0.5).setStrokeStyle(2, 0x64748b, 0.65);
            chestLabel.setText('RƯƠNG ĐÃ MỞ').setColor('#94a3b8');
            this.tweens.killTweensOf(chestFrame);

            for (let i = 0; i < 14; i++) {
              const spark = this.add.circle(TREASURE_CHEST.x, TREASURE_CHEST.y, 3, rewardHp ? 0xfb7185 : 0xfacc15, 1)
                .setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
              const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
              const distance = Phaser.Math.Between(35, 95);
              this.tweens.add({
                targets: spark,
                x: TREASURE_CHEST.x + Math.cos(angle) * distance,
                y: TREASURE_CHEST.y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.2,
                duration: Phaser.Math.Between(500, 900),
                onComplete: () => spark.destroy(),
              });
            }

            const rewardText = this.add.text(
              TREASURE_CHEST.x,
              TREASURE_CHEST.y - 40,
              rewardHp ? '+1 HP' : '+150 ĐIỂM',
              {
                fontFamily: 'Arial', fontStyle: 'bold', fontSize: '23px',
                color: rewardHp ? '#fb7185' : '#fde047', stroke: '#020617', strokeThickness: 5,
              },
            ).setOrigin(0.5).setDepth(26);
            this.tweens.add({
              targets: rewardText, y: rewardText.y - 70, alpha: 0, duration: 1400,
              onComplete: () => rewardText.destroy(),
            });
          });

          // ── Camera ──
          this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
          this.cameras.main.setZoom(this.scale.width < 720 ? 0.82 : 1.03);
          this.cameras.main.fadeIn(700, 4, 12, 25);
          this.physics.add.collider(this.player, this.walls);

          // ── Monsters ──
          this.monsters = this.physics.add.group();
          TREANT_POSITIONS.forEach(pos => {
            const m = this.physics.add.sprite(pos.x, pos.y, 'treant-idle-down', 0).setScale(2.25).setDepth(9);
            m.play('treant-idle');
            (m as any).monsterType = 'treant';
            (m as any).hp = 3;
            (m as any)._maxHp = 3;
            m.setData({ safeX: m.x, safeY: m.y });
            this.monsters.add(m);
          });
          MOLE_POSITIONS.forEach(pos => {
            const m = this.physics.add.sprite(pos.x, pos.y, 'mole-idle-down', 0).setScale(2.45).setDepth(9);
            m.play('mole-idle');
            (m as any).monsterType = 'mole';
            (m as any).hp = 2;
            (m as any)._maxHp = 2;
            m.setData({ safeX: m.x, safeY: m.y });
            this.monsters.add(m);
          });

          this.physics.add.collider(this.monsters, this.walls);
          this.physics.add.collider(this.monsters, this.monsters);

          // ── NPCs ──
          this.npcs = this.physics.add.group();
          NPC_POSITIONS.forEach((pos, index) => {
            const dialogue = NPC_DIALOGUES[index % NPC_DIALOGUES.length];
            const n = this.physics.add.sprite(pos.x, pos.y, 'npc', 0).setScale(2.35).setDepth(9).setImmovable(true);
            (n.body as Phaser.Physics.Arcade.Body).moves = false;
            (n as any).dialogue = `${dialogue.name}\n${dialogue.msg}`;
            this.npcs.add(n);
          });

          // ── Player-Monster overlap → trigger battle ──
          this.physics.add.overlap(this.player, this.monsters, (_p, monster: any) => {
            if (this.inBattle || !monster.active || monster._dying || this.time.now < this.battleCooldownUntil) return;
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
                // ── Hit feedback: slash spark, damage text, red flash, shake ──
                this.player.play('player-attack', true);
                this.time.delayedCall(380, () => {
                  if (this.player?.active) this.player.play('player-idle-down', true);
                });
                const spark = this.add.circle(monster.x, monster.y, 6, 0xffffff)
                  .setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({ targets: spark, scale: 3, alpha: 0, duration: 320, onComplete: () => spark.destroy() });
                const dmg = this.add.text(monster.x, monster.y - 18, '-1', {
                  fontFamily: 'Arial', fontStyle: 'bold', fontSize: '16px', color: '#ff5555',
                  stroke: '#000000', strokeThickness: 3,
                }).setOrigin(0.5).setDepth(26);
                this.tweens.add({ targets: dmg, y: monster.y - 46, alpha: 0, duration: 700, onComplete: () => dmg.destroy() });
                monster.setTint(0xff6666);
                this.time.delayedCall(220, () => { if (monster.active) monster.clearTint(); });
                this.cameras.main.shake(140, 0.006);

                monster.hp--;
                if (monster.hp <= 0) {
                  monster._dying = true;
                  if (monster.body) monster.body.enable = false;
                  if (monster._hpBar) { monster._hpBar.destroy(); monster._hpBar = null; }
                  monster.setVelocity(0, 0);
                  const finish = () => {
                    if (monster._dead) return;
                    monster._dead = true;
                    monster.destroy();
                    this.killed++;
                    cbRef.current.progress(this.killed);
                    if (this.killed >= MONSTERS_TO_WIN) cbRef.current.win();
                  };
                  monster.play('enemy-death');
                  monster.once('animationcomplete-enemy-death', finish);
                  this.time.delayedCall(1000, finish); // safety net if the anim event misses
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
          cbRef.current.progress = (count: number) => setDefeated(count);
          cbRef.current.reward = (kind: 'score' | 'hp', amount: number) => {
            if (kind === 'hp') {
              hpRef.current = Math.min(MAX_HP, hpRef.current + amount);
              setHp(hpRef.current);
              cbRef.current.showNpc(`Rương báu\nNhận được +${amount} HP!`);
              return;
            }

            scoreRef.current += amount;
            setScore(scoreRef.current);
            cbRef.current.showNpc(`Rương báu\nNhận được +${amount} điểm!`);
          };
          cbRef.current.win = () => setGameOver('win');

          // ── Keyboard ──
          this.cursors = this.input.keyboard!.createCursorKeys();
        }

        update() {
          if (!this.player?.active) return;

          // Physics collision handles normal wall contact. This nav-mesh
          // fail-safe also catches high-speed knockback or a missed frame, so
          // neither the hero nor a monster can ever enter masonry/outside map.
          this._keepOnFloor(this.player, 8);

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
          const spd = PLAYER_SPEED;

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
            if (!m.active || m._dying) return;
            this._keepOnFloor(m, 9);
            const dx = this.player.x - m.x;
            const dy = this.player.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = m.monsterType === 'treant' ? 34 : 50;

            if (dist < 200 && dist > 15) {
              m.setVelocity((dx / dist) * speed, (dy / dist) * speed);
              m.play(m.monsterType === 'treant' ? 'treant-walk' : 'mole-walk', true);
            } else if (dist >= 200) {
              if (!m.lastPatrol || this.time.now - m.lastPatrol > 2000) {
                m.patrolVx = Phaser.Math.Between(-18, 18);
                m.patrolVy = Phaser.Math.Between(-18, 18);
                m.lastPatrol = this.time.now;
              }
              m.setVelocity(m.patrolVx || 0, m.patrolVy || 0);
              if (m.patrolVx !== 0 || m.patrolVy !== 0) {
                m.play(m.monsterType === 'treant' ? 'treant-walk' : 'mole-walk', true);
              } else {
                m.play(m.monsterType === 'treant' ? 'treant-idle' : 'mole-idle', true);
              }
            }

            // ── Floating HP bar above the monster ──
            if (!m._hpBar) m._hpBar = this.add.graphics().setDepth(20);
            const bar = m._hpBar as Phaser.GameObjects.Graphics;
            bar.clear();
            const bw = 28, bh = 5;
            const bx = m.x - bw / 2;
            const by = m.y - m.displayHeight / 2 - 8;
            bar.fillStyle(0x000000, 0.55); bar.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            bar.fillStyle(0x2b2b2b, 1); bar.fillRect(bx, by, bw, bh);
            const pct = Math.max(0, m.hp) / m._maxHp;
            const col = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xeab308 : 0xef4444;
            bar.fillStyle(col, 1); bar.fillRect(bx, by, bw * pct, bh);
          });
        }

        private _isWalkable(x: number, y: number, margin: number) {
          if (
            x < SAFE_FLOOR_BOUNDS.left || x > SAFE_FLOOR_BOUNDS.right ||
            y < SAFE_FLOOR_BOUNDS.top || y > SAFE_FLOOR_BOUNDS.bottom
          ) return false;

          return !DUNGEON_WALLS.some(([wallX, wallY, width, height]) => (
            x > wallX - margin && x < wallX + width + margin &&
            y > wallY - margin && y < wallY + height + margin
          ));
        }

        private _keepOnFloor(sprite: Phaser.Physics.Arcade.Sprite, margin: number) {
          const safeX = Number(sprite.getData('safeX') ?? sprite.x);
          const safeY = Number(sprite.getData('safeY') ?? sprite.y);
          const x = Phaser.Math.Clamp(sprite.x, SAFE_FLOOR_BOUNDS.left, SAFE_FLOOR_BOUNDS.right);
          const y = Phaser.Math.Clamp(sprite.y, SAFE_FLOOR_BOUNDS.top, SAFE_FLOOR_BOUNDS.bottom);

          let nextX = safeX;
          let nextY = safeY;

          if (this._isWalkable(x, y, margin)) {
            nextX = x;
            nextY = y;
          } else if (this._isWalkable(x, safeY, margin)) {
            nextX = x;
          } else if (this._isWalkable(safeX, y, margin)) {
            nextY = y;
          }

          sprite.setData('safeX', nextX);
          sprite.setData('safeY', nextY);

          if (nextX !== sprite.x || nextY !== sprite.y) {
            const body = sprite.body as Phaser.Physics.Arcade.Body;
            sprite.setPosition(nextX, nextY);
            body.updateFromGameObject();
            if (nextX !== x) body.setVelocityX(0);
            if (nextY !== y) body.setVelocityY(0);
          }
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
        transparent: true,
        parent: containerRef.current!,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: [PreloaderScene, GameScene],
        render: { pixelArt: false, antialias: true, roundPixels: true },
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
    <main className="h-screen overflow-hidden bg-[#020611] relative">
      <div
        aria-hidden="true"
        className="absolute inset-[-5%] scale-110 opacity-40 blur-2xl"
        style={{
          backgroundImage: `linear-gradient(rgba(1,5,14,.45), rgba(1,5,14,.72)), url(${BASE}/dungeon-map-v2.png)`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      {/* Full-screen Phaser canvas */}
      <div ref={containerRef} className="relative z-[1] w-full h-full" />

      {/* ── HUD top bar ── */}
      {!gameOver && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5 pointer-events-none">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              aria-label="Quay lại danh sách trò chơi"
              className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border-2 border-amber-400/70 bg-slate-950/85 text-xl font-black text-amber-200 shadow-[0_5px_20px_rgba(0,0,0,.55)] backdrop-blur-md transition hover:scale-105 hover:border-amber-300"
            >
              ←
            </Link>
            <div className="hidden rounded-2xl border border-cyan-300/25 bg-slate-950/80 px-4 py-2 shadow-xl backdrop-blur-md sm:block">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-300/75">Nhiệm vụ</p>
              <p className="text-sm font-black text-white">Bí mật Hầm Ngục Cổ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-2xl border border-amber-400/35 bg-slate-950/85 px-3 py-2 text-right shadow-xl backdrop-blur-md">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300/70">Điểm</p>
              <p className="text-base font-black leading-none text-amber-300">✦ {score}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/30 bg-slate-950/85 px-3 py-2 shadow-xl backdrop-blur-md">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[.2em] text-rose-300/70">Sinh lực</p>
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
        </div>
      )}

      {!gameOver && (
        <div className="pointer-events-none absolute left-3 top-[76px] z-10 w-44 rounded-2xl border border-white/10 bg-slate-950/75 p-3 shadow-xl backdrop-blur-md sm:left-5 sm:top-[92px]">
          <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
            <span className="text-slate-300">Quái đã hạ</span>
            <span className="text-cyan-300">{defeated}/{MONSTERS_TO_WIN}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-500"
              style={{ width: `${(defeated / MONSTERS_TO_WIN) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Controls hint (bottom) ── */}
      {!gameOver && !battle && (
        <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 select-none rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-white/60 shadow-lg backdrop-blur-md pointer-events-none sm:block">
          Phím mũi tên để di chuyển · Chạm quái vật để chiến đấu · Hạ {MONSTERS_TO_WIN} quái để mở cổng
        </div>
      )}

      {/* ── On-screen D-pad (touch controls for mobile) ── */}
      {!gameOver && !battle && (
        <div
          className="absolute bottom-4 right-4 z-20 select-none opacity-90 sm:bottom-6 sm:right-6"
          style={{ width: 154, height: 154, touchAction: 'none' }}
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
                className={`absolute ${b.style} flex h-13 w-13 items-center justify-center rounded-full text-xl font-black text-cyan-100 backdrop-blur-md transition active:scale-90`}
                style={{
                  width: 52,
                  height: 52,
                  background: 'radial-gradient(circle at 35% 25%, rgba(34,211,238,.45), rgba(8,47,73,.78))',
                  border: '2px solid rgba(103,232,249,.55)',
                  boxShadow: 'inset 0 1px 8px rgba(255,255,255,.12), 0 5px 18px rgba(0,0,0,.5)',
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
