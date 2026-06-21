# Implementation Plan — Spaced Repetition Review (SRS)

## Overview

Kích hoạt SRS bằng cách nối các mảnh đã có. Thứ tự: sửa gốc rễ `vocabulary.ts` (session) trước (task 1), thêm test SM-2 (task 2), rồi nối UI review (task 3) và Progress (task 4), đồng bộ lưu từ (task 5), cuối cùng kiểm tra (task 6). Migration `018` do người dùng chạy trên Supabase (ngoài code, nêu trong Notes).

## Tasks

- [x] 1. Sửa `src/services/vocabulary.ts` dùng session đăng nhập chung
  - Thay `createClient(URL, ANON_KEY)` module-level bằng `getSupabaseClient()` từ `@/lib/auth-client` (gọi trong từng hàm hoặc lazy) để `auth.getUser()` nhận đúng phiên.
  - Giữ nguyên chữ ký + logic SM-2 của tất cả hàm export.
  - Đảm bảo các guard `if (!profileId)` vẫn trả rỗng/null an toàn cho khách.
  - _Requirements: 2.1, 3.1, 6.1, 6.3_

- [x] 2. Tách & test hàm thuần SM-2
  - Tách `calculateNextReview` và `calculateMasteryLevel` thành module thuần export được (vd `src/lib/srs.ts`), `vocabulary.ts` import lại (không đổi hành vi).
  - Thêm unit test: quality<3 → interval=1; quality>=3 → interval tăng; ease>=1.3; mastery trong [0,5].
  - _Requirements: 3.2, 3.3, 7.3_

- [x] 3. Nối trang `src/app/progress/review/page.tsx` với SRS (due-based)
  - [x] 3.1 Phát hiện đăng nhập (getUser); nếu đã đăng nhập → `getWordsForReview(20)`; rỗng → trạng thái "Hôm nay không có từ cần ôn".
    - _Requirements: 2.1, 2.3_
  - [x] 3.2 Chấm quality → `await submitReview(id, quality)`, cập nhật stats phiên, sang từ kế; lỗi → toast nhẹ, giữ tiến độ.
    - _Requirements: 3.1, 3.4, 6.2_
  - [x] 3.3 Khách (chưa đăng nhập) → giữ chế độ cũ (savedWords + updateWordMastery) + banner mời đăng nhập.
    - _Requirements: 6.1_
  - [x] 3.4 Hiển thị tiến độ "đã ôn / tổng đến hạn"; tái dùng UI flashcard + phát âm hiện có.
    - _Requirements: 2.4_

- [x] 4. Hiển thị "đến hạn hôm nay" + thống kê trên `src/app/progress/page.tsx`
  - Đã đăng nhập: gọi `getVocabularyStats()` → thẻ "Đến hạn hôm nay: N", tổng từ, độ chính xác, phân bố mastery.
  - Nút vào ôn tập hiển thị số đến hạn ("Ôn N từ hôm nay"); N=0 → nhãn phù hợp.
  - Khách/chưa có từ → empty-state, bọc try/catch, mặc định 0.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Đồng bộ từ đã lưu → vocabulary_items (best-effort)
  - Khi người dùng đã đăng nhập lưu từ, gọi thêm `addVocabulary({...})` (non-blocking, try/catch) tại điểm hook tập trung (store action lưu từ hoặc progress-sync).
  - Điền `source_type`/`source_id` khi biết; khách bỏ qua.
  - Dựa vào upsert `(user_profile_id, word_lower)` để không tạo trùng / không reset SRS.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Kiểm tra & nghiệm thu
  - `npm run type-check`, `npm run lint`, `npm run build` sạch.
  - Smoke test sau khi chạy 018: lưu từ → thấy đến hạn → ôn → lịch dời; khách vẫn chạy fallback.
  - _Requirements: 7.1, 7.2_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3.1", "4", "5"] },
    { "wave": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "wave": 4, "tasks": ["6"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3.1": ["1"],
    "3.2": ["3.1"],
    "3.3": ["3.1"],
    "3.4": ["3.1"],
    "4": ["1"],
    "5": ["1"],
    "6": ["2", "3.2", "3.3", "3.4", "4", "5"]
  }
}
```

- Task 1 (sửa session) là gốc rễ — mọi task SRS phụ thuộc nó.
- Task 2, 3.1, 4, 5 chạy sau task 1 (có thể song song).
- Task 3.2/3.3/3.4 phụ thuộc 3.1.
- Task 6 phụ thuộc tất cả.

## Notes

- **Bước người dùng (bắt buộc):** chạy `supabase/migrations/018_ensure_vocabulary_items.sql` trên Supabase SQL editor TRƯỚC khi test. Mình không tự đổi schema DB production. Idempotent — chạy lại an toàn.
- Tái dùng tối đa: SM-2 + truy vấn trong `vocabulary.ts`, UI flashcard trong review page, `pronounceWord` cho phát âm.
- SRS chỉ cho người đăng nhập; khách giữ chế độ review cục bộ làm fallback.
- Không migrate hàng loạt dữ liệu cũ; đồng bộ từ giờ trở đi.
- Đi từng bước, commit có ý nghĩa; không rewrite lớn.
