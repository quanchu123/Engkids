# Implementation Plan — English Farming Game (MVP)

## Overview

Xây game nông trại học tiếng Anh bằng Phaser 3, nhúng vào Engkids theo pattern game hiện có. Thứ tự: hạ tầng test + types/constants trước (task 1), rồi từng pure system có unit-test (farming, inventory, vocabulary, quiz, progression — task 2-6), save/load round-trip (task 7), API route + migration (task 8), data cây trồng + icon (task 9), React overlay UI (task 10), Phaser scene + bridge (task 11), trang game + dynamic import (task 12), gắn vào hub (task 13), nghiệm thu build/type/lint (task 14). Mỗi pure system là module thuần TS, test được; Phaser scene chỉ điều phối.

## Tasks

- [x] 1. Hạ tầng test + types + constants nền tảng
  - Thêm Vitest (devDependency) + script `test`/`test:run` trong package.json; cấu hình tối thiểu (vitest.config) trỏ `src/`.
  - Tạo `src/game/farm/types.ts` (FarmState, Plot, Crop, CropType, InventoryItem, CollectedWord, GrowthStage, PlotState, VocabLevel) đúng như design.
  - Tạo `src/game/farm/constants.ts` (GRID_COLS=6, GRID_ROWS=4, SLOT_LIMIT, XP_PER_CORRECT, XP_PER_HARVEST, GROWTH_STAGE_MAX...).
  - _Requirements: 14.1, 14.2, 15.1_

- [x] 2. Farming system (pure) + test
  - `src/game/farm/systems/farmingSystem.ts`: `till`, `plant`, `water`, `advanceDay`, `harvest`, `canPlant`, `isMature` theo chữ ký design; trả `Result`/`HarvestResult`, không ném lỗi.
  - State machine plot: empty→tilled→planted→(harvest)→empty; chặn gieo đè / gieo lên ô chưa cày.
  - `advanceDay`: chỉ tăng stage crop có `wateredToday`, reset cờ tưới, clamp ở mature.
  - Unit test (Vitest) phủ Property 1 (vòng đời plot), Property 2 (sinh trưởng phụ thuộc tưới), Property 3 (harvest bảo toàn item + trả từ).
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.4_

- [x] 3. Inventory system (pure) + test
  - `src/game/farm/systems/inventorySystem.ts`: `addItem`, `removeItem`, `getItem`, `isFull`.
  - Cộng dồn qty theo `itemId` (không tạo slot trùng); chặn item mới khi đầy slot, trả `reason`; qty không âm.
  - Unit test phủ Property 4 (bất biến inventory + giới hạn slot).
  - _Requirements: 3.1, 3.5, 14.4_

- [x] 4. Vocabulary system (pure) + test
  - `src/game/farm/systems/vocabularySystem.ts`: `collectWord` (dedupe theo en case-insensitive, timesSeen++), `bumpMastery` (clamp 0..5), `levelOfWord`.
  - Unit test phủ Property 5 (không trùng, mastery trong [0,5]).
  - _Requirements: 5.1, 5.4, 14.4_

- [x] 5. Quiz system (pure) + test
  - `src/game/farm/systems/quizSystem.ts`: `buildQuizForWord` (1 đúng + 3 distractor, shuffle, không trùng lựa chọn), `gradeQuiz`. Tái dùng `buildDistractors` từ `@/lib/word-bank`; bank rỗng → fallback DEFAULT_WORD_BANK.
  - Unit test phủ Property 6 (quiz hợp lệ, chấm đúng, không rỗng).
  - _Requirements: 6.2, 6.5, 14.4, 14.5_

- [x] 6. Progression system (tối thiểu) + test
  - `src/game/farm/systems/progressionSystem.ts`: `addXp` (trả `{state, leveledUp}`), `xpForLevel` (ngưỡng tăng dần).
  - Unit test: cộng XP, vượt ngưỡng → leveledUp, XP/level không âm.
  - _Requirements: 4.3 (tối thiểu), 6.3, 14.4_

- [x] 7. Save layer (pure phần serialize) + test
  - `src/game/farm/save/farmSave.ts`: `createInitialFarmState`, `serializeFarm`, `deserializeFarm` (validate version/shape; hỏng → initial), `loadFarm`/`saveFarm` (đăng nhập→API, ẩn danh→localStorage; debounce non-blocking).
  - Unit test phủ Property 7 (round-trip + corrupt input → initial, không ném lỗi).
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.4_

- [x] 8. API route + migration `farm_saves`
  - `supabase/migrations/0XX_farm_saves.sql`: bảng `farm_saves` (payload JSONB, schema_version, unique theo user_profile_id), RLS, **idempotent (IF NOT EXISTS), KHÔNG DROP TABLE**.
  - `src/app/api/games/farm/save/route.ts`: GET (đọc payload theo user) + PUT (validate size, upsert) theo mẫu route games hiện có.
  - _Requirements: 11.1, 11.2, 13.1_

- [x] 9. Data cây trồng ↔ từ vựng ↔ icon
  - `src/game/farm/data/crops.ts`: 6 loại cây (carrot/tomato/corn/pumpkin/strawberry/potato) map en/vi/level/growthDays/sellValue/iconKey, dùng icon đã tải ở `public/games/english-farm/icons/`.
  - Helper `farmIconSrc(key)` đọc `icons/manifest.json` (progressive: thiếu → trả null, UI fallback emoji), theo mẫu `src/config/admin-icons.ts`.
  - _Requirements: 5.2, 5.5, 13.2_

- [x] 10. React overlay UI components
  - `src/components/games/farm/FarmHud.tsx`, `InventoryPanel.tsx`, `QuizModal.tsx`, `VocabCollectionPanel.tsx` — Tailwind, phong cách Engkids, responsive, dùng icon farm (fallback emoji).
  - _Requirements: 3.1, 6.1, 6.4, 12.1, 12.2, 12.3_

- [x] 11. Phaser scene + React↔Phaser bridge
  - `src/game/farm/scene/FarmScene.ts` (hoặc inline trong page theo mẫu rpg-world): vẽ lưới plot, chọn công cụ, input cày/gieo/tưới/next-day/harvest; gọi systems thao tác trên `FarmState`; `loaderror` → placeholder.
  - Bridge: cbRef (Phaser→React) `onHarvest(word)`, `onStateChange`, `onInventoryFull`; lệnh React→Phaser cho nút công cụ.
  - _Requirements: 1.1-1.6, 12.3, 12.4, 13.3_

- [x] 12. Trang game `english-farm/page.tsx`
  - `src/app/games/english-farm/page.tsx`: dynamic `import('phaser')`, tạo/`destroy(true)` khi unmount; giữ `farmStateRef` + overlay state; nối QuizModal sau harvest "từ mới" → addXp + bumpMastery; gọi `loadFarm` lúc mount + `saveFarm` (debounce) khi state đổi.
  - Fallback khi Phaser load lỗi (không màn trắng).
  - _Requirements: 6.1, 6.3, 6.4, 11.3, 11.5, 12.1, 13.3_

- [x] 13. Gắn vào hub game
  - Thêm 1 entry vào mảng `GAMES` trong `src/app/games/page.tsx` (id `english-farm`, href `/games/english-farm`, icon phù hợp, badge NEW).
  - _Requirements: 13.1_

- [x] 14. Nghiệm thu & kiểm tra
  - `npm run test:run` (unit tests các system) pass; `npm run type-check`, `npm run lint`, `npm run build` sạch.
  - Smoke test thủ công `npm run dev`: vào `/games/english-farm` → cày/gieo/tưới/next-day/harvest → quiz → inventory/vocab → reload (save/load) → rời trang (cleanup, không leak).
  - _Requirements: 13.5, 15.2_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4", "5", "6", "7", "9"] },
    { "wave": 3, "tasks": ["8", "10"] },
    { "wave": 4, "tasks": ["11"] },
    { "wave": 5, "tasks": ["12"] },
    { "wave": 6, "tasks": ["13"] },
    { "wave": 7, "tasks": ["14"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["1"],
    "4": ["1"],
    "5": ["1"],
    "6": ["1"],
    "7": ["1", "2", "3", "4"],
    "8": ["1"],
    "9": ["1"],
    "10": ["1", "9"],
    "11": ["2", "3", "4", "5", "6", "9"],
    "12": ["7", "8", "10", "11"],
    "13": ["12"],
    "14": ["12", "13"]
  }
}
```

- Task 1 (test infra + types + constants) là gốc rễ.
- Task 2-6, 9 là pure systems/data — chạy song song sau task 1, mỗi cái kèm unit test.
- Task 7 (save) cần types + vài system để serialize đúng.
- Task 8 (API/migration), 10 (UI) phụ thuộc nền tảng.
- Task 11 (Phaser scene) cần các system + data; Task 12 (page) ráp tất cả; 13 (hub) → 14 (nghiệm thu).

## Notes

- **Icon:** đã tải 14 icon 3D từ Iconscout về `public/games/english-farm/icons/` (carrot, tomato, corn, pumpkin, strawberry, potato, seed, sprout, hoe, watering-can, coin, star, basket, soil). Đây là thumbnail preview (tài khoản chưa có subscription) — đủ cho MVP; thay icon chính chủ sau không phải sửa code (dùng manifest + fallback emoji).
- **Migration `farm_saves`:** idempotent, KHÔNG có DROP TABLE. Người dùng tự chạy trên Supabase SQL editor (giống 018). MVP có thể chơi ẩn danh bằng localStorage nếu chưa chạy migration.
- **Tái dùng tối đa:** `@/lib/word-bank` (từ vựng + distractor), pattern Phaser của `rpg-world`, `DecorIcon`/manifest cho icon, mẫu route `src/app/api/games/*`.
- **Không AI ở MVP:** chạy bằng word-bank tĩnh; Gemini để vòng sau.
- **Out of scope MVP:** animal, shop/mua-bán, quest/achievement đầy đủ, daily/streak, SRS, phát âm/nghe, AI.
- Đi từng bước, build/type/lint sạch trước khi sang task kế; commit có ý nghĩa.
```
