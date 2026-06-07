'use client'

// Trình phát cutscene cho English Farm.
//
// React client component thuần — KHÔNG import @google/genai, KHÔNG ném lỗi.
// Phát video cutscene tương ứng với `id`; nếu video lỗi/thiếu thì hiển thị
// một panel CSS vui thay thế (fallback) rồi tự động hoàn tất.

import { useEffect, useState } from 'react'
import type { CutsceneId } from './cutsceneTrigger'

/** Props của CutscenePlayer. */
interface CutscenePlayerProps {
  /** Cutscene cần phát; `null` nghĩa là không hiển thị gì. */
  id: CutsceneId | null
  /** Gọi khi cutscene kết thúc hoặc người chơi bỏ qua. */
  onComplete: () => void
}

/** Tiêu đề tiếng Việt hiển thị ở panel fallback theo từng cutscene. */
const FALLBACK_TITLES: Record<CutsceneId, string> = {
  'big-harvest': 'Thu hoạch bội thu!',
  'level-up': 'Lên cấp!',
  'season-change': 'Đổi mùa!',
}

/**
 * Hiển thị overlay cutscene toàn màn hình.
 * - `id == null` → không render (trả về null).
 * - `id != null` → overlay video; nếu video lỗi thì chuyển sang panel CSS.
 */
export default function CutscenePlayer({ id, onComplete }: CutscenePlayerProps) {
  // Cờ đánh dấu video đã lỗi → chuyển sang panel fallback.
  const [failed, setFailed] = useState(false)

  // Reset trạng thái lỗi mỗi khi đổi cutscene.
  useEffect(() => {
    setFailed(false)
  }, [id])

  // Khi rơi vào fallback: tự động hoàn tất sau 1.8s.
  useEffect(() => {
    if (!failed) {
      return
    }
    const timer = setTimeout(onComplete, 1800)
    // Dọn dẹp timer khi unmount hoặc khi đổi cutscene/đổi trạng thái.
    return () => clearTimeout(timer)
  }, [failed, onComplete])

  // Không có cutscene nào để phát.
  if (id == null) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      {!failed ? (
        // Video cutscene; lỗi/thiếu file sẽ kích hoạt fallback (không crash).
        <video
          src={`/games/english-farm/cutscenes/${id}.mp4`}
          autoPlay
          muted
          playsInline
          className="max-h-[80vh] max-w-[90vw] rounded-2xl"
          onEnded={onComplete}
          onError={() => setFailed(true)}
        />
      ) : (
        // Panel CSS vui thay thế khi không phát được video.
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br from-amber-300 to-pink-300 px-12 py-10 text-center shadow-2xl">
          <span className="text-6xl">🎉</span>
          <h2 className="text-3xl font-bold text-amber-900">
            {FALLBACK_TITLES[id]}
          </h2>
        </div>
      )}

      {/* Nút bỏ qua cutscene ở góc trên phải. */}
      <button
        type="button"
        onClick={onComplete}
        className="absolute right-4 top-4 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow hover:bg-white"
      >
        Bỏ qua →
      </button>
    </div>
  )
}
