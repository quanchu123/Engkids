# Design Document — Spaced Repetition Review (SRS)

## Overview

Kích hoạt SRS thật sự cho Engkids bằng cách **nối các mảnh đã có** thay vì xây mới:
- Thuật toán SM-2 + truy vấn `vocabulary_items`: đã có đủ trong `src/services/vocabulary.ts`.
- Migration bảng: đã có `supabase/migrations/018_ensure_vocabulary_items.sql` (idempotent, schema khớp).
- UI flashcard + 5 mức chất lượng: đã có `src/app/progress/review/page.tsx` (nhưng đang đọc localStorage).

Công việc đợt này = (1) chạy migration, (2) sửa `vocabulary.ts` dùng đúng session đăng nhập, (3) chuyển trang review sang chế độ "due-based" qua service SRS với fallback localStorage cho khách, (4) đồng bộ từ đã lưu vào `vocabulary_items`, (5) hiển thị "đến hạn hôm nay" + thống kê trên Progress.

### Phát hiện kỹ thuật quan trọng (phải xử lý)

`src/services/vocabulary.ts` hiện tạo client riêng ở module-level:
```ts
const supabase = createClient(URL, ANON_KEY);
```
Client này **không** chia sẻ phiên đăng nhập với singleton `getSupabaseClient()` (từ `@/lib/auth-client`) mà phần còn lại của app dùng để giữ session. Hệ quả: `supabase.auth.getUser()` trong `vocabulary.ts` có thể trả `null` dù người dùng đã đăng nhập → mọi hàm SRS trả rỗng/âm thầm fail, và RLS chặn ghi. **Đây nhiều khả năng là lý do gốc khiến SRS "chưa chạy".** Design sẽ sửa `vocabulary.ts` dùng `getSupabaseClient()` dùng chung.

### Goals
1. `vocabulary_items` tồn tại đúng schema trên DB (chạy 018).
2. Trang review chỉ hiện từ đến hạn; chấm điểm cập nhật lịch SM-2 server-side.
3. Người đã đăng nhập: từ đã lưu được đưa vào `vocabulary_items`; khách: fallback review cục bộ.
4. Progress hiển thị "đến hạn hôm nay" + thống kê.
5. Build/type-check/lint sạch; không phá phần khác.

### Non-Goals
- Viết lại SM-2 (giữ nguyên).
- Migrate hàng loạt dữ liệu cũ.
- Listening/pronunciation/chatbot (đợt sau).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Migration (chạy 1 lần trên Supabase SQL editor)               │
│   018_ensure_vocabulary_items.sql  → bảng vocabulary_items    │
└───────────────────────────────┬───────────────────────────────┘
                                 │ (RLS: chủ sở hữu)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│ src/services/vocabulary.ts  (SM-2 — SỬA dùng session chung)   │
│   getWordsForReview / submitReview / getVocabularyStats /     │
│   addVocabulary                                               │
└──────────────┬───────────────────────────────┬───────────────┘
               │ đọc/ghi (đã đăng nhập)          │ thống kê
               ▼                                  ▼
┌──────────────────────────────┐   ┌────────────────────────────┐
│ /progress/review (SỬA)        │   │ /progress (SỬA: thêm thẻ    │
│  - đã đăng nhập: due-based     │   │  "đến hạn hôm nay" + stats) │
│  - khách: fallback local cũ    │   └────────────────────────────┘
└──────────────┬─────────────────┘
               │ khi lưu từ (đã đăng nhập)
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Đồng bộ savedWord → addVocabulary (best-effort, non-blocking) │
│  (hook vào nơi lưu từ hiện có: store action / progress-sync)  │
└─────────────────────────────────────────────────────────────┘
```

Nguyên tắc: thay đổi tối thiểu, có nhánh fallback rõ ràng cho khách (không đăng nhập), mọi lời gọi Supabase bọc try/catch.

---

## Components and Interfaces

### 1. Migration (Requirement 1)
- **Không viết mới.** Dùng `supabase/migrations/018_ensure_vocabulary_items.sql` đã có.
- Tasks sẽ kèm hướng dẫn: mở Supabase → SQL Editor → dán nội dung 018 → Run. Idempotent nên chạy lại an toàn.
- Sau khi chạy, verify bằng truy vấn liệt kê bảng (đã có trong 006) hoặc `select count(*) from vocabulary_items`.

### 2. Sửa `src/services/vocabulary.ts` (Requirement 2,3,6 — gốc rễ)

Thay client module-level bằng singleton dùng chung để giữ session:
```ts
// TRƯỚC
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(URL, ANON_KEY);

// SAU
import { getSupabaseClient } from '@/lib/auth-client';
// gọi getSupabaseClient() trong từng hàm (hoặc 1 lần lazy) để dùng đúng phiên đăng nhập
```
- Giữ nguyên chữ ký + logic SM-2 của `getWordsForReview`, `submitReview`, `getVocabularyStats`, `addVocabulary`, `getUserProfileId`.
- `getUserProfileId()` vẫn `auth.getUser()` nhưng giờ trên client có session → trả đúng profile id.
- Tất cả hàm đã có guard `if (!profileId) return [] / null` → khách dùng sẽ nhận rỗng (an toàn).

### 3. Trang `src/app/progress/review/page.tsx` (Requirement 2,3,6)

Chuyển sang 2 chế độ:
- **Đã đăng nhập (SRS server):**
  - `useEffect`: gọi `getWordsForReview(20)` → set danh sách due. Nếu rỗng → trạng thái "Hôm nay không có từ cần ôn".
  - Khi chọn quality (0-5): gọi `submitReview(item.id, quality)` (await), cập nhật stats phiên, sang từ kế. Lỗi → toast nhẹ, giữ tiến độ.
  - Hiển thị tiến độ "đã ôn / tổng đến hạn".
- **Khách (chưa đăng nhập):** giữ nguyên hành vi cũ (đọc `useAppStore().progress.savedWords` + `updateWordMastery`), kèm banner mời đăng nhập để bật ôn tập thông minh.
- Quyết định chế độ: kiểm tra session qua `getSupabaseClient().auth.getUser()` ở mount (giống `AdminGuard`).
- Tái dùng nguyên UI flashcard hiện có (lật thẻ, 5 nút quality, phát âm `pronounceWord`).
- Map `VocabularyItem` → field UI: `word`, `meaningVi → vi`, `pronunciation → ipa`, `exampleSentence`, `masteryLevel`.

### 4. Trang `src/app/progress/page.tsx` (Requirement 5)
- Khi đã đăng nhập: gọi `getVocabularyStats()` → hiển thị thẻ "Đến hạn hôm nay: N" + tổng từ + độ chính xác + phân bố mastery.
- Nút vào ôn tập hiển thị số đến hạn: "Ôn N từ hôm nay" (nếu N>0); nếu N=0 → "Không có từ đến hạn".
- Khách / chưa có từ: trạng thái rỗng thân thiện, không lỗi (bọc try/catch, mặc định 0).
- Giữ nguyên phần Progress hiện có; chỉ thêm khối SRS.

### 5. Đồng bộ từ đã lưu → `vocabulary_items` (Requirement 4)

- Khi người dùng **đã đăng nhập** lưu một từ (nơi hiện gọi `saveWord` trong store / `progress-sync`), gọi thêm `addVocabulary({...})` best-effort (không chặn UI, bọc try/catch).
- `addVocabulary` đã upsert theo `(user_profile_id, word_lower)` → không tạo trùng, không phá trạng thái SRS đang có.
- Điền `source_type`/`source_id` khi biết (story/video).
- Khách: bỏ qua bước này (giữ lưu local như cũ).
- Điểm hook: ưu tiên nơi tập trung (vd `progress-sync` khi đẩy savedWords lên server, hoặc một hàm `syncSavedWordToSRS()` gọi từ chỗ lưu từ). Chọn cách ít chạm nhất, không sửa store rộng.

### 6. Xử lý lỗi & quyền (Requirement 6)
- Mọi hàm `vocabulary.ts` đã trả rỗng/null khi không có user → UI hiển thị fallback, không crash.
- RLS của 018 đảm bảo chỉ chủ sở hữu đọc/ghi → không lộ từ người khác.
- Lời gọi trong page bọc try/catch, hiển thị toast/empty-state thay vì văng lỗi.

---

## Data Models

Không thêm bảng mới. Dùng `vocabulary_items` (đã định nghĩa trong 018):

```
vocabulary_items (per user)
├── id, user_profile_id (FK → user_profiles)
├── word, word_lower (generated), pronunciation
├── meaning_vi, meaning_en, part_of_speech
├── example_sentence, example_sentence_vi
├── source_type ('story'|'video'|'manual'), source_id
├── SRS: review_count, correct_count, ease_factor (2.5),
│         interval_days (1), next_review_date (today),
│         last_reviewed_at, mastery_level (0..5)
├── is_favorite
└── created_at, updated_at
UNIQUE(user_profile_id, word_lower)  -- chống trùng từ
RLS: chủ sở hữu (auth_id) đọc/ghi từ của mình
```

`SavedWord` (store/localStorage) giữ nguyên cho khách + nguồn hiển thị cũ. Ánh xạ khi đồng bộ: `word→word`, `vi→meaning_vi`, `ipa→pronunciation`, `exampleSentence→example_sentence`, `storyId→source_id` (+ `source_type='story'`).

---

## Correctness Properties

### Property 1: Chỉ ôn từ đến hạn
Với người đã đăng nhập, danh sách ôn chỉ gồm từ có `next_review_date <= hôm nay`; từ chưa đến hạn không xuất hiện trong phiên.

**Validates: Requirements 2.1, 2.2**

### Property 2: Cập nhật lịch SM-2 đúng hướng
Sau `submitReview`, quality<3 → `interval_days` về 1 (gặp lại sớm); quality>=3 → `next_review_date` xa hơn hiện tại. `ease_factor` không nhỏ hơn 1.3. `mastery_level` luôn trong [0,5].

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Không tạo từ trùng
`addVocabulary` cùng `word` (case-insensitive) cho cùng user không tạo bản ghi thứ hai và không reset trạng thái SRS đang có.

**Validates: Requirements 4.1, 4.2**

### Property 4: An toàn cho khách & lỗi
Khi không có người dùng đăng nhập hoặc Supabase lỗi, các hàm SRS trả rỗng/null và UI hiển thị fallback/empty-state, không ném lỗi, không lộ dữ liệu người khác.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: Thống kê đến hạn chính xác
`getVocabularyStats().dueToday` bằng số từ của user có `next_review_date <= hôm nay`; số hiển thị trên Progress khớp số từ thực tế trong phiên ôn.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Không phá nền tảng
`npm run build/type-check/lint` sạch; trang Progress, store, luồng lưu từ cũ vẫn hoạt động.

**Validates: Requirements 7.1, 7.2**

---

## Error Handling

- **Chưa đăng nhập:** `getUserProfileId()` trả null → hàm SRS trả rỗng; review page chuyển fallback local + banner mời đăng nhập.
- **Supabase lỗi (mạng/quyền):** try/catch trong service đã `console.error` + trả rỗng/null; page hiển thị toast/empty-state.
- **submitReview lỗi giữa phiên:** giữ tiến độ, báo nhẹ, cho thử lại/bỏ qua; không mất các từ đã chấm trước đó.
- **Migration chưa chạy:** truy vấn `vocabulary_items` lỗi bảng không tồn tại → bắt lỗi, hiển thị hướng dẫn/empty-state thay vì crash (và tasks nhắc chạy 018 trước).
- **Bảng rỗng:** dueToday=0 → trạng thái "không có từ cần ôn" + gợi ý thêm từ.

---

## Testing Strategy

- **Unit test (nơi khả thi):** tách hàm thuần SM-2 (`calculateNextReview`, `calculateMasteryLevel`) để test các tính chất Property 2 (quality<3 reset, quality>=3 tăng interval, ease>=1.3, mastery trong [0,5]).
- **Build/type/lint:** `npm run type-check`, `npm run lint`, `npm run build` sạch.
- **Thủ công (sau khi chạy 018):**
  1. Đăng nhập → lưu vài từ (đọc truyện) → kiểm tra xuất hiện trong `vocabulary_items`.
  2. Vào `/progress` → thấy "đến hạn hôm nay".
  3. Vào ôn tập → chỉ hiện từ đến hạn; chấm quality → lần sau từ đó dời lịch (không hiện lại nếu chưa đến hạn).
  4. Đăng xuất (khách) → review vẫn chạy chế độ cũ, không lỗi.
- **Regression:** trang Progress, lưu từ khi đọc truyện, store vẫn hoạt động bình thường.

---

## Rollout & Dependencies (bước cần người dùng)

1. **Bạn (hoặc mình hướng dẫn) chạy `018_ensure_vocabulary_items.sql` trên Supabase SQL editor.** Đây là bước bắt buộc, không thể bỏ qua — code SRS sẽ chỉ chạy sau khi bảng tồn tại. Mình không tự đổi schema DB production.
2. Deploy code (đã có quy trình `git pull && npm run build && pm2 restart` / GitHub Action).
3. Smoke test theo mục Testing.

## Open Questions

Không còn — các quyết định đã chốt ở requirements (dùng 018, SRS cho người đăng nhập, không migrate hàng loạt, 20 từ/phiên).
