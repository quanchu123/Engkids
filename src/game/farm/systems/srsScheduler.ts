// SRS_Scheduler — lập lịch ôn giãn cách (spaced repetition) THUẦN cho game.
//
// Pure TypeScript only — KHÔNG import Phaser/React. Module này lập lịch ôn từ
// dựa trên "ngày game" (FarmState.day). Nhánh đồng bộ server (SM-2) là impure
// và nằm ở lớp page/save, không thuộc file này.

import type { CollectedWord } from '../types'
import { SRS_INTERVALS } from '../constants'

/** Giới hạn nhỏ nhất của mastery. */
const MASTERY_MIN = 0
/** Giới hạn lớn nhất của mastery (khớp index cao nhất của SRS_INTERVALS). */
const MASTERY_MAX = 5

/** Giới hạn `value` trong khoảng [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** So khớp hai từ tiếng Anh: bỏ qua hoa/thường và khoảng trắng đầu/cuối. */
function sameWord(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Chọn các từ đến hạn ôn, ưu tiên mastery thấp trước.
 *
 * - `due` = các từ có `nextReviewDay <= currentDay`.
 * - Nếu có từ đến hạn: sắp xếp theo [mastery tăng dần, rồi `nextReviewDay`
 *   tăng dần] và lấy tối đa `limit` từ.
 * - Nếu KHÔNG có từ nào đến hạn: tránh để phiên ôn rỗng bằng cách trả về các từ
 *   sắp đến hạn (sắp xếp `nextReviewDay` tăng dần) và lấy tối đa `limit` từ —
 *   nên kết quả không rỗng khi `words` không rỗng.
 *
 * Không mutate mảng đầu vào (sắp xếp trên bản sao).
 *
 * @param words Danh sách từ đã thu thập.
 * @param currentDay Ngày game hiện tại.
 * @param limit Số từ tối đa cho phiên ôn.
 * @returns Mảng MỚI các từ được chọn cho phiên ôn.
 */
export function pickDueWords(
  words: CollectedWord[],
  currentDay: number,
  limit: number,
): CollectedWord[] {
  const due = words.filter((w) => w.nextReviewDay <= currentDay)

  if (due.length === 0) {
    // Không có từ đến hạn → lấy từ sắp đến hạn (gần currentDay nhất).
    const upcoming = [...words].sort((a, b) => a.nextReviewDay - b.nextReviewDay)
    return upcoming.slice(0, limit)
  }

  const sorted = [...due].sort((a, b) => {
    if (a.mastery !== b.mastery) return a.mastery - b.mastery
    return a.nextReviewDay - b.nextReviewDay
  })
  return sorted.slice(0, limit)
}

/**
 * Cập nhật lịch ôn của 1 từ sau khi người chơi trả lời. Trả về mảng MỚI.
 *
 * Với từ khớp `en` (so khớp không phân biệt hoa/thường + trim):
 * - `timesSeen` tăng 1; `timesCorrect` tăng 1 nếu trả lời đúng.
 * - Trả lời ĐÚNG: `mastery' = clamp(mastery + 1, 0, 5)`, khoảng cách ôn dùng
 *   `SRS_INTERVALS[mastery']` (interval không giảm khi đúng).
 * - Trả lời SAI: `mastery' = clamp(mastery - 1, 0, 5)`, khoảng cách ôn reset về
 *   nhỏ nhất `SRS_INTERVALS[0]`.
 * - `nextReviewDay = currentDay + interval`.
 *
 * Không mutate đầu vào; các từ không khớp giữ nguyên tham chiếu.
 *
 * @param words Danh sách từ đã thu thập.
 * @param en Từ tiếng Anh vừa được ôn.
 * @param correct Người chơi trả lời đúng hay không.
 * @param currentDay Ngày game hiện tại.
 * @returns Mảng MỚI các từ sau khi cập nhật lịch ôn.
 */
export function reviewWord(
  words: CollectedWord[],
  en: string,
  correct: boolean,
  currentDay: number,
): CollectedWord[] {
  return words.map((w) => {
    if (!sameWord(w.en, en)) return w

    const timesSeen = w.timesSeen + 1
    const timesCorrect = w.timesCorrect + (correct ? 1 : 0)

    let mastery: number
    let interval: number
    if (correct) {
      mastery = clamp(w.mastery + 1, MASTERY_MIN, MASTERY_MAX)
      interval = SRS_INTERVALS[mastery]
    } else {
      mastery = clamp(w.mastery - 1, MASTERY_MIN, MASTERY_MAX)
      interval = SRS_INTERVALS[0]
    }

    return {
      ...w,
      timesSeen,
      timesCorrect,
      mastery,
      nextReviewDay: currentDay + interval,
    }
  })
}
