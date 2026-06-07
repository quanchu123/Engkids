// Core data types for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports. These types describe the
// single source of truth (`FarmState`) that all game systems read/write, and
// that the save layer serializes directly to JSON.

/** Growth stage of a crop: 0 = freshly seeded ... 3 = mature/harvestable. */
export type GrowthStage = 0 | 1 | 2 | 3

/** Lifecycle state of a single plot on the farm grid. */
export type PlotState = 'empty' | 'tilled' | 'planted'

/** Vocabulary difficulty level (mirrors the platform's GameDifficulty). */
export type VocabLevel = 'beginner' | 'intermediate' | 'advanced'

/** Mùa/chủ đề của cây — dùng để gom nhóm và trigger cutscene đổi mùa. */
export type CropTheme = 'spring' | 'summer' | 'autumn' | 'winter'

/** Điều kiện mở khóa một loại cây (mọi field optional = luôn mở). */
export interface UnlockCondition {
  /** Cấp người chơi tối thiểu để mở khóa. */
  minLevel?: number
  /** Số xu tối thiểu để mua mở khóa (nếu cần). */
  minCoins?: number
}

/** Static definition of a crop type, bridging gameplay and vocabulary. */
export interface CropType {
  /** Stable id, e.g. 'carrot'. */
  id: string
  /** English vocabulary word, e.g. 'Carrot'. */
  en: string
  /** Vietnamese meaning, e.g. 'Cà rốt'. */
  vi: string
  level: VocabLevel
  /** Number of "days" required to reach maturity. */
  growthDays: number
  /** Sell value (used by a later shop round; MVP only stores it). */
  sellValue: number
  /** Asset key for the seed sprite. */
  seedKey: string
  /** Asset key for the crop sprite (per growth stage). */
  spriteKey: string
  /** Giá mua 1 hạt ở shop (>= 0). */
  seedCost?: number
  /** Điều kiện mở khóa; vắng mặt = mở sẵn từ đầu. */
  unlock?: UnlockCondition
  /** Mùa/chủ đề để gom nhóm + trigger cutscene đổi mùa. */
  theme?: CropTheme
}

/** A growing crop instance placed on a plot. */
export interface Crop {
  cropTypeId: string
  stage: GrowthStage
  wateredToday: boolean
}

/** A single tile on the farm grid. */
export interface Plot {
  /** Index of the plot on the grid. */
  id: number
  state: PlotState
  crop: Crop | null
}

/** An inventory entry (seeds or harvested crops), aggregated by itemId. */
export interface InventoryItem {
  /** Composite id, e.g. 'seed:carrot' | 'crop:carrot'. */
  itemId: string
  kind: 'seed' | 'crop'
  /** References the related CropType.id. */
  refId: string
  qty: number
}

/** A vocabulary word the player has collected through gameplay. */
export interface CollectedWord {
  en: string
  vi: string
  level: VocabLevel
  timesSeen: number
  /** Mastery score, clamped to 0..5. */
  mastery: number
  /** ISO timestamp of first collection. */
  firstCollectedAt: string
  /** Số lần người chơi trả lời đúng từ này (lịch ôn cục bộ). */
  timesCorrect: number
  /** Ngày game (FarmState.day) cho lần ôn kế tiếp. */
  nextReviewDay: number
}

/** Dạng quiz: theo nghĩa, nghe phát âm, hoặc đánh vần. */
export type QuizMode = 'meaning' | 'listen' | 'spelling'

/** Mục tiêu của nhiệm vụ ngày. */
export type QuestGoal = 'harvest' | 'review' | 'sell'

/** Nhiệm vụ ngày — reset theo ngày game, thưởng xu khi hoàn thành. */
export interface DailyQuest {
  /** Loại mục tiêu cần đạt. */
  goal: QuestGoal
  /** Số lượng cần đạt (ví dụ thu hoạch 3 cây). */
  target: number
  /** Tiến độ hiện tại, clamp tại target. */
  progress: number
  /** Số xu thưởng khi hoàn thành. */
  rewardCoins: number
  /** Đã nhận thưởng hay chưa. */
  claimed: boolean
  /** Ngày game khi quest được phát (để reset theo ngày). */
  issuedDay: number
}

/** Single source of truth for the whole game — plain JSON, serializable. */
export interface FarmState {
  version: number
  day: number
  coins: number
  xp: number
  level: number
  grid: { cols: number; rows: number; plots: Plot[] }
  inventory: { slotLimit: number; items: InventoryItem[] }
  collectedWords: CollectedWord[]
  /** Danh sách id loại cây đã mở khóa. */
  unlockedCropIds: string[]
  /** Nhiệm vụ ngày hiện tại. */
  dailyQuest: DailyQuest
  /** ISO timestamp of the last update. */
  updatedAt: string
}

/** Result returned by farming/inventory operations instead of throwing. */
export type Result = { ok: boolean; reason?: string; state: FarmState }

/** Harvest result; includes the word to collect when a crop is harvested. */
export type HarvestResult = Result & {
  word?: { en: string; vi: string; level: VocabLevel }
}
