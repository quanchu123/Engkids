'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import UiIcon from '@/components/common/UiIcon';
import Fireworks from '@/components/common/Fireworks';
import { useAppStore } from '@/store/useAppStore';
import {
  PET_ACTIONS,
  PetActionKey,
  PetStatKey,
  levelFromExp,
  petMood,
  petWellbeing,
} from '@/lib/pet';
import {
  PET_SPECIES,
  PetSpecies,
  getSpecies,
  stageIndexForLevel,
  currentStage,
  nextStage,
  isFinalStage,
} from '@/lib/pet-species';
import { buildPetQuiz, PetQuiz } from '@/lib/pet-quiz';
import { loadWordBank, DEFAULT_WORD_BANK, WordPair } from '@/lib/word-bank';

const STAT_META: Record<PetStatKey, { labelVi: string; emoji: string; bar: string; soft: string }> = {
  hunger: { labelVi: 'No bụng', emoji: '🍎', bar: 'from-orange-400 to-amber-500', soft: 'bg-orange-50 text-orange-700' },
  happiness: { labelVi: 'Vui vẻ', emoji: '💗', bar: 'from-pink-400 to-rose-500', soft: 'bg-pink-50 text-pink-700' },
  clean: { labelVi: 'Sạch sẽ', emoji: '🛁', bar: 'from-sky-400 to-cyan-500', soft: 'bg-sky-50 text-sky-700' },
  energy: { labelVi: 'Năng lượng', emoji: '⚡', bar: 'from-violet-400 to-purple-500', soft: 'bg-violet-50 text-violet-700' },
};

const ACTION_ORDER: PetActionKey[] = ['feed', 'play', 'bath', 'sleep'];
const MOOD_FACE: Record<'happy' | 'ok' | 'sad', string> = { happy: '😄', ok: '🙂', sad: '😢' };
const ACTION_STYLE: Record<PetActionKey, string> = {
  feed: 'from-orange-400 to-amber-500 shadow-orange-200',
  play: 'from-pink-400 to-fuchsia-500 shadow-pink-200',
  bath: 'from-sky-400 to-cyan-500 shadow-sky-200',
  sleep: 'from-violet-400 to-indigo-500 shadow-violet-200',
};

function playTones(notes: number[], gap = 0.1) {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * gap;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + gap + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + gap + 0.18);
    });
    setTimeout(() => ctx.close().catch(() => {}), (notes.length * gap + 0.5) * 1000);
  } catch {
    // Audio is optional.
  }
}

const playEvolveChime = () => playTones([523, 659, 784, 1047, 1319], 0.1);
const playDing = () => playTones([880, 1175], 0.08);
const playBuzz = () => playTones([200, 150], 0.1);

function speakEnglish(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech is optional.
  }
}

export default function PetGamePage() {
  const pet = useAppStore((state) => state.pet);
  const coins = useAppStore((state) => state.coins);
  const hydrated = useAppStore((state) => state.hydrated);
  const adoptPet = useAppStore((state) => state.adoptPet);
  const carePet = useAppStore((state) => state.carePet);
  const syncPetDecay = useAppStore((state) => state.syncPetDecay);
  const savedWords = useAppStore((state) => state.progress.savedWords);
  const completeQuestStep = useAppStore((state) => state.completeQuestStep);

  const [bank, setBank] = useState<WordPair[]>(DEFAULT_WORD_BANK);
  const [hearts, setHearts] = useState<number[]>([]);
  const [evolveKey, setEvolveKey] = useState(0);
  const [evolving, setEvolving] = useState(false);
  const [evolveVideo, setEvolveVideo] = useState<string | null>(null);
  const [evolveShowcase, setEvolveShowcase] = useState(false);
  const [anim, setAnim] = useState<'idle' | 'happy' | 'sad'>('idle');
  const [combo, setCombo] = useState(0);
  const [floats, setFloats] = useState<Array<{ id: number; text: string }>>([]);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());
  const questDoneRef = useRef(false);

  const [quizAction, setQuizAction] = useState<PetActionKey | null>(null);
  const [quiz, setQuiz] = useState<PetQuiz | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [lastReward, setLastReward] = useState<{ exp: number; coins: number }>({ exp: 0, coins: 0 });

  const heartId = useRef(0);
  const floatId = useRef(0);
  const prevStageRef = useRef<number | null>(null);

  const preferredWords = useMemo<WordPair[]>(
    () =>
      (savedWords || [])
        .filter((w) => w.word && w.vi)
        .map((w) => ({ en: w.word, vi: w.vi })),
    [savedWords],
  );

  const lvl = pet ? levelFromExp(pet.exp) : null;
  const species = pet ? getSpecies(pet.species) : undefined;
  const stageIdx = species && lvl ? stageIndexForLevel(species, lvl.level) : 0;

  useEffect(() => {
    let alive = true;
    loadWordBank()
      .then((words) => {
        if (alive && words.length >= 4) setBank(words);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    syncPetDecay();
    const timer = setInterval(syncPetDecay, 60_000);
    return () => clearInterval(timer);
  }, [syncPetDecay]);

  useEffect(() => {
    if (!species) return;
    if (prevStageRef.current === null) {
      prevStageRef.current = stageIdx;
      return;
    }
    if (stageIdx > prevStageRef.current) {
      setEvolving(true);
      setEvolveKey((key) => key + 1);
      playEvolveChime();
      if (stageIdx === species.stages.length - 1) {
        setEvolveShowcase(true);
        setEvolveVideo(`/games/pet/evolve/${species.id}.mp4`);
      }
      const timer = setTimeout(() => setEvolving(false), 2200);
      prevStageRef.current = stageIdx;
      return () => clearTimeout(timer);
    }
    prevStageRef.current = stageIdx;
  }, [stageIdx, species]);

  const pushFloat = useCallback((text: string) => {
    const id = floatId.current++;
    setFloats((items) => [...items, { id, text }]);
    setTimeout(() => setFloats((items) => items.filter((item) => item.id !== id)), 1300);
  }, []);

  const pokeHappy = useCallback(() => {
    setAnim('happy');
    setTimeout(() => setAnim('idle'), 650);
  }, []);

  const openQuiz = (action: PetActionKey) => {
    const nextQuiz = buildPetQuiz(bank, PET_ACTIONS[action].quizDirection, Math.random, preferredWords);
    setQuizAction(action);
    setQuiz(nextQuiz);
    setPicked(null);
    setResult(null);
    setTimeout(() => speakEnglish(nextQuiz.word.en), 250);
  };

  const closeQuiz = () => {
    setQuizAction(null);
    setQuiz(null);
    setPicked(null);
    setResult(null);
  };

  const nextQuestion = () => {
    if (!quizAction) return;
    const nextQuiz = buildPetQuiz(bank, PET_ACTIONS[quizAction].quizDirection, Math.random, preferredWords);
    setQuiz(nextQuiz);
    setPicked(null);
    setResult(null);
    setTimeout(() => speakEnglish(nextQuiz.word.en), 200);
  };

  const choose = (option: string) => {
    if (!quiz || !quizAction || result) return;
    setPicked(option);
    if (option === quiz.answer) {
      const def = PET_ACTIONS[quizAction];
      const coinReward = carePet(quizAction, combo);
      setLastReward({ exp: def.exp, coins: coinReward });
      setResult('correct');
      setCombo((current) => current + 1);
      playDing();
      speakEnglish(quiz.word.en);
      pokeHappy();
      setLearnedWords((prev) => {
        const next = new Set(prev);
        next.add(quiz.word.en.toLowerCase());
        return next;
      });
      if (!questDoneRef.current) {
        questDoneRef.current = true;
        try {
          completeQuestStep('game');
        } catch {
          // Daily quest is optional.
        }
      }
      const id = heartId.current++;
      setHearts((items) => [...items, id]);
      setTimeout(() => setHearts((items) => items.filter((item) => item !== id)), 1400);
      pushFloat(`+${def.exp} EXP · +${coinReward} xu`);
      setTimeout(closeQuiz, 1400);
      return;
    }

    setResult('wrong');
    setCombo(0);
    playBuzz();
    speakEnglish(quiz.word.en);
    setAnim('sad');
    setTimeout(() => setAnim('idle'), 600);
  };

  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-sky-100 to-violet-100" />
      </>
    );
  }

  if (!pet || !species || !lvl) {
    return <AdoptScreen onAdopt={adoptPet} hasBadPet={!!pet && !species} />;
  }

  const stage = currentStage(species, lvl.level);
  const next = nextStage(species, lvl.level);
  const final = isFinalStage(species, lvl.level);
  const mood = petMood(pet);
  const wellbeing = petWellbeing(pet);
  const reactClass = evolving ? 'pet-evolve' : anim === 'happy' ? 'pet-happy' : anim === 'sad' ? 'pet-sad' : '';
  const closeEvolveShowcase = () => {
    setEvolveShowcase(false);
    setEvolveVideo(null);
  };

  return (
    <>
      <Header />
      <Fireworks trigger={evolveKey} duration={2000} />
      {evolveShowcase && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-slate-950">
          {evolveVideo ? (
            <video
              src={evolveVideo}
              autoPlay
              muted
              playsInline
              className="relative z-10 max-h-full max-w-full"
              onEnded={closeEvolveShowcase}
              onError={() => setEvolveVideo(null)}
            />
          ) : (
            <div className={`evolve-cinematic relative flex h-full w-full items-center justify-center bg-gradient-to-br ${species.bg}`}>
              <div className="evolve-ring absolute h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full" style={{ background: `radial-gradient(circle, ${species.glow} 0%, transparent 68%)` }} />
              <div className="evolve-beam absolute h-[120vh] w-28 rotate-12 bg-white/35 blur-3xl" />
              <div className="evolve-beam evolve-beam-delay absolute h-[120vh] w-24 -rotate-12 bg-fuchsia-200/35 blur-3xl" />
              {SPARKLES.map((spark, index) => (
                <span
                  key={`${spark.left}-${index}`}
                  className="evolve-particle absolute text-3xl"
                  style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }}
                >
                  {spark.char}
                </span>
              ))}
              <div className="relative z-10 flex flex-col items-center px-6 text-center">
                <div className="evolve-title rounded-full bg-white/90 px-5 py-2 text-sm font-black uppercase tracking-wide text-violet-700 shadow-xl">
                  Tiến hóa hoàn tất
                </div>
                <Image
                  src={stage.art}
                  alt={stage.nameVi}
                  width={360}
                  height={360}
                  unoptimized
                  className="evolve-creature mt-5 h-[min(62vw,360px)] w-[min(62vw,360px)] object-contain"
                  style={{ filter: 'drop-shadow(0 28px 32px rgba(15,23,42,0.35))' }}
                />
                <div className="mt-5 rounded-[1.75rem] bg-white/88 px-7 py-4 shadow-2xl backdrop-blur">
                  <div className="text-3xl font-black text-slate-950">{species.emoji} {stage.nameVi}</div>
                  <div className="mt-1 text-sm font-bold text-slate-500">{species.tagline}</div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={closeEvolveShowcase}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-black text-violet-700 shadow-lg"
          >
            Bỏ qua
          </button>
        </div>
      )}

      <main className={`min-h-screen bg-gradient-to-b ${species.bg} pb-28 pt-3`}>
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link href="/games" className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-violet-700 shadow-md backdrop-blur hover:bg-white">
              ← Game
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {combo >= 2 && (
                <span className="rounded-full bg-white/90 px-3 py-2 text-xs font-black text-fuchsia-600 shadow-md">Combo x{combo}</span>
              )}
              <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-amber-600 shadow-md">
                <UiIcon name="coins" size={20} /> {coins} xu
              </span>
            </div>
          </div>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="pet-room relative min-h-[560px] overflow-hidden rounded-[2rem] border border-white/70 bg-sky-100 shadow-2xl">
              <div className="pet-sky absolute inset-0" />
              <div className="pet-hills absolute inset-x-0 bottom-28 h-40" />
              <div className="pet-floor absolute inset-x-0 bottom-0 h-40" />
              <div className="absolute left-6 top-6 rounded-2xl bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wide text-violet-500">Thú cưng thần thoại</p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">{species.emoji} {pet.name}</h1>
                <p className="text-sm font-bold text-slate-500">Cấp {lvl.level} · {stage.nameVi}</p>
              </div>
              <div className="absolute right-6 top-6 rounded-2xl bg-white/85 px-4 py-3 text-right shadow-lg backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-500">Tâm trạng</p>
                <p className="mt-1 text-xl font-black text-slate-950">{MOOD_FACE[mood]} {wellbeing}%</p>
              </div>

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {SPARKLES.map((spark, i) => (
                  <span key={i} className="pet-spark absolute text-xl" style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }}>{spark.char}</span>
                ))}
              </div>

              <div className="relative z-10 flex min-h-[560px] flex-col items-center justify-end px-5 pb-14 pt-32">
                <div className="relative flex h-72 w-full max-w-sm items-end justify-center">
                  <div
                    className="pet-aura absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ background: `radial-gradient(circle, ${species.glow} 0%, transparent 70%)` }}
                  />
                  {hearts.map((id) => (<span key={id} className="pet-heart pointer-events-none absolute text-2xl">💗</span>))}
                  {floats.map((float) => (
                    <span key={float.id} className="pet-float-msg pointer-events-none absolute z-20 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-600 shadow">
                      {float.text}
                    </span>
                  ))}
                  <button type="button" onClick={pokeHappy} aria-label="Chạm vào thú cưng" className="pet-bob relative z-10 outline-none">
                    <span className="pet-sway block">
                      <span className={`block ${reactClass}`}>
                        <span className="pet-breathe block">
                          <Image
                            src={stage.art}
                            alt={stage.nameVi}
                            width={230}
                            height={230}
                            unoptimized
                            priority
                            className="h-[230px] w-[230px] object-contain"
                            style={{ filter: 'drop-shadow(0 18px 24px rgba(15,23,42,0.32))' }}
                          />
                        </span>
                      </span>
                    </span>
                  </button>
                  {evolving && <div key={`flash-${evolveKey}`} className="pet-flash pointer-events-none absolute inset-0 rounded-full bg-white" />}
                  <div className="pet-shadow absolute bottom-4 h-5 w-44 rounded-full bg-black/25 blur-md" />
                </div>

                <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/88 p-4 shadow-xl backdrop-blur">
                  <div className="mb-2 flex justify-between text-xs font-black text-slate-600">
                    <span>Kinh nghiệm</span>
                    <span>{lvl.intoLevel}/{lvl.needed}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full bg-gradient-to-r ${species.accent} transition-all`} style={{ width: `${Math.max(lvl.progress * 100, 4)}%` }} />
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-slate-500">
                    {final ? 'Đã đạt hình dạng tối thượng.' : `Tiến hóa thành "${next?.nameVi}" ở cấp ${next?.minLevel}.`}
                  </p>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-4 shadow-xl backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-violet-500">Chăm sóc</p>
                    <h2 className="text-xl font-black text-slate-950">Trạng thái</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-600">{wellbeing}%</span>
                </div>
                <div className="space-y-3">
                  {(Object.keys(STAT_META) as PetStatKey[]).map((key) => {
                    const meta = STAT_META[key];
                    const val = pet[key];
                    return (
                      <div key={key} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${meta.soft}`}>{meta.emoji} {meta.labelVi}</span>
                          <span className={val < 25 ? 'text-sm font-black text-rose-500' : 'text-sm font-black text-slate-500'}>{val}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all`} style={{ width: `${Math.max(val, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ACTION_ORDER.map((key) => {
                  const def = PET_ACTIONS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => openQuiz(key)}
                      className={`group rounded-[1.4rem] bg-gradient-to-br ${ACTION_STYLE[key]} p-0.5 shadow-lg transition-transform hover:-translate-y-1`}
                    >
                      <span className="flex min-h-[126px] flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-white/92 p-3">
                        <Image src={`/games/pet/${def.asset}.png`} alt={def.labelVi} width={54} height={54} unoptimized className="transition-transform group-hover:scale-110" />
                        <span className="text-sm font-black text-slate-800">{def.labelVi}</span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">+{def.exp} EXP</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 text-center shadow-lg backdrop-blur">
                <p className="text-sm font-black text-slate-800">Trả lời đúng từ tiếng Anh để chăm sóc thú cưng.</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Đã ôn {learnedWords.size} từ hôm nay{combo >= 2 ? ` · Combo x${combo}` : ''}
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>

      {quiz && quizAction && (
        <QuizModal
          quiz={quiz}
          action={quizAction}
          picked={picked}
          result={result}
          lastReward={lastReward}
          combo={combo}
          onClose={closeQuiz}
          onChoose={choose}
          onNext={nextQuestion}
        />
      )}

      <PetStyles />
    </>
  );
}

function QuizModal({
  quiz,
  action,
  picked,
  result,
  lastReward,
  combo,
  onClose,
  onChoose,
  onNext,
}: {
  quiz: PetQuiz;
  action: PetActionKey;
  picked: string | null;
  result: 'correct' | 'wrong' | null;
  lastReward: { exp: number; coins: number };
  combo: number;
  onClose: () => void;
  onChoose: (option: string) => void;
  onNext: () => void;
}) {
  const actionDef = PET_ACTIONS[action];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="quiz-pop w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className={`bg-gradient-to-r ${ACTION_STYLE[action]} px-5 py-4 text-white`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-black">
              <Image src={`/games/pet/${actionDef.asset}.png`} alt="" width={30} height={30} unoptimized />
              {actionDef.labelVi}
            </span>
            <button onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-black hover:bg-white/30">×</button>
          </div>
          <p className="mt-2 text-xs font-bold text-white/86">{actionDef.promptLabelVi}</p>
        </div>

        <div className="p-5">
          {result === 'correct' ? (
            <div className="quiz-pop flex flex-col items-center py-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl shadow-inner">✓</div>
              <div className="mt-2 text-xl font-black text-emerald-600">Chính xác!</div>
              <button onClick={() => speakEnglish(quiz.word.en)} className="mt-2 flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-base font-black text-violet-700">
                🔊 {quiz.word.en} <span className="text-sm font-bold text-slate-400">= {quiz.word.vi}</span>
              </button>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-black">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-600">+{lastReward.exp} EXP</span>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-600">+{lastReward.coins} xu</span>
                {combo >= 2 && <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-fuchsia-600">Combo x{combo}</span>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-violet-100 to-sky-100 py-5">
                <span className="text-3xl font-black text-violet-700">{quiz.prompt}</span>
                <button onClick={() => speakEnglish(quiz.word.en)} aria-label="Nghe phát âm" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow transition-transform hover:scale-110">🔊</button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {quiz.options.map((option) => {
                  const isAnswer = option === quiz.answer;
                  const isPicked = picked === option;
                  let cls = 'bg-slate-50 text-slate-700 hover:bg-violet-50 ring-1 ring-slate-200';
                  if (result === 'wrong' && isAnswer) cls = 'bg-emerald-500 text-white ring-2 ring-emerald-500';
                  else if (result === 'wrong' && isPicked) cls = 'bg-rose-500 text-white ring-2 ring-rose-500';
                  else if (result === 'wrong') cls = 'bg-slate-50 text-slate-300 ring-1 ring-slate-100';
                  return (
                    <button
                      key={option}
                      onClick={() => onChoose(option)}
                      disabled={!!result}
                      className={`rounded-2xl px-3 py-4 text-base font-black shadow-sm transition-all ${cls} ${result === 'wrong' && isPicked ? 'quiz-shake' : ''}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {result === 'wrong' ? (
                <div className="mt-4 text-center">
                  <div className="text-sm font-black text-rose-500">Chưa đúng rồi, thử lại nhé.</div>
                  <button onClick={() => speakEnglish(quiz.word.en)} className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-base font-black text-emerald-700">
                    🔊 {quiz.word.en} <span className="text-sm font-bold text-slate-400">= {quiz.word.vi}</span>
                  </button>
                  <button
                    onClick={onNext}
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-black text-white shadow-md transition-transform hover:scale-105"
                  >
                    Thử câu khác →
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">Chọn đáp án đúng để chăm sóc thú cưng</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SPARKLES = [
  { char: '✨', left: '12%', top: '20%', delay: '0s' },
  { char: '⭐', left: '82%', top: '24%', delay: '0.6s' },
  { char: '✨', left: '18%', top: '68%', delay: '1.1s' },
  { char: '💫', left: '78%', top: '66%', delay: '1.7s' },
  { char: '✨', left: '50%', top: '15%', delay: '0.9s' },
];

function PetStyles() {
  return (
    <style jsx global>{`
      .pet-sky {
        background:
          linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.18) 55%, transparent 100%),
          linear-gradient(180deg, #e0f2fe 0%, #fef3c7 100%);
      }
      .pet-hills {
        background:
          linear-gradient(145deg, transparent 0 12%, rgba(74,222,128,0.92) 12% 48%, transparent 48%),
          linear-gradient(35deg, transparent 0 22%, rgba(34,197,94,0.82) 22% 65%, transparent 65%);
      }
      .pet-floor {
        background:
          linear-gradient(180deg, rgba(255,255,255,0.16), transparent 22%),
          linear-gradient(135deg, #86efac 0 25%, #bbf7d0 25% 50%, #86efac 50% 75%, #bbf7d0 75%);
        background-size: auto, 46px 46px;
      }
      @keyframes pet-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
      .pet-bob { animation: pet-bob 3s ease-in-out infinite; }
      @keyframes pet-sway { 0%,100% { transform: rotate(-3deg) translateX(-3px); } 50% { transform: rotate(3deg) translateX(3px); } }
      .pet-sway { animation: pet-sway 4.3s ease-in-out infinite; transform-origin: 50% 90%; }
      @keyframes pet-breathe { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.045,0.965); } }
      .pet-breathe { animation: pet-breathe 2.1s ease-in-out infinite; transform-origin: 50% 100%; }
      @keyframes pet-happy-anim { 0% { transform: scale(1) rotate(0); } 30% { transform: scale(1.18) rotate(-6deg); } 60% { transform: scale(1.1) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
      .pet-happy { animation: pet-happy-anim 0.65s ease-in-out; }
      @keyframes pet-sad-anim { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-9deg); } 40% { transform: rotate(8deg); } 60% { transform: rotate(-6deg); } 80% { transform: rotate(4deg); } }
      .pet-sad { animation: pet-sad-anim 0.55s ease-in-out; }
      @keyframes pet-evolve-anim { 0% { transform: scale(1) rotate(0); } 25% { transform: scale(0.7) rotate(-8deg); filter: brightness(2); } 55% { transform: scale(1.35) rotate(8deg); filter: brightness(2.2); } 100% { transform: scale(1) rotate(0); } }
      .pet-evolve { animation: pet-evolve-anim 1.6s cubic-bezier(0.34,1.56,0.64,1) both; }
      @keyframes pet-flash-anim { 0% { opacity: 0; transform: scale(0.4); } 40% { opacity: 0.9; } 100% { opacity: 0; transform: scale(1.8); } }
      .pet-flash { animation: pet-flash-anim 1.2s ease-out forwards; }
      @keyframes pet-aura-anim { 0%,100% { opacity: 0.55; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.12); } }
      .pet-aura { animation: pet-aura-anim 3s ease-in-out infinite; }
      @keyframes pet-shadow-anim { 0%,100% { transform: scaleX(1); opacity: 0.25; } 50% { transform: scaleX(0.8); opacity: 0.18; } }
      .pet-shadow { animation: pet-shadow-anim 3s ease-in-out infinite; }
      @keyframes pet-spark-anim { 0%,100% { opacity: 0.2; transform: translateY(0) scale(0.8); } 50% { opacity: 1; transform: translateY(-10px) scale(1.1); } }
      .pet-spark { animation: pet-spark-anim 2.8s ease-in-out infinite; }
      @keyframes pet-heart-float { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-110px) scale(1.2); opacity: 0; } }
      .pet-heart { bottom: 80px; animation: pet-heart-float 1.2s ease-out forwards; }
      @keyframes pet-float-msg-anim { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-70px) scale(1.05); opacity: 0; } }
      .pet-float-msg { top: 20px; animation: pet-float-msg-anim 1.3s ease-out forwards; }
      @keyframes quiz-pop-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      .quiz-pop { animation: quiz-pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
      @keyframes quiz-shake-anim { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
      .quiz-shake { animation: quiz-shake-anim 0.3s ease-in-out 2; }
      @keyframes evolve-ring-spin {
        0% { opacity: 0; transform: rotate(0deg) scale(0.45); filter: blur(18px); }
        35% { opacity: 0.95; transform: rotate(120deg) scale(1.04); filter: blur(8px); }
        100% { opacity: 0.72; transform: rotate(360deg) scale(1); filter: blur(12px); }
      }
      .evolve-ring { animation: evolve-ring-spin 3.8s ease-out infinite; }
      @keyframes evolve-beam-sweep {
        0% { opacity: 0; transform: translateX(-44vw) rotate(12deg); }
        35% { opacity: 0.78; }
        100% { opacity: 0; transform: translateX(44vw) rotate(12deg); }
      }
      .evolve-beam { animation: evolve-beam-sweep 2.6s ease-in-out infinite; }
      .evolve-beam-delay { animation-delay: 0.85s; }
      @keyframes evolve-creature-reveal {
        0% { opacity: 0; transform: translateY(28px) scale(0.62) rotate(-5deg); filter: brightness(2.4) blur(5px); }
        42% { opacity: 1; transform: translateY(-12px) scale(1.16) rotate(3deg); filter: brightness(1.85) blur(0); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
      }
      .evolve-creature { animation: evolve-creature-reveal 1.55s cubic-bezier(0.34,1.56,0.64,1) both, pet-bob 3.2s ease-in-out 1.55s infinite; }
      @keyframes evolve-particle-float {
        0% { opacity: 0; transform: translateY(22px) scale(0.4) rotate(0deg); }
        30% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-80px) scale(1.28) rotate(28deg); }
      }
      .evolve-particle { animation: evolve-particle-float 2.4s ease-out infinite; text-shadow: 0 8px 24px rgba(255,255,255,0.55); }
      @keyframes evolve-title-pop {
        0% { opacity: 0; transform: translateY(-12px) scale(0.88); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .evolve-title { animation: evolve-title-pop 0.45s ease-out both; }
      @media (prefers-reduced-motion: reduce) {
        .pet-bob, .pet-sway, .pet-breathe, .pet-aura, .pet-shadow, .pet-spark, .evolve-ring, .evolve-beam, .evolve-creature, .evolve-particle { animation: none; }
        .pet-happy, .pet-sad, .pet-evolve, .pet-flash, .pet-heart, .pet-float-msg, .quiz-pop, .quiz-shake, .evolve-title { animation-duration: 0.4s; animation-iteration-count: 1; }
      }
    `}</style>
  );
}

function AdoptScreen({ onAdopt, hasBadPet }: { onAdopt: (species: string, name: string) => void; hasBadPet?: boolean }) {
  const [selectedId, setSelectedId] = useState(PET_SPECIES[0].id);
  const [name, setName] = useState('');
  const selected = useMemo<PetSpecies>(() => getSpecies(selectedId) ?? PET_SPECIES[0], [selectedId]);
  const eggArt = selected.stages[0].art;

  return (
    <>
      <Header />
      <main className={`min-h-screen bg-gradient-to-b ${selected.bg} pb-24 pt-4 transition-colors duration-500`}>
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <section className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-white/70 bg-sky-100 shadow-2xl">
            <div className="pet-sky absolute inset-0" />
            <div className="pet-hills absolute inset-x-0 bottom-28 h-40" />
            <div className="pet-floor absolute inset-x-0 bottom-0 h-40" />
            <div className="relative z-10 flex min-h-[560px] flex-col items-center justify-center px-5 py-10 text-center">
              <p className="rounded-full bg-white/82 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-violet-600 shadow">Bắt đầu hành trình</p>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl">Chọn trứng thần thoại</h1>
              <p className="mt-3 max-w-lg text-sm font-bold text-white/92 drop-shadow">
                {hasBadPet
                  ? 'Hãy chọn lại một quả trứng để bắt đầu hành trình tiến hóa.'
                  : 'Nuôi từ trứng nhỏ, trả lời đúng tiếng Anh để tiến hóa thành sinh vật huyền thoại.'}
              </p>

              <div className="relative mt-7 flex h-64 w-64 items-center justify-center">
                <div className="pet-aura absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${selected.glow} 0%, transparent 70%)` }} />
                <Image src={eggArt} alt={selected.nameVi} width={170} height={170} unoptimized className="adopt-bob relative z-10 object-contain" style={{ filter: 'drop-shadow(0 16px 22px rgba(15,23,42,0.32))' }} />
                <div className="pet-shadow absolute bottom-8 h-5 w-40 rounded-full bg-black/25 blur-md" />
              </div>

              <div className="rounded-3xl bg-white/88 px-5 py-3 shadow-xl backdrop-blur">
                <div className="text-xl font-black text-slate-950">{selected.emoji} {selected.nameVi}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">{selected.tagline}</div>
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-[2rem] border border-white/70 bg-white/88 p-4 shadow-2xl backdrop-blur">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">Chọn giống</p>
              <h2 className="text-2xl font-black text-slate-950">Bạn muốn nuôi con nào?</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PET_SPECIES.map((species) => (
                <button
                  key={species.id}
                  onClick={() => setSelectedId(species.id)}
                  className={`rounded-[1.4rem] bg-white p-3 text-left shadow-sm ring-1 transition-all hover:-translate-y-1 hover:shadow-lg ${
                    selectedId === species.id ? 'ring-4 ring-violet-300' : 'ring-slate-100'
                  }`}
                  title={species.nameVi}
                >
                  <Image src={species.stages[species.stages.length - 1].art} alt={species.nameVi} width={76} height={76} unoptimized className="mx-auto h-[76px] w-[76px] object-contain" />
                  <span className="mt-2 block text-center text-xs font-black text-slate-800">{species.emoji} {species.nameVi}</span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Tiến hóa</p>
              <div className="flex items-center justify-center gap-1.5">
                {selected.stages.map((stage, index) => (
                  <div key={stage.art} className="flex items-center gap-1.5">
                    {index > 0 && <span className="text-slate-300">→</span>}
                    <Image src={stage.art} alt={stage.nameVi} width={38} height={38} unoptimized className="h-9 w-9 object-contain" />
                  </div>
                ))}
              </div>
            </div>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
              placeholder="Đặt tên cho thú cưng..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-bold text-slate-700 shadow-sm outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
            <button
              onClick={() => onAdopt(selected.id, name)}
              className={`w-full rounded-2xl bg-gradient-to-r ${selected.accent} px-8 py-3 text-base font-black text-white shadow-lg transition-transform hover:scale-[1.02]`}
            >
              Ấp trứng
            </button>
          </aside>
        </div>
      </main>
      <style jsx global>{`
        @keyframes adopt-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        .adopt-bob { animation: adopt-bob 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .adopt-bob { animation: none; } }
      `}</style>
    </>
  );
}
