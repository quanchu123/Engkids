# Design Document — English Farming Game (MVP)

## Overview

Game nông trại học tiếng Anh, xây mới bằng **Phaser 3**, nhúng vào Engkids theo đúng pattern các game hiện có (`src/app/games/{game}/page.tsx` + dynamic import Phaser + assets `public/games/{game}/`). Không sao chép code/art của bất kỳ game thương mại nào.

**Phạm vi tài liệu này = MVP:** Farming + Harvesting + Inventory + Vocabulary collection + Quiz + Save/Load. Các hệ thống Animal/Shop/Quest/Daily/SRS/Pronunciation/AI được thiết kế "chừa chỗ" (extension points) nhưng **không** hiện thực ở vòng này.

### Nguyên tắc thiết kế
- **Tái dùng, không viết lại:** dùng `@/lib/word-bank` cho từ vựng, `/api/games/word-bank` cho nguồn dữ liệu, pattern Phaser của `rpg-world` cho vòng đời game, `vocabulary_items`/`user_progress` cho lưu học liệu.
- **Tách hệ thống rõ ràng:** mỗi "system" (farming, inventory, vocabulary, quiz, save) là một module thuần TypeScript, không phụ thuộc Phaser, dễ test. Phaser scene chỉ điều phối.
- **React ↔ Phaser bridge:** Phaser lo world/render; React lo overlay UI (HUD, inventory panel, quiz modal) — đúng như `rpg-world` đã làm (callback ref bridge).
- **Determinism cho phần học:** logic XP, quiz validation, vocab dedupe là hàm thuần → unit-test được (R14.4).

### Goals (MVP)
1. Vòng lặp nông trại chạy được: cày → gieo → tưới → (thời gian/ngày) → thu hoạch.
2. Mỗi loại cây gắn 1 từ vựng; thu hoạch → thu thập từ + kích hoạch quiz ngắn.
3. Inventory hiển thị sản phẩm + hạt giống, có giới hạn slot.
4. Lưu/khôi phục toàn bộ trạng thái (Supabase nếu đăng nhập, localStorage nếu ẩn danh).
5. Build/type-check/lint sạch; không phá vỡ phần còn lại của app.

### Non-Goals (MVP)
- Mua/bán cửa hàng, động vật, nhiệm vụ chuỗi, achievement đầy đủ, streak/daily, SRS, phát âm/nghe, AI Gemini.
- Multiplayer, 3D.

---

## Architecture

High-Level Design — cách game ghép vào Engkids và phân tầng nội bộ.

### 1. Vị trí trong nền tảng

```
Engkids (Next.js 14 App Router)
└── src/app/games/
    ├── page.tsx                         # hub game — THÊM 1 thẻ "English Farm"
    └── english-farm/
        └── page.tsx                     # React page: dynamic-import Phaser, render overlay UI
src/game/farm/                            # MỚI — logic game thuần TS (không import Phaser)
    ├── systems/
    │   ├── farmingSystem.ts             # plot/crop state machine
    │   ├── inventorySystem.ts           # add/remove/slot-limit
    │   ├── vocabularySystem.ts          # collect/dedupe/level, dùng word-bank
    │   ├── quizSystem.ts                # tạo & chấm quiz từ word-bank
    │   └── progressionSystem.ts         # XP/level tối thiểu cho quiz reward
    ├── save/
    │   └── farmSave.ts                  # serialize/deserialize + load/save (Supabase/local)
    ├── data/
    │   └── crops.ts                     # định nghĩa loại cây ↔ từ vựng ↔ asset
    ├── types.ts                         # FarmState, Plot, Crop, InventoryItem, ...
    └── constants.ts                     # GROWTH_DAYS, SLOT_LIMIT, XP_PER_*, ...
src/components/games/farm/                # MỚI — React overlay components
    ├── FarmHud.tsx
    ├── InventoryPanel.tsx
    ├── QuizModal.tsx
    └── VocabCollectionPanel.tsx
public/games/english-farm/                # MỚI — assets (CC0 placeholder: Kenney)
    ├── tiles/  sprites/  ui/  audio/
src/app/api/games/farm/save/route.ts      # MỚI — GET/PUT farm save (server, Supabase)
supabase/migrations/0XX_farm_saves.sql    # MỚI — bảng farm_saves
```

### 2. Phân tầng nội bộ

```
┌──────────────────────────────────────────────────────────┐
│ React Page (english-farm/page.tsx)                         │
│  - dynamic import('phaser'), tạo/destroy game              │
│  - giữ React state cho overlay (hud, inventory, quiz)      │
│  - bridge: cbRef (Phaser→React) + lệnh (React→Phaser)      │
└───────────────┬──────────────────────────────┬────────────┘
                │ render                          │ điều khiển
                ▼                                  ▼
┌────────────────────────────┐      ┌───────────────────────────┐
│ React Overlay UI            │      │ Phaser Scenes              │
│  FarmHud / InventoryPanel   │      │  Boot → Preload → Farm     │
│  QuizModal / VocabPanel     │      │  (render lưới đất, player, │
│                             │      │   input cày/gieo/tưới)     │
└───────────────┬─────────────┘      └───────────┬───────────────┘
                │ gọi                              │ gọi
                ▼                                  ▼
┌──────────────────────────────────────────────────────────┐
│ Game Systems (pure TS, src/game/farm/systems)              │
│  farming · inventory · vocabulary · quiz · progression     │
│  → thao tác trên 1 đối tượng FarmState (single source)     │
└───────────────┬──────────────────────────────┬────────────┘
                │ đọc từ vựng                     │ lưu/nạp
                ▼                                  ▼
┌────────────────────────────┐      ┌───────────────────────────┐
│ word-bank (reuse)           │      │ farmSave (save layer)      │
│  loadWordBank()/getWordBank │      │  Supabase farm_saves       │
│                             │      │  + localStorage fallback   │
└────────────────────────────┘      └───────────────────────────┘
```

### 3. State: single source of truth

Toàn bộ trạng thái nằm trong một object `FarmState` (plain JSON, serialize được). Phaser và React **không** giữ bản sao logic riêng — chúng đọc/ghi `FarmState` qua systems. Điều này làm save/load đơn giản (chỉ serialize `FarmState`) và tránh lệch trạng thái giữa render và logic.

### 4. Vòng đời thời gian (time/day model — MVP đơn giản)

MVP dùng mô hình "ngày" tối giản: một "ngày" trôi qua khi người chơi bấm nút **Ngủ/Next Day** (không cần đồng hồ thời gian thực). Khi sang ngày: mỗi crop đã-tưới-trong-ngày tăng 1 growth stage và cờ "đã tưới" reset. Cách này dễ hiểu cho trẻ em, dễ test, và né được vòng lặp thời gian phức tạp.

### 5. Tích hợp hub & route (R13)
- Thêm 1 entry vào mảng `GAMES` trong `src/app/games/page.tsx` (id `english-farm`, href `/games/english-farm`).
- Page mới theo đúng khung `rpg-world`: `containerRef`, `import('phaser')`, cleanup `destroy(true)` khi unmount.

---

## Components and Interfaces

Low-Level Design — kiểu dữ liệu, chữ ký hàm, và hành vi từng system.

### 1. Core types (`src/game/farm/types.ts`)

```ts
export type GrowthStage = 0 | 1 | 2 | 3;            // 0=seed ... 3=mature
export type PlotState = 'empty' | 'tilled' | 'planted';
export type VocabLevel = 'beginner' | 'intermediate' | 'advanced'; // = GameDifficulty

export interface CropType {
  id: string;            // 'carrot'
  en: string;            // 'Carrot'  (vocabulary word)
  vi: string;            // 'Cà rốt'
  level: VocabLevel;
  growthDays: number;    // số "ngày" để chín
  sellValue: number;     // dùng ở vòng shop sau; MVP chỉ lưu
  seedKey: string;       // asset hạt
  spriteKey: string;     // asset cây theo stage
}

export interface Crop {
  cropTypeId: string;
  stage: GrowthStage;
  wateredToday: boolean;
}

export interface Plot {
  id: number;            // index trên lưới
  state: PlotState;
  crop: Crop | null;
}

export interface InventoryItem {
  itemId: string;        // 'seed:carrot' | 'crop:carrot'
  kind: 'seed' | 'crop';
  refId: string;         // cropTypeId
  qty: number;
}

export interface CollectedWord {
  en: string;
  vi: string;
  level: VocabLevel;
  timesSeen: number;
  mastery: number;       // 0..5
  firstCollectedAt: string;
}

export interface FarmState {
  version: number;
  day: number;
  coins: number;
  xp: number;
  level: number;
  grid: { cols: number; rows: number; plots: Plot[] };
  inventory: { slotLimit: number; items: InventoryItem[] };
  collectedWords: CollectedWord[];
  updatedAt: string;
}
```

### 2. Farming system (`systems/farmingSystem.ts`) — R1

Các hàm thuần, nhận `FarmState` (hoặc `Plot`) trả về state mới (immutable-ish) hoặc mutate có kiểm soát:

```ts
till(state, plotId): Result            // empty -> tilled
plant(state, plotId, cropTypeId): Result // tilled -> planted (stage 0), trừ 1 seed khỏi inventory
water(state, plotId): Result           // planted & !wateredToday -> wateredToday=true
advanceDay(state): FarmState           // day++, mỗi crop wateredToday => stage = min(stage+1, growthDays?mature), reset wateredToday
harvest(state, plotId): HarvestResult  // planted & stage mature -> +crop vào inventory, plot=empty, trả về word để collect
canPlant(plot): boolean
isMature(crop, cropType): boolean
```

`Result = { ok: boolean; reason?: string; state: FarmState }`.
`HarvestResult = Result & { word?: { en; vi; level } }` để page biết kích hoạt collect + quiz.

Quy tắc khớp acceptance: AC1 (till), AC2 (plant gắn từ qua `cropType.en/vi`), AC3 (không tưới → `advanceDay` không tăng stage), AC4 (harvest → inventory + collect word), AC5 (`canPlant` chặn gieo đè), AC6 (state thay đổi → save layer).

### 3. Inventory system (`systems/inventorySystem.ts`) — R3 (phần inventory)

```ts
addItem(inv, item: {kind, refId, qty}): { ok: boolean; reason?: string; inv: Inventory }
removeItem(inv, itemId, qty): { ok; reason?; inv }
getItem(inv, itemId): InventoryItem | undefined
isFull(inv): boolean                    // số slot dùng >= slotLimit
```
- Cộng dồn qty nếu item cùng `itemId` đã tồn tại (không tốn slot mới).
- AC5: khi đầy slot và item mới (chưa có slot) → từ chối, trả `reason`.

### 4. Vocabulary system (`systems/vocabularySystem.ts`) — R5

```ts
collectWord(words: CollectedWord[], w: {en;vi;level}): CollectedWord[]  // dedupe theo en (case-insensitive); nếu có → timesSeen++; nếu chưa → thêm mới
bumpMastery(words, en, delta): CollectedWord[]                          // clamp 0..5
levelOfWord(en, bank): VocabLevel                                       // suy ra level (MVP: map theo độ dài/whitelist; mặc định 'beginner')
```
- Nguồn từ: `crops.ts` map cây → cặp Anh-Việt; bổ sung từ word-bank để phong phú (R5.5).
- AC4: không tạo trùng; cập nhật timesSeen/mastery.

### 5. Quiz system (`systems/quizSystem.ts`) — R6

Tái dùng `buildDistractors`/cấu trúc từ `@/lib/word-bank`:

```ts
interface FarmQuiz { vi: string; en: string; choices: string[]; }
buildQuizForWord(bank: WordPair[], answer: {en;vi}): FarmQuiz   // 1 đúng + 3 distractor, shuffle
gradeQuiz(quiz, choice): { correct: boolean; correctAnswer: string }
```
- AC1: page gọi `buildQuizForWord` sau harvest "từ mới".
- AC2: dạng multiple-choice (tái dùng shape `{vi,en,choices}` giống rpg-world).
- AC3/AC4: page cộng XP khi đúng, hiện đáp án + giải thích nhẹ khi sai.
- AC5: nếu bank rỗng → fallback `DEFAULT_WORD_BANK` (đã có sẵn trong loadWordBank).

### 6. Progression (tối thiểu) (`systems/progressionSystem.ts`)

```ts
addXp(state, amount): { state: FarmState; leveledUp: boolean }
xpForLevel(level): number      // ngưỡng tăng dần
```
MVP chỉ phục vụ "quiz đúng → +XP", hiển thị trên HUD. Level/achievement đầy đủ để vòng sau (extension point).

### 7. Save layer (`save/farmSave.ts`) — R11

```ts
const STORAGE_KEY = (deviceId: string) => `engkids:farm:${deviceId}`;
const SCHEMA_VERSION = 1;

createInitialFarmState(): FarmState                 // grid mặc định, inventory hạt giống khởi đầu
serializeFarm(state): string                         // JSON
deserializeFarm(raw): FarmState                      // validate version; nếu hỏng -> createInitialFarmState (AC4)
async loadFarm(): Promise<FarmState>                 // đăng nhập → GET /api/games/farm/save; ẩn danh → localStorage
async saveFarm(state): Promise<void>                 // debounce/non-blocking (AC5); đăng nhập → PUT; ẩn danh → localStorage
```
- AC2: đăng nhập (Supabase user) lưu server; ẩn danh lưu local theo `device_id` (tái dùng cách `useAppStore`/auth-client xác định user/device đang có).
- AC5: save gọi debounce (~1.5s) và `requestIdleCallback`/setTimeout, không chặn vòng lặp game.

### 8. API route (`src/app/api/games/farm/save/route.ts`) — R11/R13

- `GET`: xác thực user (tái dùng helper auth hiện có), trả `farm_saves.payload` của user (hoặc null).
- `PUT`: validate kích thước payload, upsert vào `farm_saves`.
- Theo mẫu các route trong `src/app/api/games/*` hiện có (Supabase admin/anon, `NextResponse`).

### 9. Data model — bảng mới `farm_saves` (Supabase)

```sql
CREATE TABLE IF NOT EXISTS farm_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id TEXT,                         -- cho trường hợp chưa đăng nhập (đồng bộ sau)
  payload JSONB NOT NULL,                 -- toàn bộ FarmState
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_profile_id)
);
ALTER TABLE farm_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read"  ON farm_saves FOR SELECT USING (true);
CREATE POLICY "service write" ON farm_saves FOR ALL USING (auth.role() = 'service_role');
```
Phần học (từ đã thu thập, XP học) vẫn có thể đồng bộ sang `vocabulary_items`/`user_progress` ở vòng sau; MVP lưu gọn trong `FarmState.collectedWords` để không phình scope.

### 10. React ↔ Phaser bridge (`english-farm/page.tsx`)

Theo mẫu `rpg-world`:
- `cbRef` chứa callback Phaser gọi vào React: `onHarvest(word)`, `onStateChange(state)`, `onInventoryFull()`.
- React giữ `farmStateRef` (nguồn sự thật) + state hiển thị; các nút overlay (Ngủ/Next Day, mở Inventory, chọn công cụ) gọi systems rồi `setState`.
- Quiz: khi `onHarvest` báo "từ mới" → mở `QuizModal`; chấm xong → `addXp` + `bumpMastery` + đóng modal.
- Cleanup: `destroy(true)` khi unmount (AC R13.3).

### 11. Overlay UI components (R12 cơ bản)
- `FarmHud`: coins, XP/level, ngày, công cụ đang chọn — phong cách Engkids (bo góc lớn, màu tươi).
- `InventoryPanel`: lưới slot, icon + tên tiếng Anh + qty.
- `QuizModal`: câu hỏi vi→en, 4 lựa chọn, feedback đúng/sai + giải thích nhẹ.
- `VocabCollectionPanel`: danh sách từ đã thu thập + nghĩa, mastery.
- Dùng Tailwind, responsive; reuse `DecorIcon`/style tokens nơi phù hợp.

---

## Data Models

Tóm tắt mô hình dữ liệu (chi tiết types ở mục Components):

- **FarmState (JSON):** nguồn sự thật duy nhất — `day, coins, xp, level, grid(plots[]), inventory(items[], slotLimit), collectedWords[]`. Serialize trực tiếp để lưu.
- **CropType (tĩnh, `data/crops.ts`):** map loại cây ↔ từ vựng (en/vi/level) ↔ asset ↔ growthDays/sellValue. Đây là cầu nối "gameplay ↔ học".
- **WordPair (reuse `@/lib/word-bank`):** nguồn từ vựng dùng chung; dùng để sinh distractor quiz và làm giàu vocab.
- **farm_saves (Supabase, mới):** một dòng/people, `payload JSONB = FarmState`, `schema_version`, khóa theo `user_profile_id` (hoặc `device_id`).
- **Tái dùng (không đổi schema):** `vocabulary_items`, `user_progress` — để đồng bộ học liệu ở vòng sau, MVP chưa ghi vào để giữ scope nhỏ.

---

## Correctness Properties

### Property 1: Vòng đời plot hợp lệ
Một plot chỉ chuyển trạng thái theo đúng máy trạng thái `empty → tilled → planted → (harvest) → empty`. Không thể gieo lên plot chưa cày hoặc đang có cây.

**Validates: Requirements 1.1, 1.2, 1.5**

### Property 2: Sinh trưởng phụ thuộc tưới nước
Sau `advanceDay`, một crop tăng đúng 1 stage **chỉ khi** `wateredToday === true`; nếu không, stage giữ nguyên. Stage không bao giờ vượt mức mature của cropType.

**Validates: Requirements 1.3**

### Property 3: Thu hoạch bảo toàn vật phẩm + từ vựng
Harvest một crop chín làm: inventory tăng đúng 1 sản phẩm tương ứng (nếu còn slot), plot về `empty`, và trả về đúng cặp từ (en/vi) của cropType để thu thập.

**Validates: Requirements 1.4, 5.1**

### Property 4: Bất biến inventory & giới hạn slot
Tổng vật phẩm không âm; item cùng `itemId` luôn cộng dồn (không tạo slot trùng); khi số slot đã đạt `slotLimit`, item mới (chưa có slot) bị từ chối và state không đổi.

**Validates: Requirements 3.1, 3.5**

### Property 5: Bộ sưu tập từ không trùng
`collectWord` không bao giờ tạo hai mục cùng `en` (case-insensitive); lần gặp lại chỉ tăng `timesSeen`/cập nhật mastery. `mastery` luôn nằm trong [0,5].

**Validates: Requirements 5.1, 5.4**

### Property 6: Quiz luôn hợp lệ & chấm đúng
Quiz sinh ra luôn có đáp án đúng nằm trong `choices`, đủ số lựa chọn, không trùng lựa chọn; `gradeQuiz` trả `correct=true` khi và chỉ khi choice == đáp án. Khi bank rỗng vẫn sinh được quiz từ default (không rỗng).

**Validates: Requirements 6.2, 6.5**

### Property 7: Save/Load khứ hồi (round-trip) an toàn
`deserializeFarm(serializeFarm(s))` cho trạng thái tương đương `s`; dữ liệu hỏng/khác version → trả về trạng thái khởi tạo hợp lệ, không ném lỗi.

**Validates: Requirements 11.3, 11.4**

### Property 8: Không phá vỡ nền tảng
Sau khi thêm game, `npm run build`, `npm run type-check`, `npm run lint` vẫn pass; Phaser được dynamic-import và `destroy` khi unmount (không leak).

**Validates: Requirements 13.3, 13.5**

---

## Error Handling

- **Save lỗi/ngoại tuyến:** `saveFarm` bọc try/catch; lỗi server → fallback ghi localStorage, không chặn chơi (R11.5). `loadFarm` lỗi → `createInitialFarmState` (R11.4).
- **Dữ liệu hỏng:** `deserializeFarm` validate `version`/shape; sai → state mặc định, log cảnh báo, không crash.
- **Bank/quiz rỗng:** `loadWordBank` đã fallback `DEFAULT_WORD_BANK`; `buildQuizForWord` đảm bảo đủ distractor (lấy từ default nếu thiếu).
- **Thao tác không hợp lệ:** systems trả `{ ok:false, reason }` thay vì ném lỗi; UI hiện thông báo thân thiện (vd "Ô đất chưa cày", "Kho đã đầy").
- **Phaser load lỗi:** nếu `import('phaser')` thất bại, page hiển thị fallback "Không tải được game, thử lại" thay vì màn trắng.
- **Asset thiếu:** Preload có handler `loaderror` → dùng texture placeholder, game vẫn chạy.

---

## Testing Strategy

- **Unit test (Vitest — đã có trong devDeps qua Playwright? nếu chưa, dùng test runner nhẹ phù hợp):** cho các pure systems — `farmingSystem` (state machine, advanceDay), `inventorySystem` (slot limit, cộng dồn), `vocabularySystem` (dedupe, clamp), `quizSystem` (validity, grade), `farmSave` (round-trip, corrupt input). Đây là nơi property-based testing áp dụng tốt (Properties 1-7).
- **Build/type/lint:** `npm run type-check`, `npm run lint`, `npm run build` phải sạch sau mỗi bước (R15.2).
- **Smoke test thủ công (`npm run dev`):** vào `/games/english-farm` → cày/gieo/tưới/next-day/harvest → quiz → mở inventory/vocab → reload (kiểm tra save/load). Kiểm tra cleanup khi rời trang (không leak canvas).
- **Regression:** hub `/games` vẫn liệt kê đúng; các game khác không bị ảnh hưởng.
- Ghi chú: kiểm thử property-based dùng cho phần logic thuần; phần render Phaser chủ yếu smoke-test thủ công.

---

## Extension Points (cho các vòng sau, không làm ở MVP)

- **Animal/Shop/Quest:** thêm system mới (`animalSystem`, `shopSystem`, `questSystem`) thao tác trên `FarmState` mở rộng (thêm field, giữ version để migrate).
- **Daily/Streak:** đồng bộ với `user_progress.current_streak` + `dailyQuestState` đã có.
- **SRS:** ghi `collectedWords` sang `vocabulary_items` (đã có `ease_factor/interval_days/next_review_date`), tái dùng trang Progress/Review.
- **Pronunciation/Listening:** Web Speech API + nút loa trên `VocabCollectionPanel`/`QuizModal`.
- **AI Gemini:** API route `/api/games/farm/ai` sinh vocab/quiz động + difficulty scaling, fallback word-bank, rate-limit bằng `src/lib/rate-limit.ts`.

---

## Open Questions

1. Test runner: dự án hiện chỉ có Playwright (E2E). Cho phép mình thêm **Vitest** (devDependency) để unit-test các pure systems không? (khuyên có, vì R14.4 yêu cầu test logic)
2. Số lượng loại cây MVP: đề xuất 6 loại (gắn 6 từ beginner). OK chứ?
3. Lưới nông trại MVP: đề xuất 6×4 = 24 plot. OK chứ?
