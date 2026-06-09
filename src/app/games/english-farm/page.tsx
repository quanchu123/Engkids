'use client';

// English Farming Game — page shell + learning wiring.
//
// React<->Phaser bridge: owns the canonical FarmState, mirrors it into React for
// the HUD/overlays, dynamically imports Phaser once (SSR-safe), and wires the
// learning loop: TTS pronunciation, multi-mode quiz on harvest, a spaced-
// repetition review session, a shop (buy seeds / sell crops), a daily quest, and
// milestone cutscenes. Logged-in players sync words into the SM-2 SRS service.

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
import type { FarmState, QuizMode } from '@/game/farm/types';
import { advanceDayWithWeather, getFarmWeather } from '@/game/farm/systems/farmingSystem';
import { applyFarmCoachAction, getFarmCoachSuggestion } from '@/game/farm/systems/farmCoach';
import { addXp } from '@/game/farm/systems/progressionSystem';
import { collectWord, bumpMastery, countMastered } from '@/game/farm/systems/vocabularySystem';
import { pickDueWords, reviewWord } from '@/game/farm/systems/srsScheduler';
import { sellCrop, buySeed } from '@/game/farm/systems/economySystem';
import { rollDailyQuest, trackQuest, claimQuest } from '@/game/farm/systems/dailyQuest';
import {
  buildQuizForWord,
  gradeQuiz,
  type FarmQuiz,
} from '@/game/farm/systems/quizSystem';
import {
  resolveCutscene,
  type CutsceneId,
} from '@/game/farm/scene/cutscene/cutsceneTrigger';
import CutscenePlayer from '@/game/farm/scene/cutscene/CutscenePlayer';
import {
  loadFarm,
  saveFarm,
  createInitialFarmState,
  debounce,
} from '@/game/farm/save/farmSave';
import { loadWordBank, type WordPair } from '@/lib/word-bank';
import { CROPS, getCropById } from '@/game/farm/data/crops';
import { speak } from '@/lib/pronunciation';
import { syncSavedWordToSRS } from '@/services/vocabulary';
import { getSupabaseClient } from '@/lib/auth-client';
import { XP_PER_CORRECT, XP_PER_HARVEST } from '@/game/farm/constants';

import { FarmHud } from '@/components/games/farm/FarmHud';
import { InventoryPanel } from '@/components/games/farm/InventoryPanel';
import { QuizModal } from '@/components/games/farm/QuizModal';
import { VocabCollectionPanel } from '@/components/games/farm/VocabCollectionPanel';
import { FarmShopPanel } from '@/components/games/farm/FarmShopPanel';
import { FarmIcon } from '@/components/games/farm/FarmIcon';

type QuizResult = { correct: boolean; correctAnswer: string } | null;
type QuizContext = 'harvest' | 'review';

/** Rotation of quiz modes so harvests exercise different skills. */
const QUIZ_MODES: QuizMode[] = ['meaning', 'listen', 'spelling'];

export default function EnglishFarmPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserLib.Game | null>(null);
  const sceneRef = useRef<FarmSceneInstance | null>(null);

  const farmStateRef = useRef<FarmState>(createInitialFarmState());
  const [farmState, setFarmState] = useState<FarmState>(() => farmStateRef.current);

  const selectedToolRef = useRef<FarmTool>('hoe');
  const [selectedTool, setSelectedTool] = useState<FarmTool>('hoe');

  const selectedSeedRef = useRef<string>('carrot');
  const [selectedSeed, setSelectedSeed] = useState<string>('carrot');

  const wordBankRef = useRef<WordPair[]>([]);
  const activeQuizWordRef = useRef<HarvestWord | null>(null);
  const quizContextRef = useRef<QuizContext>('harvest');
  const quizModeCounterRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedInRef = useRef(false);

  const debouncedSaveRef = useRef<((s: FarmState) => void) | null>(null);
  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(saveFarm, 1500);
  }

  // --- overlay UI state
  const [quiz, setQuiz] = useState<FarmQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cutscene, setCutscene] = useState<CutsceneId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [wordBankCount, setWordBankCount] = useState(0);

  // Review session: a queue of due words played one-by-one through the quiz.
  const reviewQueueRef = useRef<HarvestWord[]>([]);
  const reviewIndexRef = useRef(0);

  const [loaded, setLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const commit = useCallback((next: FarmState) => {
    farmStateRef.current = next;
    setFarmState(next);
    debouncedSaveRef.current?.(next);
  }, []);

  // --- detect logged-in user once (drives SM-2 SRS sync; never throws)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (active) loggedInRef.current = !!data.user;
      } catch {
        if (active) loggedInRef.current = false;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // --- load the shared word bank once (for quiz distractors)
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) {
        wordBankRef.current = bank;
        setWordBankCount(bank.length);
      }
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

  useEffect(() => {
    if (loaded && sceneReady) {
      sceneRef.current?.refresh();
    }
  }, [loaded, sceneReady]);

  useEffect(() => {
    const testWindow = window as Window & { render_game_to_text?: () => string };
    testWindow.render_game_to_text = () => {
      const state = farmStateRef.current;
      return JSON.stringify({
        game: 'english-farm',
        coordinateSystem: 'screen pixels, origin top-left, y down',
        selectedTool: selectedToolRef.current,
        selectedSeed: selectedSeedRef.current,
        day: state.day,
        coins: state.coins,
        level: state.level,
        farmerReady: !!sceneRef.current,
        grid: {
          cols: state.grid.cols,
          rows: state.grid.rows,
          plots: state.grid.plots.map((plot) => ({
            id: plot.id,
            state: plot.state,
            crop: plot.crop?.cropTypeId ?? null,
            stage: plot.crop?.stage ?? null,
            watered: plot.crop?.wateredToday ?? false,
          })),
        },
      });
    };
    return () => {
      if (testWindow.render_game_to_text) delete testWindow.render_game_to_text;
    };
  }, []);

  // --- create the Phaser game ONCE (SSR-safe dynamic import)
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

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
        // Scene already committed the inventory/plot change before calling this.
        let s = farmStateRef.current;
        const prevLevel = s.level;
        s = { ...s, collectedWords: collectWord(s.collectedWords, word, s.day) };
        s = addXp(s, XP_PER_HARVEST).state;
        // Daily quest: progress the "harvest" goal.
        s = { ...s, dailyQuest: trackQuest(s.dailyQuest, 'harvest', 1) };
        farmStateRef.current = s;
        setFarmState(s);
        debouncedSaveRef.current?.(s);

        // Milestone cutscene: level-up takes priority; otherwise a "big harvest"
        // fires once the stockpile of this crop reaches the threshold.
        const cropQty =
          s.inventory.items.find((it) => getCropById(it.refId)?.en === word.en)?.qty ?? 0;
        const milestone = resolveCutscene({
          prevLevel,
          nextLevel: s.level,
          harvestQty: cropQty,
        });
        if (milestone) setCutscene(milestone);

        // Open a rotating-mode quiz for the harvested word.
        quizContextRef.current = 'harvest';
        activeQuizWordRef.current = word;
        const mode = QUIZ_MODES[quizModeCounterRef.current % QUIZ_MODES.length];
        quizModeCounterRef.current += 1;
        setQuizResult(null);
        setQuiz(buildQuizForWord(wordBankRef.current, { en: word.en, vi: word.vi }, mode));
        // Listen mode: speak immediately so the child hears the target word.
        if (mode === 'listen') speak(word.en);
      },
      onInventoryFull: () => {
        showToast('Kho đã đầy! Hãy dọn bớt vật phẩm trước khi thu hoạch.');
      },
      resolveHarvestWord: (cropTypeId) => {
        const crop = getCropById(cropTypeId);
        if (!crop) return undefined;
        const bank = wordBankRef.current;
        if (!bank.length) return crop;
        const cropIndex = Math.max(0, CROPS.findIndex((item) => item.id === cropTypeId));
        const picked = bank[cropIndex % bank.length];
        if (!picked?.en || !picked?.vi) return crop;
        return { en: picked.en, vi: picked.vi, level: crop.level };
      },
    };

    import('phaser')
      .then((mod) => {
        if (destroyed || !containerRef.current) return;
        const Phaser = ((mod as { default?: typeof PhaserLib }).default ??
          mod) as typeof PhaserLib;
        const SceneCtor = createFarmScene(Phaser, bridge);
        const sceneInstance = new SceneCtor();
        sceneRef.current = sceneInstance;

        const game = new Phaser.Game({
          type: Phaser.CANVAS,
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
  }, [showToast]);

  // --- HUD / overlay handlers
  const handleNextDay = useCallback(() => {
    const advanced = advanceDayWithWeather(farmStateRef.current);
    let next = advanced.state;
    // Roll a fresh daily quest when the day rolls over.
    if (next.dailyQuest.issuedDay !== next.day) {
      next = { ...next, dailyQuest: rollDailyQuest(next.day) };
    }
    commit(next);
    sceneRef.current?.refresh();
    if (advanced.forecast.weather !== 'clear') {
      showToast(`${advanced.forecast.labelVi}: ${advanced.forecast.descriptionVi}`);
    }
  }, [commit, showToast]);

  const handleSelectTool = useCallback((tool: string) => {
    const t = tool as FarmTool;
    selectedToolRef.current = t;
    setSelectedTool(t);
  }, []);

  const handleSelectSeed = useCallback((seedId: string) => {
    selectedSeedRef.current = seedId;
    setSelectedSeed(seedId);
    // Pronounce the English word when picking a seed (Req 1.2).
    const crop = getCropById(seedId);
    if (crop) speak(crop.en);
  }, []);

  const handleCoachStep = useCallback(() => {
    const suggestion = getFarmCoachSuggestion(farmStateRef.current);
    if (suggestion.action === 'harvest') {
      selectedToolRef.current = 'harvest';
      setSelectedTool('harvest');
      showToast(suggestion.messageVi);
      return;
    }
    if (suggestion.action === 'plant' && !suggestion.seedId) {
      setShopOpen(true);
      showToast(suggestion.messageVi);
      return;
    }

    const applied = applyFarmCoachAction(farmStateRef.current, suggestion);
    if ('ok' in applied) {
      if (!applied.ok) {
        showToast(applied.reason ?? suggestion.messageVi);
        return;
      }
      commit(applied.state);
    } else {
      commit(applied);
    }

    if (suggestion.action === 'plant' && suggestion.seedId) {
      selectedSeedRef.current = suggestion.seedId;
      setSelectedSeed(suggestion.seedId);
      const crop = getCropById(suggestion.seedId);
      if (crop) speak(crop.en);
    }
    sceneRef.current?.refresh();
    showToast(suggestion.messageVi);
  }, [commit, showToast]);

  // Advance the review session (or end it) after a graded review answer.
  const advanceReview = useCallback(() => {
    const queue = reviewQueueRef.current;
    const nextIndex = reviewIndexRef.current + 1;
    if (nextIndex >= queue.length) {
      reviewQueueRef.current = [];
      reviewIndexRef.current = 0;
      setQuiz(null);
      setQuizResult(null);
      activeQuizWordRef.current = null;
      showToast('Hoàn thành ôn tập! 🌟');
      return;
    }
    reviewIndexRef.current = nextIndex;
    const word = queue[nextIndex];
    activeQuizWordRef.current = word;
    const mode = QUIZ_MODES[quizModeCounterRef.current % QUIZ_MODES.length];
    quizModeCounterRef.current += 1;
    setQuizResult(null);
    setQuiz(buildQuizForWord(wordBankRef.current, { en: word.en, vi: word.vi }, mode));
    if (mode === 'listen') speak(word.en);
  }, [showToast]);

  const handleQuizAnswer = useCallback(
    (choice: string) => {
      if (!quiz) return;
      const result = gradeQuiz(quiz, choice);
      setQuizResult(result);
      // Visual feedback on the farm canvas (green flash/sparkle vs red shake).
      sceneRef.current?.flashQuizFeedback(null, result.correct);

      const word = activeQuizWordRef.current;
      let s = farmStateRef.current;

      if (quizContextRef.current === 'review') {
        // Review: update the SRS schedule + daily "review" progress.
        if (word) {
          s = { ...s, collectedWords: reviewWord(s.collectedWords, word.en, result.correct, s.day) };
          s = { ...s, dailyQuest: trackQuest(s.dailyQuest, 'review', 1) };
          if (loggedInRef.current) {
            syncSavedWordToSRS({ word: word.en, meaningVi: word.vi });
          }
        }
        if (result.correct) s = addXp(s, XP_PER_CORRECT).state;
      } else {
        // Harvest quiz: bump mastery + award XP on correct.
        if (word) {
          s = { ...s, collectedWords: bumpMastery(s.collectedWords, word.en, result.correct ? 1 : 0) };
          if (loggedInRef.current) {
            syncSavedWordToSRS({ word: word.en, meaningVi: word.vi });
          }
        }
        if (result.correct) s = addXp(s, XP_PER_CORRECT).state;
      }
      commit(s);
    },
    [quiz, commit],
  );

  const handleQuizClose = useCallback(() => {
    if (quizContextRef.current === 'review' && reviewQueueRef.current.length > 0) {
      advanceReview();
      return;
    }
    setQuiz(null);
    setQuizResult(null);
    activeQuizWordRef.current = null;
  }, [advanceReview]);

  // --- review session: gather due words and start the quiz loop
  const handleStartReview = useCallback(() => {
    const due = pickDueWords(farmStateRef.current.collectedWords, farmStateRef.current.day, 5);
    if (due.length === 0) {
      showToast('Chưa có từ nào để ôn. Hãy thu hoạch để học từ mới!');
      return;
    }
    reviewQueueRef.current = due.map((w) => ({ en: w.en, vi: w.vi, level: w.level }));
    reviewIndexRef.current = 0;
    quizContextRef.current = 'review';
    const word = reviewQueueRef.current[0];
    activeQuizWordRef.current = word;
    const mode = QUIZ_MODES[quizModeCounterRef.current % QUIZ_MODES.length];
    quizModeCounterRef.current += 1;
    setQuizResult(null);
    setQuiz(buildQuizForWord(wordBankRef.current, { en: word.en, vi: word.vi }, mode));
    if (mode === 'listen') speak(word.en);
  }, [showToast]);

  // --- shop handlers
  const handleBuy = useCallback(
    (cropId: string) => {
      const res = buySeed(farmStateRef.current, cropId);
      if (res.ok) {
        commit(res.state);
        const crop = getCropById(cropId);
        if (crop) speak(crop.en);
      } else {
        showToast(res.reason ?? 'Không mua được');
      }
    },
    [commit, showToast],
  );

  const handleSell = useCallback(
    (cropId: string) => {
      let s = farmStateRef.current;
      const res = sellCrop(s, cropId);
      if (res.ok) {
        s = { ...res.state, dailyQuest: trackQuest(res.state.dailyQuest, 'sell', 1) };
        commit(s);
      } else {
        showToast(res.reason ?? 'Không bán được');
      }
    },
    [commit, showToast],
  );

  const handleClaimQuest = useCallback(() => {
    const { quest, rewardCoins } = claimQuest(farmStateRef.current.dailyQuest);
    if (rewardCoins > 0) {
      commit({ ...farmStateRef.current, dailyQuest: quest, coins: farmStateRef.current.coins + rewardCoins });
      showToast(`Nhận ${rewardCoins} xu từ nhiệm vụ! 🎉`);
    }
  }, [commit, showToast]);

  const seedItems = farmState.inventory.items.filter((i) => i.kind === 'seed');
  const mastered = countMastered(farmState.collectedWords);
  const quest = farmState.dailyQuest;
  const forecast = getFarmWeather(farmState.day);
  const questLabel =
    quest.goal === 'harvest' ? 'Thu hoạch' : quest.goal === 'review' ? 'Ôn từ' : 'Bán nông sản';
  const questDone = quest.progress >= quest.target;

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
      <div ref={containerRef} className="h-full w-full" />

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

      {/* Play guide + quick actions */}
      <div className="absolute left-2 top-44 z-10 w-[min(260px,calc(100vw-1rem))] sm:left-3 sm:top-32">
        <div className="rounded-3xl border-2 border-white/80 bg-white/92 p-3 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Link
              href="/games"
              className="pointer-events-auto rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              ← Game
            </Link>
            <span className="rounded-2xl bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
              Thuộc {mastered}
            </span>
          </div>

          <div className="hidden rounded-2xl bg-emerald-50 p-2.5 sm:block">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Cách chơi</p>
            <ol className="mt-1 space-y-1 text-xs font-bold text-slate-700">
              <li>1. Cày ô đất trống.</li>
              <li>2. Gieo hạt rồi tưới nước.</li>
              <li>3. Bấm Ngày mới để cây lớn.</li>
              <li>4. Thu hoạch để trả lời từ tiếng Anh.</li>
            </ol>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCoachStep}
              className="pointer-events-auto rounded-2xl border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Bước tiếp
            </button>
            <button
              type="button"
              onClick={() => setShopOpen(true)}
              className="pointer-events-auto rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Cửa hàng
            </button>
            <button
              type="button"
              onClick={handleStartReview}
              className="pointer-events-auto col-span-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Ôn từ
            </button>
          </div>

          <p className="mt-2 hidden rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-bold leading-snug text-slate-500 sm:block">
            Nguồn từ: {wordBankCount > 0 ? `${wordBankCount} từ trong word_bank` : 'đang tải word_bank'}.
          </p>
        </div>
      </div>

      {/* Daily quest badge (top-right under HUD) */}
      <div className="absolute right-2 top-24 z-10 sm:right-3 sm:top-28">
        <div className="flex flex-col items-end gap-2">
          <div
            className={`pointer-events-none rounded-2xl border-2 px-3 py-1.5 text-right text-xs font-black shadow-md ${
              forecast.weather === 'sunny'
                ? 'border-amber-300 bg-amber-100 text-amber-700'
                : forecast.weather === 'rain'
                  ? 'border-sky-300 bg-sky-100 text-sky-700'
                  : 'border-emerald-200 bg-white/90 text-emerald-700'
            }`}
          >
            <span>{forecast.labelVi}</span>
            <span className="block text-[10px] font-bold opacity-80">{forecast.descriptionVi}</span>
          </div>
        <button
          type="button"
          onClick={handleClaimQuest}
          disabled={!questDone || quest.claimed}
          className={`pointer-events-auto flex flex-col items-end rounded-2xl border-2 px-3 py-1.5 text-right text-xs font-black shadow-md transition-transform active:scale-95 ${
            questDone && !quest.claimed
              ? 'border-yellow-400 bg-yellow-100 text-yellow-700 hover:-translate-y-0.5'
              : 'border-slate-200 bg-white/90 text-slate-600'
          }`}
          aria-label="Nhiệm vụ hôm nay"
        >
          <span>📋 {questLabel} {quest.progress}/{quest.target}</span>
          <span className="text-[10px] font-bold opacity-80">
            {quest.claimed ? 'Đã nhận thưởng' : questDone ? `Bấm nhận 🪙${quest.rewardCoins}` : `Thưởng 🪙${quest.rewardCoins}`}
          </span>
        </button>
        </div>
      </div>

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

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92vw] -translate-x-1/2 select-none rounded-full bg-slate-950/28 px-4 py-1.5 text-center text-xs font-bold text-white/90 backdrop-blur">
        Chọn công cụ ở trên rồi chạm vào ô đất. Thu hoạch sẽ mở quiz từ word_bank.
      </div>

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-44 z-40 -translate-x-1/2 rounded-2xl border-2 border-rose-300 bg-white/95 px-4 py-2 text-sm font-black text-rose-600 shadow-lg">
          {toast}
        </div>
      )}

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

      <FarmShopPanel
        open={shopOpen}
        state={farmState}
        onBuy={handleBuy}
        onSell={handleSell}
        onClose={() => setShopOpen(false)}
      />

      <QuizModal
        quiz={quiz}
        result={quizResult}
        onAnswer={handleQuizAnswer}
        onClose={handleQuizClose}
      />

      <CutscenePlayer id={cutscene} onComplete={() => setCutscene(null)} />
    </main>
  );
}
