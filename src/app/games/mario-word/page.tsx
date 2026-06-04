'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORD_PAIRS = [
  { vi: 'Con mèo',   en: 'Cat'    },
  { vi: 'Con chó',   en: 'Dog'    },
  { vi: 'Ngôi nhà',  en: 'House'  },
  { vi: 'Cái cây',   en: 'Tree'   },
  { vi: 'Mặt trời',  en: 'Sun'    },
  { vi: 'Bầu trời',  en: 'Sky'    },
  { vi: 'Nước',      en: 'Water'  },
  { vi: 'Lửa',       en: 'Fire'   },
  { vi: 'Hoa',       en: 'Flower' },
  { vi: 'Ngôi sao',  en: 'Star'   },
  { vi: 'Núi',       en: 'Mountain'},
  { vi: 'Biển',      en: 'Ocean'  },
  { vi: 'Gió',       en: 'Wind'   },
  { vi: 'Mặt trăng', en: 'Moon'   },
  { vi: 'Đá',        en: 'Stone'  },
];

const BASE = '/games/mario-word';

export default function MarioWordPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [score, setScore]       = useState(0);
  const [hp, setHp]             = useState(3);
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [targetWord, setTargetWord] = useState(WORD_PAIRS[0].vi);
  const [feedback, setFeedback]    = useState<'correct' | 'wrong' | null>(null);
  const [killCount, setKillCount]  = useState(0);

  const scoreRef     = useRef(0);
  const hpRef        = useRef(3);
  const killCountRef = useRef(0);

  const cbRef = useRef({
    onCorrect: () => {},
    onWrong:   () => {},
    onWin:     () => {},
    setTarget: (_vi: string) => {},
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('phaser').then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      // ─── VARIABLES accessible across scenes ───────────────────────
      let usedWords = new Set<number>();
      let currentTarget = WORD_PAIRS[0];

      function pickNextTarget() {
        if (usedWords.size >= WORD_PAIRS.length) usedWords.clear();
        let idx: number;
        do { idx = Phaser.Math.Between(0, WORD_PAIRS.length - 1); } while (usedWords.has(idx));
        usedWords.add(idx);
        currentTarget = WORD_PAIRS[idx];
        cbRef.current.setTarget(currentTarget.vi);
        return currentTarget;
      }

      // ─── PRELOADER ─────────────────────────────────────────────────
      class PreloaderScene extends Phaser.Scene {
        constructor() { super({ key: 'PreloaderScene' }); }
        preload() {
          const cx = this.scale.width / 2;
          const cy = this.scale.height / 2;
          const bar = this.add.rectangle(cx - 148, cy, 4, 20, 0xfacc15);
          this.add.rectangle(cx, cy, 304, 24).setStrokeStyle(2, 0xfacc15);
          this.add.text(cx, cy - 40, 'Loading Mario Word Jump...', {
            fontFamily: 'Arial', fontSize: '16px', color: '#facc15',
          }).setOrigin(0.5);
          this.load.on('progress', (p: number) => {
            bar.width = 4 + 296 * p;
            bar.x = cx - 148 + bar.width / 2 - 2;
          });

          this.load.tilemapTiledJSON('level1', `${BASE}/maps/level1.json`);
          this.load.image('tiles', `${BASE}/tiles/tiles.png`);
          this.load.spritesheet('mario',  `${BASE}/sprites/mario.png`,  { frameWidth: 16, frameHeight: 16 });
          this.load.spritesheet('goomba', `${BASE}/sprites/goomba.png`, { frameWidth: 8,  frameHeight: 8  });
          this.load.spritesheet('coin',   `${BASE}/sprites/coin.png`,   { frameWidth: 8,  frameHeight: 8  });
        }
        create() {
          this.anims.create({ key: 'mario-run',  frames: this.anims.generateFrameNumbers('mario',  { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
          this.anims.create({ key: 'mario-idle', frames: this.anims.generateFrameNumbers('mario',  { start: 0, end: 0 }), frameRate: 5,  repeat: -1 });
          this.anims.create({ key: 'goomba-walk',frames: this.anims.generateFrameNumbers('goomba', { start: 0, end: 1 }), frameRate: 6,  repeat: -1 });
          this.anims.create({ key: 'goomba-dead',frames: this.anims.generateFrameNumbers('goomba', { start: 2, end: 2 }), frameRate: 5,  repeat: 0  });
          this.scene.start('GameScene');
        }
      }

      // ─── GAME SCENE ────────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        private mario!:          Phaser.Physics.Arcade.Sprite;
        private cursors!:        Phaser.Types.Input.Keyboard.CursorKeys;
        private foregroundLayer!:Phaser.Tilemaps.TilemapLayer;
        private goombas!:        Phaser.Physics.Arcade.Group;
        private labels:          {goomba: Phaser.Physics.Arcade.Sprite, text: Phaser.GameObjects.Text, word: string}[] = [];
        private canJump = true;
        private invincible = false;     // brief grace after wrong stomp
        private goombasKilled = 0;

        constructor() { super({ key: 'GameScene' }); }

        create() {
          // ── Tilemap ──
          const map = this.make.tilemap({ key: 'level1' });
          const tileset = map.addTilesetImage('tiles', 'tiles');

          map.createLayer('backgroundLayer', tileset!, 0, 0);
          this.foregroundLayer = map.createLayer('foregroundLayer', tileset!, 0, 0)!;
          this.foregroundLayer.setCollisionByProperty({ collide: true });

          this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

          // ── Zoom to fill screen height ──
          const zoom = this.scale.height / map.heightInPixels;
          this.cameras.main.setZoom(zoom);
          this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

          // ── Spawn Mario ──
          const objLayer = map.getObjectLayer('objects')!;
          const playerObj = objLayer.objects.find((o: any) => o.type === 'player') || { x: 12, y: 100 };
          this.mario = this.physics.add
            .sprite((playerObj as any).x, (playerObj as any).y, 'mario', 0)
            .setScale(1)
            .setCollideWorldBounds(true)
            .setDepth(10);
          (this.mario.body as Phaser.Physics.Arcade.Body).setMaxVelocityY(400);
          this.mario.play('mario-idle');

          this.cameras.main.startFollow(this.mario, true, 0.12, 0);

          // ── Tile collision ──
          this.physics.add.collider(this.mario, this.foregroundLayer, () => {
            const body = this.mario.body as Phaser.Physics.Arcade.Body;
            if (body.blocked.down) this.canJump = true;
          });

          // ── Spawn goombas ──
          this.goombas = this.physics.add.group();
          const goombaObjs = objLayer.objects.filter((o: any) => o.type === 'goomba');

          // Assign words round-robin (reuse pool if fewer words than goombas)
          const wordsToUse = [...WORD_PAIRS].sort(() => Math.random() - 0.5);
          goombaObjs.forEach((obj: any, i: number) => {
            const word = wordsToUse[i % wordsToUse.length];
            const g = this.physics.add
              .sprite(obj.x, obj.y, 'goomba', 0)
              .setScale(1)
              .setDepth(9)
              .setCollideWorldBounds(true);
            g.setVelocityX(i % 2 === 0 ? -25 : 25);
            g.play('goomba-walk');
            (g as any).word = word.en;
            this.goombas.add(g);

            // Word label — created at world coordinates, uses camera for correct positioning
            const lbl = this.add.text(obj.x, obj.y - 10, word.en, {
              fontFamily: 'Arial',
              fontSize: '5px',
              color: '#ffffff',
              stroke: '#000000',
              strokeThickness: 1,
              backgroundColor: '#00000088',
              padding: { x: 2, y: 1 },
            }).setOrigin(0.5, 1).setDepth(15);
            this.labels.push({ goomba: g, text: lbl, word: word.en });
          });

          this.physics.add.collider(this.goombas, this.foregroundLayer);
          this.physics.add.collider(this.goombas, this.goombas, (_a: any, _b: any) => {
            _a.setVelocityX(-_a.body.velocity.x);
            _b.setVelocityX(-_b.body.velocity.x);
          });

          // ── Stomp overlap ──
          this.physics.add.overlap(this.mario, this.goombas, (m: any, g: any) => {
            if (!g.active || this.invincible) return;
            const body = m.body as Phaser.Physics.Arcade.Body;
            const fallingOnTop = body.velocity.y >= -5 && m.y < g.y;

            if (fallingOnTop) {
              // Bounce Mario up after stomp
              m.setVelocityY(-200);
              this.canJump = false;

              const correct = (g as any).word === currentTarget.en;
              if (correct) {
                this._killGoomba(g);
              } else {
                // Wrong goomba — flash and punish
                this.invincible = true;
                m.setTint(0xff4444);
                this.time.delayedCall(800, () => {
                  m.clearTint();
                  this.invincible = false;
                });
                hpRef.current = Math.max(0, hpRef.current - 1);
                setHp(hpRef.current);
                cbRef.current.onWrong();
                if (hpRef.current <= 0) setGameOver('lose');
              }
            } else {
              // Goomba walks into Mario from side — take damage
              if (this.invincible) return;
              this.invincible = true;
              m.setTint(0xff4444);
              this.cameras.main.shake(200, 0.005 / zoom);
              hpRef.current = Math.max(0, hpRef.current - 1);
              setHp(hpRef.current);
              cbRef.current.onWrong();
              this.time.delayedCall(900, () => {
                m.clearTint();
                this.invincible = false;
              });
              if (hpRef.current <= 0) setGameOver('lose');
            }
          });

          // ── Win zone ──
          const exitZone = this.add.zone(map.widthInPixels - 8, map.heightInPixels / 2, 16, map.heightInPixels).setDepth(5);
          this.physics.world.enable(exitZone);
          this.physics.add.overlap(this.mario, exitZone, () => {
            cbRef.current.onWin();
            setGameOver('win');
          });

          // ── Wire React callbacks ──
          cbRef.current.setTarget = (vi: string) => setTargetWord(vi);
          cbRef.current.onCorrect = () => {
            scoreRef.current += 50;
            setScore(scoreRef.current);
            killCountRef.current++;
            setKillCount(killCountRef.current);
            // Show feedback
            setFeedback('correct');
            setTimeout(() => setFeedback(null), 700);
            if (killCountRef.current >= 8) {
              cbRef.current.onWin();
              setGameOver('win');
            }
          };
          cbRef.current.onWrong = () => {
            setFeedback('wrong');
            setTimeout(() => setFeedback(null), 700);
          };
          cbRef.current.onWin = () => setGameOver('win');

          // Set initial target
          pickNextTarget();

          // ── Keyboard ──
          this.cursors = this.input.keyboard!.createCursorKeys();
        }

        _killGoomba(g: Phaser.Physics.Arcade.Sprite) {
          g.play('goomba-dead');
          (g.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
          this.time.delayedCall(400, () => {
            // Remove label
            const entry = this.labels.find(l => l.goomba === g);
            if (entry) {
              entry.text.destroy();
              this.labels.splice(this.labels.indexOf(entry), 1);
            }
            g.destroy();
          });
          this.goombasKilled++;
          pickNextTarget();
          cbRef.current.onCorrect();
        }

        update() {
          if (!this.mario?.active) return;

          const { left, right, up } = this.cursors;
          const body = this.mario.body as Phaser.Physics.Arcade.Body;
          const spd = 80;

          if (left.isDown) {
            this.mario.setVelocityX(-spd);
            this.mario.setFlipX(true);
            if (body.blocked.down) this.mario.play('mario-run', true);
          } else if (right.isDown) {
            this.mario.setVelocityX(spd);
            this.mario.setFlipX(false);
            if (body.blocked.down) this.mario.play('mario-run', true);
          } else {
            this.mario.setVelocityX(0);
            if (body.blocked.down) this.mario.play('mario-idle', true);
          }

          if ((up.isDown || Phaser.Input.Keyboard.JustDown(up)) && this.canJump && body.blocked.down) {
            this.mario.setVelocityY(-310);
            this.canJump = false;
          }

          // Goomba patrol bounce off walls
          this.goombas.getChildren().forEach((g: any) => {
            if (!g.active) return;
            const gb = g.body as Phaser.Physics.Arcade.Body;
            if (gb.blocked.left) g.setVelocityX(25);
            if (gb.blocked.right) g.setVelocityX(-25);
          });

          // Update word labels to follow goombas
          this.labels.forEach(({ goomba, text }) => {
            if (goomba.active) {
              text.setPosition(goomba.x, goomba.y - 6);
            } else {
              text.setVisible(false);
            }
          });
        }
      }

      // ─── Launch Phaser ─────────────────────────────────────────────
      const config: any = {
        type: Phaser.AUTO,
        backgroundColor: '#87ceeb',
        parent: containerRef.current!,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 480 }, debug: false },
        },
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
    <main className="h-screen overflow-hidden bg-sky-400 relative">
      {/* Phaser canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Top HUD ── */}
      {!gameOver && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        >
          {/* Back button */}
          <div className="pointer-events-auto">
            <Link href="/games" className="text-yellow-300 hover:text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg border border-yellow-700 transition-colors">
              ← Quay lại
            </Link>
          </div>

          {/* Target word */}
          <div className="flex flex-col items-center">
            <span className="text-white/70 text-[10px] uppercase tracking-widest">Tìm con quái có chữ</span>
            <span className="text-yellow-300 font-black text-xl drop-shadow-lg leading-none">{targetWord}</span>
          </div>

          {/* Score + Hearts */}
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-black text-sm drop-shadow">Score {score}</span>
            <div className="flex gap-0.5">
              {hearts.map((_, i) => (
                <span key={i} className={`text-base ${i < hp ? 'text-red-500' : 'text-gray-600'}`}>{i < hp ? '❤️' : '🖤'}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback flash ── */}
      {feedback && !gameOver && (
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full font-black text-white text-lg pointer-events-none shadow-xl
          ${feedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}>
          {feedback === 'correct' ? '+50 điểm!' : 'Sai rồi!'}
        </div>
      )}

      {/* ── Kill progress ── */}
      {!gameOver && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-none">
          <div className="flex gap-1">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full border border-white/50 ${i < killCount ? 'bg-yellow-400' : 'bg-white/20'}`} />
            ))}
          </div>
          <span className="text-white/60 text-xs">{killCount}/8 quái</span>
        </div>
      )}

      {/* ── Controls hint ── */}
      {!gameOver && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/40 text-[10px] pointer-events-none select-none">
          ←→ di chuyển &nbsp;·&nbsp; ↑ nhảy &nbsp;·&nbsp; Giẫm đúng con quái mang từ tiếng Anh khớp với tiếng Việt ở trên!
        </div>
      )}

      {/* ── Win Overlay ── */}
      {gameOver === 'win' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-5 z-30">
          <div className="text-5xl font-black text-yellow-400 animate-bounce">WIN</div>
          <h2 className="text-5xl font-black text-yellow-400 drop-shadow-lg">CHIẾN THẮNG!</h2>
          <p className="text-white text-xl">Điểm: <span className="text-yellow-400 font-black text-2xl">{score}</span></p>
          <button onClick={handleReplay}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl px-10 py-4 rounded-full hover:scale-105 transition-transform shadow-xl">
            Chơi lại
          </button>
          <Link href="/games" className="text-white/60 hover:text-white text-sm underline mt-1">
            Quay về danh sách game
          </Link>
        </div>
      )}

      {/* ── Lose Overlay ── */}
      {gameOver === 'lose' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-5 z-30">
          <div className="text-5xl font-black text-red-400">LOSE</div>
          <h2 className="text-5xl font-black text-red-400 drop-shadow-lg">GAME OVER</h2>
          <p className="text-white text-xl">Điểm: <span className="text-orange-400 font-black text-2xl">{score}</span></p>
          <button onClick={handleReplay}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl px-10 py-4 rounded-full hover:scale-105 transition-transform shadow-xl">
            Thử lại
          </button>
          <Link href="/games" className="text-white/60 hover:text-white text-sm underline mt-1">
            Quay về danh sách game
          </Link>
        </div>
      )}
    </main>
  );
}
