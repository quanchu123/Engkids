// Bộ kích hoạt cutscene thuần cho English Farm.
//
// Pure TypeScript only — KHÔNG import Phaser, KHÔNG import React. Module này chỉ
// quyết định cột mốc nào (nếu có) nên phát cutscene dựa trên một sự kiện gameplay.

import type { CropTheme } from '../../types'
import { BIG_HARVEST_THRESHOLD } from '../../constants'

/** Định danh các cutscene khả dụng trong game. */
export type CutsceneId = 'big-harvest' | 'level-up' | 'season-change'

/**
 * Dữ liệu một sự kiện gameplay có thể kích hoạt cutscene.
 * Gói lại các thay đổi vừa xảy ra (cấp độ, số nông sản thu hoạch, đổi mùa)
 * để `resolveCutscene` đánh giá theo thứ tự ưu tiên.
 */
export interface CutsceneEvent {
  /** Cấp người chơi trước sự kiện. */
  prevLevel: number
  /** Cấp người chơi sau sự kiện. */
  nextLevel: number
  /** Số nông sản thu hoạch trong sự kiện. */
  harvestQty: number
  /** Mùa/chủ đề trước sự kiện (nếu có). */
  prevTheme?: CropTheme
  /** Mùa/chủ đề sau sự kiện (nếu có). */
  nextTheme?: CropTheme
}

/**
 * Chọn cutscene cần phát cho một sự kiện theo thứ tự ưu tiên:
 * 1) Lên cấp (`nextLevel > prevLevel`) → `'level-up'`
 * 2) Đổi mùa (`nextTheme` tồn tại và khác `prevTheme`) → `'season-change'`
 * 3) Thu hoạch lớn (`harvestQty >= BIG_HARVEST_THRESHOLD`) → `'big-harvest'`
 * 4) Không đạt cột mốc nào → `null`
 *
 * @param e Sự kiện gameplay vừa xảy ra.
 * @returns Định danh cutscene cần phát, hoặc `null` nếu không có cột mốc.
 */
export function resolveCutscene(e: CutsceneEvent): CutsceneId | null {
  if (e.nextLevel > e.prevLevel) {
    return 'level-up'
  }
  if (e.nextTheme !== undefined && e.nextTheme !== e.prevTheme) {
    return 'season-change'
  }
  if (e.harvestQty >= BIG_HARVEST_THRESHOLD) {
    return 'big-harvest'
  }
  return null
}
