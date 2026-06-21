import type { DailyQuest, QuestGoal } from '../types'

/**
 * Hệ thống nhiệm vụ ngày (Daily Quest) — logic thuần, không phụ thuộc Phaser/React.
 *
 * Mỗi ngày game phát một nhiệm vụ duy nhất, xác định (deterministic) theo
 * "seed = day" để cùng một `day` luôn cho ra cùng một nhiệm vụ (không dùng
 * `Math.random`). Người chơi tích lũy tiến độ qua các sự kiện (thu hoạch / ôn từ /
 * bán nông sản) và nhận thưởng xu một lần khi đạt mục tiêu.
 */

/** Thứ tự mục tiêu nhiệm vụ ánh xạ theo `day % 3`. */
const QUEST_GOALS: readonly QuestGoal[] = ['harvest', 'review', 'sell']

/**
 * Phát nhiệm vụ ngày mới cho `day`, xác định hoàn toàn theo seed = `day`.
 *
 * Cùng một `day` luôn trả về cùng một nhiệm vụ (không dùng `Math.random`).
 * - `goal`   = QUEST_GOALS[day % 3] (0→'harvest', 1→'review', 2→'sell').
 * - `target` = 3 + (day % 3).
 * - `rewardCoins` = target * 5.
 * - `progress` = 0, `claimed` = false, `issuedDay` = day.
 *
 * @param day Ngày game hiện tại (số nguyên không âm theo quy ước game).
 * @returns Nhiệm vụ ngày mới tương ứng với `day`.
 */
export function rollDailyQuest(day: number): DailyQuest {
  const index = ((day % 3) + 3) % 3
  const goal = QUEST_GOALS[index]
  const target = 3 + index
  return {
    goal,
    target,
    progress: 0,
    rewardCoins: target * 5,
    claimed: false,
    issuedDay: day,
  }
}

/**
 * Tăng tiến độ nhiệm vụ theo một sự kiện, không bao giờ thay đổi (mutate) `q`.
 *
 * - Nếu `goal` trùng với `q.goal`: `progress` mới = min(`q.progress` + `amount`, `q.target`).
 * - Nếu `goal` khác: giữ nguyên tiến độ.
 *
 * Luôn trả về một object MỚI để giữ tính bất biến của state.
 *
 * @param q      Nhiệm vụ hiện tại.
 * @param goal   Loại sự kiện vừa xảy ra.
 * @param amount Số lượng đóng góp vào tiến độ.
 * @returns Bản sao MỚI của nhiệm vụ với tiến độ đã cập nhật.
 */
export function trackQuest(q: DailyQuest, goal: QuestGoal, amount: number): DailyQuest {
  if (goal !== q.goal) {
    return { ...q }
  }
  const progress = Math.min(q.progress + amount, q.target)
  return { ...q, progress }
}

/**
 * Nhận thưởng nhiệm vụ khi đã đạt mục tiêu và chưa nhận thưởng.
 *
 * - Nếu `progress >= target` và `!claimed`: trả về nhiệm vụ với `claimed = true`
 *   kèm `rewardCoins` = `q.rewardCoins` (số xu cộng thêm).
 * - Ngược lại: giữ nguyên nhiệm vụ và `rewardCoins = 0` (không thưởng lần hai).
 *
 * Không mutate `q`.
 *
 * @param q Nhiệm vụ cần nhận thưởng.
 * @returns Object gồm `quest` (trạng thái mới) và `rewardCoins` (xu cộng thêm).
 */
export function claimQuest(q: DailyQuest): { quest: DailyQuest; rewardCoins: number } {
  if (q.progress >= q.target && !q.claimed) {
    return { quest: { ...q, claimed: true }, rewardCoins: q.rewardCoins }
  }
  return { quest: q, rewardCoins: 0 }
}
