# Requirements Document

## Introduction

Kích hoạt **hệ thống ôn tập giãn cách (Spaced Repetition System - SRS)** thật sự cho Engkids, để trẻ ôn lại đúng những từ "đến hạn hôm nay" theo lịch khoa học (thuật toán SM-2), thay vì ôn lại toàn bộ từ mỗi lần như hiện tại. Mục tiêu: biến app từ "xem/lưu từ cho vui" thành "học nhớ lâu".

### Bối cảnh (đã khảo sát code)

Phần lớn hạ tầng **đã có sẵn nhưng chưa được nối/chạy**:
- `src/services/vocabulary.ts` đã có **thuật toán SM-2 đầy đủ**: `getWordsForReview()`, `submitReview()`, `getVocabularyStats()`, `addVocabulary()`, tính `ease_factor`/`interval_days`/`next_review_date`/`mastery_level`.
- Bảng `vocabulary_items` đã được thiết kế (có các cột SRS) nhưng theo `DATABASE_SCHEMA.md` **chưa chạy migration** trên DB hiện tại.
- Trang `src/app/progress/review/page.tsx` đã có UI flashcard + 5 mức chất lượng (kiểu SM-2) **nhưng** đang đọc từ `useAppStore().progress.savedWords` (localStorage), **không** gọi service SRS → không có khái niệm "đến hạn", ôn lại tất cả mỗi lần.
- Từ vựng người dùng lưu khi đọc truyện/xem video đi vào `savedWords` (store + bảng `vocabulary` qua `progress-sync`), **chưa** đồng bộ sang `vocabulary_items`.

### Mục tiêu (đợt này)

Nối UI review với service SRS server-side, chạy migration `vocabulary_items` an toàn, đảm bảo từ người dùng lưu được đưa vào hệ SRS, và hiển thị "số từ đến hạn hôm nay". Tái dùng tối đa code SM-2 và UI đã có.

### Phạm vi (In scope)
- Chạy/đảm bảo migration bảng `vocabulary_items` (idempotent).
- Nối trang review với `getWordsForReview()` / `submitReview()` (chỉ từ đến hạn).
- Đồng bộ từ đã lưu (`savedWords`) vào `vocabulary_items` cho người dùng đã đăng nhập.
- Hiển thị "đến hạn hôm nay" + thống kê SRS trên trang Progress.
- Fallback an toàn cho người dùng chưa đăng nhập (SRS cần tài khoản).

### Ngoài phạm vi (Out of scope)
- Viết lại thuật toán SM-2 (đã có).
- Listening/pronunciation scoring, chatbot (các đợt sau).
- Thay đổi cơ chế lưu từ khi đọc truyện (chỉ thêm đồng bộ, không phá).
- Thay đổi giao diện tổng thể trang Progress ngoài phần SRS.

---

## Glossary

- **SRS (Spaced Repetition System):** lịch ôn giãn cách, ôn lại từ ngay trước khi quên.
- **SM-2:** thuật toán SRS kinh điển; dùng `ease_factor`, `interval_days`, `quality (0-5)` để tính ngày ôn kế tiếp. Đã hiện thực trong `vocabulary.ts`.
- **Due (đến hạn):** từ có `next_review_date <= hôm nay` → cần ôn.
- **Quality:** điểm tự đánh giá khi ôn (0=Không nhớ ... 5=Quá dễ); quyết định khoảng ôn kế.
- **vocabulary_items:** bảng Supabase lưu từ vựng kèm trạng thái SRS của từng người dùng.
- **savedWords:** danh sách từ trong store Zustand/localStorage hiện tại (nguồn từ đang dùng cho review cũ).
- **mastery_level (0-5):** mức thành thạo, suy ra từ số lần ôn + độ chính xác + interval.

---

## Requirements

### Requirement 1: Migration bảng vocabulary_items an toàn

**User Story:** Là quản trị viên, tôi muốn bảng `vocabulary_items` tồn tại đúng schema trên DB, để hệ SRS hoạt động.

#### Acceptance Criteria
1. THE hệ thống SHALL cung cấp một migration SQL idempotent tạo bảng `vocabulary_items` với đầy đủ cột mà `vocabulary.ts` dùng (`word`, `word_lower`, `meaning_vi`, `meaning_en`, `pronunciation`, `part_of_speech`, `example_sentence`, `example_sentence_vi`, `source_type`, `source_id`, `review_count`, `correct_count`, `ease_factor`, `interval_days`, `next_review_date`, `last_reviewed_at`, `mastery_level`, `is_favorite`, `created_at`, `user_profile_id`).
2. THE migration SHALL tạo ràng buộc unique theo `(user_profile_id, word_lower)` để khớp `onConflict` trong `addVocabulary()`.
3. THE migration SHALL đặt mặc định hợp lý: `ease_factor = 2.5`, `interval_days = 0`, `review_count = 0`, `correct_count = 0`, `mastery_level = 0`, `next_review_date = CURRENT_DATE`, `is_favorite = false`.
4. THE migration SHALL bật RLS và policy: chủ sở hữu đọc/ghi từ của mình (hoặc service role ghi), không rò rỉ từ của người khác.
5. WHEN migration chạy lại lần nữa THEN hệ thống SHALL KHÔNG lỗi và KHÔNG mất dữ liệu (dùng `IF NOT EXISTS`/`ON CONFLICT`).

### Requirement 2: Ôn tập chỉ các từ đến hạn (due-based review)

**User Story:** Là người học, tôi muốn mỗi phiên ôn chỉ hiện những từ đến hạn hôm nay, để ôn đúng lúc và không quá tải.

#### Acceptance Criteria
1. WHEN người dùng đã đăng nhập mở trang ôn tập THEN hệ thống SHALL lấy danh sách từ đến hạn qua `getWordsForReview()` (`next_review_date <= hôm nay`), giới hạn số lượng mỗi phiên.
2. THE thứ tự ôn SHALL ưu tiên từ mới / mastery thấp trước, rồi đến `next_review_date` sớm nhất (theo logic `getWordsForReview` đã có).
3. WHEN không có từ nào đến hạn THEN hệ thống SHALL hiển thị trạng thái "Hôm nay không có từ cần ôn" thân thiện, kèm gợi ý (đọc truyện/xem video để thêm từ, hoặc ôn sớm các từ sắp tới).
4. WHILE đang ôn THEN hệ thống SHALL hiển thị tiến độ phiên (đã ôn / tổng đến hạn).

### Requirement 3: Cập nhật lịch SRS khi trả lời

**User Story:** Là người học, tôi muốn lịch ôn tự điều chỉnh theo mức tôi nhớ, để gặp lại từ đúng thời điểm.

#### Acceptance Criteria
1. WHEN người dùng chọn một mức chất lượng (0-5) cho từ đang ôn THEN hệ thống SHALL gọi `submitReview(id, quality)` để cập nhật `ease_factor`, `interval_days`, `review_count`, `correct_count`, `mastery_level`, `next_review_date`, `last_reviewed_at` trong `vocabulary_items`.
2. WHEN quality < 3 (không nhớ/khó) THEN hệ thống SHALL đặt lại khoảng ôn ngắn (interval về 1 ngày) để gặp lại sớm.
3. WHEN quality >= 3 THEN hệ thống SHALL dời `next_review_date` ra xa hơn theo SM-2 (tăng interval theo ease).
4. WHEN một từ đã được chấm trong phiên THEN hệ thống SHALL chuyển sang từ kế tiếp VÀ không hỏi lại từ đó trong cùng phiên.
5. IF việc lưu kết quả ôn thất bại (mạng/lỗi) THEN hệ thống SHALL báo lỗi nhẹ nhàng VÀ không làm hỏng tiến độ phiên (cho thử lại hoặc bỏ qua an toàn).

### Requirement 4: Đưa từ đã lưu vào hệ SRS

**User Story:** Là người học, tôi muốn các từ tôi lưu khi học được tự đưa vào lịch ôn, để không phải nhập lại.

#### Acceptance Criteria
1. WHEN người dùng đã đăng nhập lưu một từ (khi đọc truyện/xem video) THEN hệ thống SHALL đảm bảo từ đó tồn tại trong `vocabulary_items` (qua `addVocabulary()` với upsert theo `word_lower`).
2. WHERE đã có từ đó trong `vocabulary_items` THEN hệ thống SHALL KHÔNG tạo trùng (giữ nguyên trạng thái SRS hiện tại).
3. THE việc đồng bộ SHALL điền nguồn (`source_type`/`source_id`) khi biết (vd 'story'/'video') để phục vụ thống kê.
4. WHERE người dùng chưa đăng nhập THEN hệ thống SHALL giữ hành vi hiện tại (lưu local), KHÔNG cố ghi `vocabulary_items` (tránh lỗi).

### Requirement 5: Hiển thị "đến hạn hôm nay" & thống kê SRS

**User Story:** Là người học, tôi muốn thấy hôm nay có bao nhiêu từ cần ôn, để có động lực vào ôn.

#### Acceptance Criteria
1. WHEN người dùng đã đăng nhập mở trang Progress THEN hệ thống SHALL hiển thị số từ "đến hạn hôm nay" (từ `getVocabularyStats().dueToday`).
2. THE trang Progress SHALL hiển thị thống kê SRS cơ bản: tổng số từ, phân bố theo mastery, độ chính xác tổng (từ `getVocabularyStats()`).
3. WHEN có từ đến hạn THEN nút/đường dẫn vào ôn tập SHALL nổi bật số lượng đến hạn (vd "Ôn 8 từ hôm nay").
4. WHERE chưa đăng nhập HOẶC chưa có từ nào THEN hệ thống SHALL hiển thị trạng thái rỗng thân thiện, không lỗi.

### Requirement 6: Yêu cầu đăng nhập cho SRS & xử lý lỗi

**User Story:** Là người dùng, tôi muốn trải nghiệm rõ ràng khi SRS cần đăng nhập, để không gặp màn hình lỗi khó hiểu.

#### Acceptance Criteria
1. WHERE SRS cần dữ liệu server (vocabulary_items) VÀ người dùng chưa đăng nhập THEN hệ thống SHALL hiển thị lời mời đăng nhập (hoặc fallback chế độ ôn cục bộ cũ), KHÔNG crash.
2. IF gọi Supabase lỗi (mạng/timeout/quyền) THEN hệ thống SHALL hiển thị thông báo nhẹ nhàng VÀ giữ app ổn định.
3. THE hệ thống SHALL KHÔNG để lộ từ vựng của người dùng khác (RLS + lọc theo `user_profile_id`).

### Requirement 7: Không phá vỡ nền tảng & phát triển an toàn

**User Story:** Là người duy trì dự án, tôi muốn thay đổi này không làm hỏng phần khác và đi từng bước kiểm thử.

#### Acceptance Criteria
1. THE thay đổi SHALL không phá vỡ trang Progress hiện có, store Zustand, hay luồng lưu từ khi đọc truyện.
2. WHEN chạy `npm run build`, `npm run type-check`, `npm run lint` THEN hệ thống SHALL không phát sinh lỗi mới.
3. THE logic SM-2 thuần (tính interval/ease/mastery) SHALL có unit test (nơi khả thi) để đảm bảo đúng.
4. THE triển khai SHALL đi từng bước nhỏ, commit có ý nghĩa, ưu tiên mở rộng code hiện có thay vì viết lại.

---

## Quyết định (đã chốt theo đề xuất)

1. **Migration:** dùng file SQL có sẵn `supabase/migrations/018_ensure_vocabulary_items.sql` (đã idempotent, schema khớp `vocabulary.ts`) — chạy trên Supabase SQL editor. Không cần viết migration mới; design sẽ kèm hướng dẫn chạy.
2. **Người dùng ẩn danh:** SRS chỉ cho người đã đăng nhập; người ẩn danh giữ chế độ review cục bộ cũ (localStorage) làm fallback.
3. **Migrate dữ liệu cũ:** không migrate hàng loạt; đồng bộ từ giờ trở đi (khi đăng nhập + khi lưu từ mới).
4. **Số từ mỗi phiên ôn:** 20 từ/phiên (theo `getWordsForReview`).

## Open Questions (đã giải quyết)

Tất cả câu hỏi mở đã được chốt theo đề xuất ở mục "Quyết định" phía trên.
