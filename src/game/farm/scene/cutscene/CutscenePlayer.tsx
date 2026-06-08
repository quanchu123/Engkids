'use client'

import { useEffect, useState } from 'react'
import type { CutsceneId } from './cutsceneTrigger'

interface CutscenePlayerProps {
  id: CutsceneId | null
  onComplete: () => void
}

const FALLBACK_SCENES: Record<CutsceneId, { badge: string; title: string; palette: string; accent: string }> = {
  'big-harvest': {
    badge: 'Great harvest',
    title: 'Thu hoạch bội thu!',
    palette: 'from-amber-200 via-lime-200 to-emerald-300',
    accent: '#f59e0b',
  },
  'level-up': {
    badge: 'Level up',
    title: 'Lên cấp!',
    palette: 'from-sky-200 via-violet-200 to-fuchsia-300',
    accent: '#8b5cf6',
  },
  'season-change': {
    badge: 'New season',
    title: 'Đổi mùa!',
    palette: 'from-emerald-200 via-cyan-200 to-amber-200',
    accent: '#06b6d4',
  },
}

const SPARKLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${12 + ((index * 23) % 70)}%`,
  delay: `${(index % 6) * 0.16}s`,
}))

export default function CutscenePlayer({ id, onComplete }: CutscenePlayerProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [id])

  useEffect(() => {
    if (!failed) return
    const timer = setTimeout(onComplete, 2600)
    return () => clearTimeout(timer)
  }, [failed, onComplete])

  if (id == null) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
      {!failed ? (
        <video
          src={`/games/english-farm/cutscenes/${id}.mp4`}
          autoPlay
          muted
          playsInline
          className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl"
          onEnded={onComplete}
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackCinematic id={id} />
      )}

      <button
        type="button"
        onClick={onComplete}
        className="absolute right-4 top-4 rounded-full bg-white/88 px-4 py-2 text-sm font-black text-slate-700 shadow hover:bg-white"
      >
        Bỏ qua
      </button>
    </div>
  )
}

function FallbackCinematic({ id }: { id: CutsceneId }) {
  const scene = FALLBACK_SCENES[id]

  return (
    <div className={`farm-cutscene relative h-[min(78vh,560px)] w-[min(92vw,920px)] overflow-hidden rounded-3xl bg-gradient-to-br ${scene.palette} shadow-2xl`}>
      <div className="farm-cutscene-sky absolute inset-0" />
      <div className="farm-cutscene-rays absolute inset-[-20%]" style={{ background: `conic-gradient(from 0deg, transparent, ${scene.accent}55, transparent 26deg)` }} />
      <div className="farm-cutscene-field absolute inset-x-0 bottom-0 h-[42%]" />

      <div className="farm-cutscene-barn absolute left-[8%] top-[14%] h-32 w-40 rounded-t-[42px] bg-red-500 shadow-xl">
        <div className="absolute -top-8 left-2 h-16 w-36 rounded-t-[60px] bg-red-400" />
        <div className="absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 rounded-t-xl bg-white/80" />
      </div>
      <div className="farm-cutscene-tree absolute right-[8%] top-[18%] h-40 w-28">
        <div className="absolute bottom-0 left-1/2 h-24 w-8 -translate-x-1/2 rounded bg-amber-700" />
        <div className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 rounded-full bg-lime-400 shadow-xl" />
      </div>

      <div className="farm-cutscene-crops absolute bottom-[18%] left-1/2 flex -translate-x-1/2 items-end gap-5">
        {['#fb923c', '#facc15', '#22c55e', '#f97316', '#84cc16'].map((color, index) => (
          <span key={color} className="farm-cutscene-crop block h-24 w-12 rounded-full shadow-lg" style={{ background: color, animationDelay: `${index * 0.12}s` }} />
        ))}
      </div>

      {SPARKLES.map((spark) => (
        <span key={`${spark.left}-${spark.top}`} className="farm-cutscene-spark absolute h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]" style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }} />
      ))}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="farm-cutscene-badge rounded-full bg-white/90 px-5 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 shadow-lg">
          {scene.badge}
        </div>
        <h2 className="farm-cutscene-title mt-4 text-4xl font-black text-white drop-shadow-[0_5px_16px_rgba(15,23,42,0.35)] sm:text-6xl">
          {scene.title}
        </h2>
      </div>

      <style jsx>{`
        .farm-cutscene { animation: farm-cutscene-camera 1.8s ease-out both; }
        .farm-cutscene-sky { background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.08)); }
        .farm-cutscene-rays { animation: farm-cutscene-rays 4.5s linear infinite; opacity: 0.55; }
        .farm-cutscene-field {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.16), transparent 22%),
            repeating-linear-gradient(90deg, #65a30d 0 34px, #84cc16 34px 68px);
          border-top: 10px solid rgba(101, 67, 33, 0.55);
        }
        .farm-cutscene-barn, .farm-cutscene-tree { animation: farm-cutscene-float 2.8s ease-in-out infinite; }
        .farm-cutscene-crop { transform-origin: 50% 100%; animation: farm-cutscene-crop 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite alternate; }
        .farm-cutscene-spark { animation: farm-cutscene-spark 1.8s ease-out infinite; }
        .farm-cutscene-badge { animation: farm-cutscene-pop 0.5s ease-out both; }
        .farm-cutscene-title { animation: farm-cutscene-title 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both; }
        @keyframes farm-cutscene-camera {
          0% { opacity: 0; transform: scale(0.96); filter: saturate(0.8); }
          100% { opacity: 1; transform: scale(1); filter: saturate(1.08); }
        }
        @keyframes farm-cutscene-rays { to { transform: rotate(360deg); } }
        @keyframes farm-cutscene-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes farm-cutscene-crop { 0% { transform: translateY(12px) scaleY(0.82); } 100% { transform: translateY(-10px) scaleY(1.08); } }
        @keyframes farm-cutscene-spark {
          0% { opacity: 0; transform: translateY(18px) scale(0.4); }
          35% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-54px) scale(1.35); }
        }
        @keyframes farm-cutscene-pop { from { opacity: 0; transform: translateY(-14px) scale(0.86); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes farm-cutscene-title { from { opacity: 0; transform: translateY(22px) scale(0.82); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .farm-cutscene, .farm-cutscene-rays, .farm-cutscene-barn, .farm-cutscene-tree, .farm-cutscene-crop, .farm-cutscene-spark, .farm-cutscene-badge, .farm-cutscene-title { animation-duration: 0.3s; animation-iteration-count: 1; }
        }
      `}</style>
    </div>
  )
}
