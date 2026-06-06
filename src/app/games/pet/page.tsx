'use client';

/**
 * "Thú Cưng Thần Thoại" — raise a baby creature into a legendary beast by
 * LEARNING ENGLISH. Every care action (feed/play/bath/sleep) is gated behind a
 * quick vocabulary quiz drawn from the shared word bank. Correct answers grant
 * EXP + coins (with a combo bonus); enough EXP levels up and EVOLVES the
 * creature through dramatic glowing stages.
 *
 * The creature is "alive": layered idle animations (float + sway + breathe),
 * reacts happily when fed and shakes its head on a wrong answer, and jumps when
 * tapped. Pure React + CSS + Icons8 art (no game engine). State is persisted;
 * needs decay over real time.
 */

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

const STAT_META: Record<PetStatKey, { labelVi: string; emoji: string; bar: string }> = {
  hunger: { labelVi: 'No bụng', emoji: '🍎', bar: 'from-orange-400 to-amber-500' },
  happiness: { labelVi: 'Vui vẻ', emoji: '❤️', bar: 'from-pink-400 to-rose-500' },
  clean: { labelVi: 'Sạch sẽ', emoji: '🛁', bar: 'from-sky-400 to-cyan-500' },
  energy: { labelVi: 'Năng lượng', emoji: '⚡', bar: 'from-violet-400 to-purple-500' },
};

const ACTION_ORDER: PetActionKey[] = ['feed', 'play', 'bath', 'sleep'];
const MOOD_FACE: Record<'happy' | 'ok' | 'sad', string> = { happy: '😄', ok: '🙂', sad: '😢' };
type PetAnim = 'idle' | 'happy' | 'sad';

/** Tiny WebAudio rising arpeggio for the evolution moment. */
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
    /* ignore */
  }
}
const playEvolveChime = () => playTones([523, 659, 784, 1047, 1319], 0.1);
const playDing = () => playTones([880, 1175], 0.08);
const playBuzz = () => playTones([200, 150], 0.1);

export default function PetGamePage() {
  const pet = useAppStore((state) => state.pet);
  const coins = useAppStore((state) => state.coins);
  const hydrated = useAppStore((state) => state.hydrated);
  const adoptPet = useAppStore((state) => state.adoptPet);
  const carePet = useAppStore((state) => state.carePet);
  const syncPetDecay = useAppStore((state) => state.syncPetDecay);

  const [bank, setBank] = useState<WordPair[]>(DEFAULT_WORD_BANK);
  const [hearts, setHearts] = useState<number[]>([]);
  const [evolveKey, setEvolveKey] = useState(0);
  const [evolving, setEvolving] = useState(false);
  const [anim, setAnim] = useState<PetAnim>('idle');
  const [combo, setCombo] = useState(0);
  const [floats, setFloats] = useState<Array<{ id: number; text: string }>>([]);

  // Quiz modal state
  const [quizAction, setQuizAction] = useState<PetActionKey | null>(null);
  const [quiz, setQuiz] = useState<PetQuiz | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const heartId = useRef(0);
  const floatId = useRef(0);
  const prevStageRef = useRef<number | null>(null);

  const lvl = pet ? levelFromExp(pet.exp) : null;
  const species = pet ? getSpecies(pet.species) : undefined;
  const stageIdx = species && lvl ? stageIndexForLevel(species, lvl.level) : 0;

  // Load the shared word bank once.
  useEffect(() => {
    let alive = true;
    loadWordBank().then((b) => { if (alive && b.length >= 4) setBank(b); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Decay on mount + every 60s so the bars stay live.
  useEffect(() => {
    syncPetDecay();
    const t = setInterval(syncPetDecay, 60_000);
    return () => clearInterval(t);
  }, [syncPetDecay]);

  // Detect evolution: when the resolved stage index increases, celebrate.
  useEffect(() => {
    if (!species) return;
    if (prevStageRef.current === null) { prevStageRef.current = stageIdx; return; }
    if (stageIdx > prevStageRef.current) {
      setEvolving(true);
      setEvolveKey((k) => k + 1);
      playEvolveChime();
      const t = setTimeout(() => setEvolving(false), 2200);
      prevStageRef.current = stageIdx;
      return () => clearTimeout(t);
    }
    prevStageRef.current = stageIdx;
  }, [stageIdx, species]);

  const pushFloat = useCallback((text: string) => {
    const id = floatId.current++;
    setFloats((f) => [...f, { id, text }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const pokeHappy = useCallback(() => {
    setAnim('happy');
    setTimeout(() => setAnim('idle'), 650);
  }, []);

  const openQuiz = (action: PetActionKey) => {
    setQuizAction(action);
    setQuiz(buildPetQuiz(bank, PET_ACTIONS[action].quizDirection));
    setPicked(null);
    setResult(null);
  };

  const closeQuiz = () => {
    setQuizAction(null);
    setQuiz(null);
    setPicked(null);
    setResult(null);
  };

  const choose = (option: string) => {
    if (!quiz || !quizAction || result) return;
    setPicked(option);
    if (option === quiz.answer) {
      const def = PET_ACTIONS[quizAction];
      const reward = carePet(quizAction, combo);
      setResult('correct');
      setCombo((c) => c + 1);
      playDing();
      pokeHappy();
      // flying hearts
      const id = heartId.current++;
      setHearts((h) => [...h, id]);
      setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1200);
      pushFloat(`+${def.exp} EXP · +${reward} 🪙`);
      setTimeout(closeQuiz, 1050);
    } else {
      setResult('wrong');
      setCombo(0);
      playBuzz();
      setAnim('sad');
      setTimeout(() => setAnim('idle'), 600);
      // give a fresh question for the same action so they can try again
      setTimeout(() => {
        setQuiz(buildPetQuiz(bank, PET_ACTIONS[quizAction].quizDirection));
        setPicked(null);
        setResult(null);
      }, 1200);
    }
  };

  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-950" />
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
  const art = `/avatars/${stage.art}.png`;
  const reactClass = evolving ? 'pet-evolve' : anim === 'happy' ? 'pet-happy' : anim === 'sad' ? 'pet-sad' : '';

  return (
    <>
      <Header />
      <Fireworks trigger={evolveKey} duration={2000} />
      <main className={`min-h-screen bg-gradient-to-b ${species.bg} pb-28`}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/games" className="rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-violet-700 shadow">← Game</Link>
            <div className="flex items-center gap-2">
              {combo >= 2 && (
                <span className="rounded-full bg-white/90 px-3 py-2 text-xs font-black text-fuchsia-600 shadow">🔥 Combo x{combo}</span>
              )}
              <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-amber-600 shadow">
                <UiIcon name="coins" size={20} /> {coins} xu
              </span>
            </div>
          </div>

          {/* Creature stage */}
          <section className="relative overflow-hidden rounded-[2.5rem] border-4 border-white/70 p-6 shadow-2xl">
            <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, ${species.glow} 0%, transparent 62%)` }} />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {SPARKLES.map((s, i) => (
                <span key={i} className="pet-spark absolute text-lg" style={{ left: s.left, top: s.top, animationDelay: s.delay }}>{s.char}</span>
              ))}
            </div>

            <div className="relative flex flex-col items-center">
              <div className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-1.5 text-sm font-black text-slate-700 shadow">
                <span className="text-base">{species.emoji}</span> {pet.name} · Cấp {lvl.level}
              </div>
              <div className="mt-1 rounded-full bg-black/25 px-3 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                {MOOD_FACE[mood]} {stage.nameVi}
              </div>

              {/* Creature — layered animations for an "alive" feel */}
              <div className="relative mt-3 flex h-60 w-60 items-end justify-center">
                <div className="pet-aura absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
                     style={{ background: `radial-gradient(circle, ${species.glow} 0%, transparent 70%)` }} />
                {hearts.map((id) => (<span key={id} className="pet-heart pointer-events-none absolute text-2xl">❤️</span>))}
                {floats.map((f) => (<span key={f.id} className="pet-float-msg pointer-events-none absolute z-20 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-600 shadow">{f.text}</span>))}

                <button type="button" onClick={pokeHappy} aria-label="Chạm vào thú cưng" className="pet-bob relative outline-none">
                  <span className="pet-sway block">
                    <span className={`block ${reactClass}`}>
                      <span className="pet-breathe block">
                        <Image src={art} alt={stage.nameVi} width={190} height={190} unoptimized priority style={{ objectFit: 'contain', filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.35))' }} />
                      </span>
                    </span>
                  </span>
                </button>
                {evolving && <div key={`flash-${evolveKey}`} className="pet-flash pointer-events-none absolute inset-0 rounded-full bg-white" />}
                <div className="pet-shadow absolute bottom-1 h-4 w-32 rounded-full bg-black/25 blur-md" />
              </div>

              {/* Level / EXP bar */}
              <div className="mt-2 w-full max-w-xs">
                <div className="mb-1 flex justify-between text-xs font-bold text-white/90 drop-shadow">
                  <span>Kinh nghiệm</span>
                  <span>{lvl.intoLevel}/{lvl.needed}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/20">
                  <div className={`h-full rounded-full bg-gradient-to-r ${species.accent} transition-all`} style={{ width: `${Math.max(lvl.progress * 100, 4)}%` }} />
                </div>
                <p className="mt-1.5 text-center text-xs font-bold text-white/90 drop-shadow">
                  {final ? '⭐ Đã đạt hình dạng tối thượng!' : `Tiến hóa thành "${next?.nameVi}" ở cấp ${next?.minLevel}`}
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mt-4 grid grid-cols-2 gap-3">
            {(Object.keys(STAT_META) as PetStatKey[]).map((k) => {
              const meta = STAT_META[k];
              const val = pet[k];
              return (
                <div key={k} className="rounded-2xl bg-white/95 p-3 shadow-sm">
                  <div className="mb-1 flex items-center justify-between text-sm font-black text-slate-700">
                    <span>{meta.emoji} {meta.labelVi}</span>
                    <span className={val < 25 ? 'text-rose-500' : 'text-slate-400'}>{val}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all`} style={{ width: `${Math.max(val, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Actions — each opens an English quiz */}
          <section className="mt-4 grid grid-cols-4 gap-3">
            {ACTION_ORDER.map((key) => {
              const def = PET_ACTIONS[key];
              return (
                <button
                  key={key}
                  onClick={() => openQuiz(key)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-white/95 p-3 shadow-md transition-transform hover:-translate-y-1"
                >
                  <Image src={`/games/pet/${def.asset}.png`} alt={def.labelVi} width={48} height={48} unoptimized />
                  <span className="text-xs font-black text-slate-700">{def.labelVi}</span>
                  <span className="text-[10px] font-bold text-emerald-600">Trả lời đúng</span>
                </button>
              );
            })}
          </section>

          <p className="mt-4 text-center text-xs font-semibold text-white/90 drop-shadow">
            Trả lời đúng từ tiếng Anh để chăm sóc, lên cấp và tiến hóa thú cưng thần thoại của bé!
          </p>
        </div>
      </main>

      {/* Quiz modal */}
      {quiz && quizAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={closeQuiz}>
          <div className="quiz-pop w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                <Image src={`/games/pet/${PET_ACTIONS[quizAction].asset}.png`} alt="" width={28} height={28} unoptimized />
                {PET_ACTIONS[quizAction].labelVi}
              </span>
              <button onClick={closeQuiz} aria-label="Đóng" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-500">✕</button>
            </div>

            <p className="mt-3 text-center text-xs font-bold text-slate-500">{PET_ACTIONS[quizAction].promptLabelVi}</p>
            <div className="mt-1 rounded-2xl bg-gradient-to-r from-violet-100 to-sky-100 py-4 text-center">
              <span className="text-2xl font-black text-violet-700">{quiz.prompt}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {quiz.options.map((opt) => {
                const isAnswer = opt === quiz.answer;
                const isPicked = picked === opt;
                let cls = 'bg-slate-50 text-slate-700 hover:bg-slate-100';
                if (result && isAnswer) cls = 'bg-emerald-500 text-white';
                else if (result === 'wrong' && isPicked) cls = 'bg-rose-500 text-white';
                else if (result) cls = 'bg-slate-50 text-slate-400';
                return (
                  <button
                    key={opt}
                    onClick={() => choose(opt)}
                    disabled={!!result}
                    className={`rounded-2xl px-3 py-4 text-base font-black shadow-sm transition-all ${cls} ${result === 'wrong' && isPicked ? 'quiz-shake' : ''}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 h-5 text-center text-sm font-black">
              {result === 'correct' && <span className="text-emerald-600">Chính xác! 🎉</span>}
              {result === 'wrong' && <span className="text-rose-500">Thử lại nhé! 💪</span>}
            </p>
          </div>
        </div>
      )}

      <PetStyles />
    </>
  );
}

const SPARKLES = [
  { char: '✨', left: '12%', top: '18%', delay: '0s' },
  { char: '⭐', left: '82%', top: '22%', delay: '0.6s' },
  { char: '✨', left: '20%', top: '70%', delay: '1.1s' },
  { char: '💫', left: '78%', top: '66%', delay: '1.7s' },
  { char: '✨', left: '50%', top: '10%', delay: '0.9s' },
];

function PetStyles() {
  return (
    <style jsx global>{`
      /* Layered idle motion — different periods so it never looks robotic */
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

      @media (prefers-reduced-motion: reduce) {
        .pet-bob, .pet-sway, .pet-breathe, .pet-aura, .pet-shadow, .pet-spark { animation: none; }
        .pet-happy, .pet-sad, .pet-evolve, .pet-flash, .pet-heart, .pet-float-msg, .quiz-pop, .quiz-shake { animation-duration: 0.4s; animation-iteration-count: 1; }
      }
    `}</style>
  );
}

/* ----------------------------- Adoption ----------------------------- */

function AdoptScreen({ onAdopt, hasBadPet }: { onAdopt: (species: string, name: string) => void; hasBadPet?: boolean }) {
  const [selectedId, setSelectedId] = useState(PET_SPECIES[0].id);
  const [name, setName] = useState('');
  const selected = useMemo<PetSpecies>(() => getSpecies(selectedId) ?? PET_SPECIES[0], [selectedId]);
  const eggArt = `/avatars/${selected.stages[0].art}.png`;

  return (
    <>
      <Header />
      <main className={`min-h-screen bg-gradient-to-b ${selected.bg} pb-24 transition-colors duration-500`}>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="text-center text-3xl font-black text-white drop-shadow-lg">Chọn trứng thần thoại 🥚</h1>
          <p className="mt-1 text-center text-sm font-semibold text-white/90 drop-shadow">
            {hasBadPet
              ? 'Hãy chọn lại một quả trứng để bắt đầu hành trình tiến hóa nhé!'
              : 'Nuôi từ quả trứng nhỏ, trả lời đúng tiếng Anh để tiến hóa thành sinh vật huyền thoại!'}
          </p>

          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] border-4 border-white/70 shadow-xl"
                 style={{ background: `radial-gradient(circle at 50% 45%, ${selected.glow} 0%, transparent 65%)` }}>
              <Image src={eggArt} alt={selected.nameVi} width={120} height={120} unoptimized className="adopt-bob" style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))' }} />
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-white drop-shadow">{selected.emoji} {selected.nameVi}</div>
              <div className="text-xs font-semibold text-white/90 drop-shadow">{selected.tagline}</div>
            </div>

            <div className="flex items-center gap-1.5 rounded-2xl bg-white/85 px-3 py-2 shadow">
              {selected.stages.map((st, i) => (
                <div key={st.art} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-400">→</span>}
                  <div className="flex flex-col items-center" title={`${st.nameVi} (Cấp ${st.minLevel})`}>
                    <Image src={`/avatars/${st.art}.png`} alt={st.nameVi} width={34} height={34} unoptimized />
                  </div>
                </div>
              ))}
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Đặt tên cho thú cưng..."
              className="w-full max-w-xs rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-700 shadow outline-none"
            />
            <button
              onClick={() => onAdopt(selected.id, name)}
              className={`rounded-2xl bg-gradient-to-r ${selected.accent} px-8 py-3 text-base font-black text-white shadow-lg transition-transform hover:scale-105`}
            >
              Ấp trứng! 🥚✨
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PET_SPECIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl bg-white/90 p-3 shadow-sm transition-transform hover:-translate-y-1 ${
                  selectedId === s.id ? 'ring-4 ring-white' : 'ring-1 ring-white/40'
                }`}
                title={s.nameVi}
              >
                <Image src={`/avatars/${s.stages[s.stages.length - 1].art}.png`} alt={s.nameVi} width={52} height={52} unoptimized />
                <span className="text-xs font-black text-slate-700">{s.emoji} {s.nameVi}</span>
              </button>
            ))}
          </div>
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
