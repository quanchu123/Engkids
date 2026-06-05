'use client';

// English Farming Game — page shell (Task 12).
//
// This React page is the React<->Phaser bridge described in design.md
// ("React <-> Phaser bridge (english-farm/page.tsx)"). It:
//   - owns the canonical FarmState in `farmStateRef` (single source of truth the
//     Phaser scene reads/writes through the bridge),
//   - mirrors it into React state (`farmState`) so the HUD/overlays re-render,
//   - dynamically imports Phaser ONCE inside an effect (SSR-safe) and destroys
//     the game on unmount (no leak),
//   - keeps live tool/seed/state values in refs so the scene always sees the
//     latest without ever recreating the Phaser game,
//   - opens a quiz after harvesting a word and awards XP + bumps mastery,
//   - loads a saved game on mount and persists (debounced) on every change,
//   - shows a friendly fallback instead of a blank canvas if Phaser fails.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type PhaserLib from 'phaser';

import {
  createFarmScene,
  type FarmBridge,
  type FarmSceneInstance,
  type FarmTool,
  type HarvestWord,
} from '@/game/farm/scene/createFarmScene';
import type { FarmState } from '@/game/farm/types';
import { advanceDay } from '@/game/farm/systems/farmingSystem';
import { addXp } from '@/game/farm/systems/progressionSystem';
import { collectWord, bumpMastery } from '@/game/farm/systems/vocabularySystem';
import {
  buildQuizForWord,
  gradeQuiz,
  type FarmQuiz,
} from '@/game/farm/systems/quizSystem';
import {
  loadFarm,
  saveFarm,
  createInitialFarmState,
  debounce,
} from '@/game/farm/save/farmSave';
import { loadWordBank, type WordPair } from '@/lib/word-bank';
import { getCropById } from '@/game/farm/data/crops';
import { XP_PER_CORRECT, XP_PER_HARVEST } from '@/game/farm/constants';

import { FarmHud } from '@/components/games/farm/FarmHud';
import { InventoryPanel } from '@/components/games/farm/InventoryPanel';
import { QuizModal } from '@/components/games/farm/QuizModal';
import { VocabCollectionPanel } from '@/components/games/farm/VocabCollectionPanel';
import { FarmIcon } from '@/components/games/farm/FarmIcon';

type QuizResult = { correct: boolean; correctAnswer: string } | null;

export default function EnglishFarmPage() {
  // --- refs: the bridge reads/writes these so Phaser always sees fresh values
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserLib.Game | null>(null);
  const sceneRef = useRef<FarmSceneInstance | null>(null);

  // farmStateRef is the single source of truth; farmState is the render mirror.
  const farmStateRef = useRef<FarmState>(createInitialFarmState());
  const [farmState, setFarmState] = useState<FarmState>(() => farmStateRef.current);

  const selectedToolRef = useRef<FarmTool>('hoe');
  const [selectedTool, setSelectedTool] = useState<FarmTool>('hoe');

  const selectedSeedRef = useRef<string>('carrot');
  const [selectedSeed, setSelectedSeed] = useState<string>('carrot');

  const wordBankRef = useRef<WordPair[]>([]);
  const activeQuizWordRef = useRef<HarvestWord | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced, non-blocking save (created once, kept in a ref so the mount-once
  // Phaser effect can use it without taking a component-scope dependency).
  const debouncedSaveRef = useRef<((s: FarmState) => void) | null>(null);
  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(saveFarm, 1500);
  }

  // --- overlay UI state
  const [quiz, setQuiz] = useState<FarmQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Readiness flags so a restored save renders even if it resolves after the
  // scene is built (and vice-versa).
  const [loaded, setLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Commit a new state everywhere: ref (truth) + React (render) + debounced save.
  const commit = useCallback((next: FarmState) => {
    farmStateRef.current = next;
    setFarmState(next);
    debouncedSaveRef.current?.(next);
  }, []);

  // --- load the shared word bank once (for quiz distractors)
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) wordBankRef.current = bank;
    });
    return () => {
      active = false;
    };
  }, []);

  // --- restore a saved game on mount
  useEffect(() => {
    let active = true;
    loadFarm()
      .then((state) => {
        if (!active) return;
        farmStateRef.current = state;
        setFarmState(state);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // --- once BOTH the save is loaded AND the scene exists, redraw from state
  useEffect(() => {
    if (loaded && sceneReady) {
      sceneRef.current?.refresh();
    }
  }, [loaded, sceneReady]);

  // --- create the Phaser game ONCE (SSR-safe dynamic import)
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    // The bridge only ever touches refs / stable setters / pure systems, so the
    // game can be created a single time and still observe live values.
    const bridge: FarmBridge = {
      getState: () => farmStateRef.current,
      setState: (next) => {
        farmStateRef.current = next;
        setFarmState(next);
        debouncedSaveRef.current?.(next);
      },
      getSelectedTool: () => selectedToolRef.current,
      getSelectedSeed: () => selectedSeedRef.current,
      onHarvest: (word) => {
        if (!word) return;
        // Scene already committed the inventory/plot change before calling this,
        // so build on the current (post-harvest) state.
        let s = farmStateRef.current;
        s = { ...s, collectedWords: collectWord(s.collectedWords, word) };
        s = addXp(s, XP_PER_HARVEST).state;
        farmStateRef.current = s;
        setFarmState(s);
        debouncedSaveRef.current?.(s);

        // Open a quiz for the harvested word; remember it for grading.
        activeQuizWordRef.current = word;
        setQuizResult(null);
        setQuiz(buildQuizForWord(wordBankRef.current, { en: word.en, vi: word.vi }));
      },
      onInventoryFull: () => {
        setToast('Kho đã đầy! Hãy dọn bớt vật phẩm trước khi thu hoạch.');
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2600);
      },
    };

    import('phaser')
      .then((mod) => {
        if (destroyed || !containerRef.current) return;
        // Phaser ships as `export = Phaser` (a namespace). Under esModuleInterop
        // the dynamic import may expose it as `default`; fall back to the module
        // itself. Type against the `PhaserLib` namespace either way.
        const Phaser = ((mod as { default?: typeof PhaserLib }).default ??
          mod) as typeof PhaserLib;
        const SceneCtor = createFarmScene(Phaser, bridge);
        const sceneInstance = new SceneCtor();
        sceneRef.current = sceneInstance;

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: containerRef.current,
          backgroundColor: '#8fbc5a',
          scene: [sceneInstance],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
        gameRef.current = game;
        setSceneReady(true);
      })
      .catch(() => {
        if (!destroyed) setLoadError(true);
      });

    return () => {
      destroyed = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // --- HUD / overlay handlers
  const handleNextDay = useCallback(() => {
    const next = advanceDay(farmStateRef.current);
    commit(next);
    sceneRef.current?.refresh();
  }, [commit]);

  const handleSelectTool = useCallback((tool: string) => {
    const t = tool as FarmTool;
    selectedToolRef.current = t;
    setSelectedTool(t);
  }, []);

  const handleSelectSeed = useCallback((seedId: string) => {
    selectedSeedRef.current = seedId;
    setSelectedSeed(seedId);
  }, []);

  const handleQuizAnswer = useCallback(
    (choice: string) => {
      if (!quiz) return;
      const result = gradeQuiz(quiz, choice);
      setQuizResult(result);

      const word = activeQuizWordRef.current;
      let s = farmStateRef.current;
      if (word) {
        const delta = result.correct ? 1 : 0;
        s = { ...s, collectedWords: bumpMastery(s.collectedWords, word.en, delta) };
      }
      if (result.correct) {
        s = addXp(s, XP_PER_CORRECT).state;
      }
      commit(s);
    },
    [quiz, commit],
  );

  const handleQuizClose = useCallback(() => {
    setQuiz(null);
    setQuizResult(null);
    activeQuizWordRef.current = null;
  }, []);

  // Seeds the player currently owns (drives the seed picker shown for the seed tool).
  const seedItems = farmState.inventory.items.filter((i) => i.kind === 'seed');

  // --- Phaser failed to load: friendly fallback instead of a blank canvas.
  if (loadError) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-5 bg-gradient-to-br from-emerald-100 to-amber-100 p-6 text-center">
        <span aria-hidden="true" className="text-6xl">🌾</span>
        <h1 className="text-2xl font-black text-emerald-700">Không tải được game</h1>
        <p className="max-w-sm font-semibold text-slate-500">
          Đã có lỗi khi tải nông trại. Hãy kiểm tra kết nối và thử lại nhé.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl border-2 border-orange-400 px-6 py-3 text-base font-black text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            Thử lại
          </button>
          <Link
            href="/games"
            className="rounded-2xl border-2 border-emerald-300 bg-white px-6 py-3 text-base font-black text-emerald-600 shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            Quay lại
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#8fbc5a]">
      {/* Full-screen Phaser canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Top HUD */}
      <FarmHud
        coins={farmState.coins}
        xp={farmState.xp}
        level={farmState.level}
        day={farmState.day}
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
        onNextDay={handleNextDay}
        onOpenInventory={() => setInventoryOpen(true)}
        onOpenVocab={() => setVocabOpen(true)}
      />

      {/* Back to games hub */}
      <div className="absolute left-2 top-24 z-10 sm:left-3 sm:top-28">
        <Link
          href="/games"
          className="pointer-events-auto rounded-2xl border-2 border-emerald-300 bg-white/95 px-3 py-1.5 text-sm font-black text-emerald-600 shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          ← Quay lại
        </Link>
      </div>

      {/* Seed picker (only while the seed tool is active and the player owns seeds) */}
      {selectedTool === 'seed' && seedItems.length > 0 && (
        <div className="pointer-events-auto absolute bottom-14 left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-white/70 bg-white/90 p-2 shadow-md">
          {seedItems.map((item) => {
            const crop = getCropById(item.refId);
            const active = item.refId === selectedSeed;
            return (
              <button
                key={item.itemId}
                type="button"
                onClick={() => handleSelectSeed(item.refId)}
                aria-pressed={active}
                aria-label={`Chọn hạt ${crop?.en ?? item.refId}`}
                className={`flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 text-sm font-black transition-all ${
                  active
                    ? 'scale-105 border-emerald-400 bg-gradient-to-br from-emerald-300 to-teal-400 text-white shadow-lg'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                }`}
              >
                <FarmIcon name={item.refId} emoji="🌱" className="h-5 w-5" />
                <span>{crop?.en ?? item.refId}</span>
                <span className="text-xs font-bold opacity-80">×{item.qty}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 select-none text-center text-xs font-semibold text-white/70">
        Chọn công cụ rồi chạm vào ô đất · Cày → Gieo → Tưới → Ngày mới → Thu hoạch
      </div>

      {/* Inventory-full toast */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-44 z-40 -translate-x-1/2 rounded-2xl border-2 border-rose-300 bg-white/95 px-4 py-2 text-sm font-black text-rose-600 shadow-lg">
          {toast}
        </div>
      )}

      {/* Modals */}
      <InventoryPanel
        open={inventoryOpen}
        items={farmState.inventory.items}
        slotLimit={farmState.inventory.slotLimit}
        onClose={() => setInventoryOpen(false)}
      />

      <VocabCollectionPanel
        open={vocabOpen}
        words={farmState.collectedWords}
        onClose={() => setVocabOpen(false)}
      />

      <QuizModal
        quiz={quiz}
        result={quizResult}
        onAnswer={handleQuizAnswer}
        onClose={handleQuizClose}
      />
    </main>
  );
}
