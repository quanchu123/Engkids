# Requirements Document

## Introduction

Tài liệu này mô tả yêu cầu cho đợt **NÂNG CẤP** game "English Farm" (đã tồn tại trong Engkids). Game hiện tại là một nông trại top-down lưới 6x4 dựng bằng Phaser 3: người chơi cày đất, gieo hạt, tưới nước, thu hoạch; mỗi cây gắn một từ vựng (`en`/`vi`/`level`); thu hoạch xong mở quiz trắc nghiệm, cộng XP và lưu trạng thái qua Supabase (đã đăng nhập) hoặc localStorage (khách). Toàn bộ logic thuần (cày/gieo/tưới/thu hoạch, quiz, từ vựng, tiến trình, save) nằm ở `src/game/farm/` và được kiểm thử bằng Vitest.

Mục tiêu đợt nâng cấp:
1. Làm chặt **logic học tiếng Anh**: phát âm (TTS), nhiều dạng quiz, ôn tập giãn cách (spaced-repetition) trong game, đếm từ đã thuộc, gắn với daily quest/tiến trình.
2. Hoàn thiện **vòng lặp gameplay gắn học**: cày → chọn hạt (học từ) → tưới → cây lớn theo "ngày" → thu hoạch → quiz nhận thưởng → bán/đổi xu → mở khóa rau củ và đất mới.
3. **Mở rộng rau củ** từ 6 loại lên nhiều loại (kèm từ vựng/giá/thời gian lớn) và chuẩn hóa **quy trình tạo asset bằng Dreamina** (prompt template, đặt tên file).
4. **Hiệu ứng & animation chân thật hơn**: cây đung đưa theo gió, lớn mượt, nảy mầm, lấp lánh khi chín, hiệu ứng cày/tưới, phản hồi đúng/sai quiz; **Veo 3 tạo cutscene video ngắn offline** (thu hoạch lớn, lên cấp, đổi mùa) kèm fallback CSS/particle khi thiếu video.
5. **Kinh tế & tiến trình**: xu, cấp độ, mở khóa, phần thưởng — đồng bộ Supabase theo tài khoản.
6. **Bền vững/không lỗi**: thiếu asset/video phải fallback an toàn, không crash; lưu/khôi phục trạng thái; chạy tốt trên mobile.

Phạm vi đề cao **tái dùng** kiến trúc hiện có (logic thuần tách khỏi Phaser/React) và tận dụng hạ tầng SRS (`src/services/vocabulary.ts`, bảng `vocabulary_items`) đã có trong dự án.

### Ngoài phạm vi (Out of scope)
- Tạo sprite/hiệu ứng realtime bằng AI: **không** dùng Gemini/Veo 3 để sinh sprite phản ứng theo thời gian thực. Veo 3 **chỉ** dùng tạo video cutscene **offline** (chuẩn bị trước, đặt vào thư mục asset).
- Viết lại thuật toán SM-2 (đã có trong `vocabulary.ts`).
- Đổi sang engine render khác ngoài Phaser.
- Chế độ chơi nhiều người (multiplayer).

---

## Glossary

- **Farm_System:** hệ thống logic nông trại thuần (cày/gieo/tưới/lớn theo ngày/thu hoạch) ở `src/game/farm/systems/farmingSystem.ts`.
- **Crop_Catalog:** danh mục rau củ (`src/game/farm/data/crops.ts`) ánh xạ mỗi loại cây sang cặp từ `en`/`vi`, `level`, `growthDays`, `sellValue`, `seedKey`, `spriteKey`, và (đợt này) yêu cầu mở khóa.
- **Vocabulary_System:** hệ thống quản lý từ đã thu thập trong game (`vocabularySystem.ts`), gồm `CollectedWord` (`timesSeen`, `mastery`).
- **Quiz_System:** hệ thống tạo và chấm câu hỏi (`quizSystem.ts`); đợt này mở rộng nhiều dạng câu hỏi.
- **Pronunciation_System:** thành phần phát âm từ tiếng Anh bằng Text-To-Speech của trình duyệt (Web Speech API).
- **SRS_Scheduler:** bộ lập lịch ôn tập giãn cách dùng để chọn từ "đến hạn" cho quiz ôn trong game, tái dùng SM-2 từ `src/services/vocabulary.ts` (đăng nhập) hoặc bản thuần cục bộ (khách).
- **Economy_System:** hệ thống xu/giá bán/mua hạt (`progressionSystem.ts` mở rộng).
- **Progression_System:** hệ thống XP, cấp độ (level), mở khóa nội dung và daily quest.
- **Animation_System:** lớp hiệu ứng Phaser (đung đưa, lớn mượt, nảy mầm, lấp lánh, particle tưới/cày, phản hồi quiz) ở tầng scene/view.
- **Cutscene_System:** lớp phát video cutscene ngắn (Veo 3 tạo offline) kèm fallback CSS/particle.
- **Asset_Pipeline:** quy trình tạo và đặt asset 2D bằng Dreamina vào `public/games/english-farm/assets/`.
- **Save_System:** lớp lưu/khôi phục `FarmState` qua Supabase (đăng nhập) hoặc localStorage (khách) ở `src/game/farm/save/`.
- **FarmState:** nguồn sự thật duy nhất dạng JSON serializable (`src/game/farm/types.ts`).
- **Day (ngày game):** đơn vị thời gian trong game; mỗi lần `advanceDay` tăng `day` lên 1 và cho cây được tưới lớn thêm một stage.
- **Growth_Stage (0..3):** giai đoạn lớn của cây; 3 là chín/thu hoạch được (`GROWTH_STAGE_MAX = 3`).
- **Guest (khách):** người dùng chưa đăng nhập; trạng thái lưu localStorage.
- **Mastery (0..5):** mức thành thạo một từ; từ được coi là "đã thuộc" khi `mastery >= 4`.
- **Quiz_Mode:** dạng câu hỏi quiz: `meaning` (chọn nghĩa), `listen` (nghe-chọn), `spelling` (điền chữ).

---

## Requirements

### Requirement 1: Gắn từ vựng và phát âm cho mỗi rau củ

**User Story:** Là trẻ học tiếng Anh, tôi muốn mỗi rau củ gắn một từ vựng có thể nghe phát âm, để vừa chơi vừa học từ qua hình ảnh và âm thanh.

#### Acceptance Criteria
1. THE Crop_Catalog SHALL gán cho mỗi loại rau củ đúng một cặp từ vựng gồm `en`, `vi`, và `level` thuộc {beginner, intermediate, advanced}.
2. WHEN người chơi chọn một loại hạt để gieo, THE Pronunciation_System SHALL phát âm từ tiếng Anh tương ứng bằng Text-To-Speech.
3. WHEN người chơi chạm vào một cây đang trồng trên lưới, THE Farm_System SHALL hiển thị cặp từ `en`/`vi` của cây đó kèm nút phát âm.
4. IF trình duyệt không hỗ trợ Text-To-Speech, THEN THE Pronunciation_System SHALL hiển thị từ ở dạng văn bản VÀ giữ nút phát âm hiển thị nhưng ở trạng thái vô hiệu hóa ngay khi phát hiện không hỗ trợ, mà không gây lỗi.
5. THE Pronunciation_System SHALL phát âm bằng giọng ngôn ngữ tiếng Anh (`en`) khi có giọng đó trong danh sách giọng của trình duyệt.

### Requirement 2: Quiz nhiều dạng khi thu hoạch

**User Story:** Là trẻ học tiếng Anh, tôi muốn câu hỏi ôn từ có nhiều dạng (chọn nghĩa, nghe rồi chọn, điền chữ), để việc ôn không nhàm chán và rèn nhiều kỹ năng.

#### Acceptance Criteria
1. WHEN người chơi thu hoạch một cây chín, THE Quiz_System SHALL tạo một câu hỏi quiz cho từ vựng của cây đó theo một trong các Quiz_Mode: `meaning`, `listen`, hoặc `spelling`.
2. WHERE Quiz_Mode là `meaning`, THE Quiz_System SHALL tạo đúng 4 lựa chọn duy nhất, trong đó có đúng một đáp án đúng và các lựa chọn còn lại là gây nhiễu (distractor).
3. WHERE Quiz_Mode là `listen`, THE Quiz_System SHALL phát âm từ tiếng Anh và yêu cầu người chơi chọn từ/nghĩa đúng trong 4 lựa chọn duy nhất.
4. WHERE Quiz_Mode là `spelling`, THE Quiz_System SHALL yêu cầu người chơi nhập hoặc ghép các chữ cái thành từ tiếng Anh đúng, bỏ qua khác biệt hoa/thường và khoảng trắng ở đầu/cuối khi chấm.
5. WHEN người chơi trả lời đúng một câu quiz, THE Quiz_System SHALL chấm là đúng VÀ THE Progression_System SHALL cộng XP theo hằng số `XP_PER_CORRECT` dựa trên cờ "đúng".
6. IF không thể xác định câu trả lời là đúng hay sai, THEN THE Quiz_System SHALL coi câu trả lời là sai, hiển thị đáp án đúng VÀ không cộng XP.
7. IF người chơi trả lời sai, THEN THE Quiz_System SHALL hiển thị đáp án đúng VÀ không cộng XP cho câu đó.
8. IF danh sách từ nguồn (word bank) rỗng hoặc không đủ tạo distractor, THEN THE Quiz_System SHALL bổ sung lựa chọn từ bộ từ mặc định để câu hỏi luôn có đủ lựa chọn hợp lệ và không rỗng.

### Requirement 3: Ôn tập giãn cách trong game và đếm từ đã thuộc

**User Story:** Là trẻ học tiếng Anh, tôi muốn game ưu tiên cho tôi ôn lại những từ sắp quên, để tôi nhớ từ lâu hơn.

#### Acceptance Criteria
1. THE SRS_Scheduler SHALL ghi nhận với mỗi từ đã thu thập các thông tin lịch ôn: số lần gặp, số lần đúng, mức mastery (0..5), và thời điểm/ngày ôn kế tiếp.
2. WHEN người chơi mở phiên ôn từ trong game, THE SRS_Scheduler SHALL chọn ưu tiên các từ đã "đến hạn" (ngày ôn kế tiếp <= ngày hiện tại), sắp xếp từ mastery thấp trước.
3. WHEN người chơi trả lời một từ trong phiên ôn, THE SRS_Scheduler SHALL cập nhật mức mastery và dời ngày ôn kế tiếp dựa trên kết quả đúng/sai (đúng → dời xa hơn, sai → đặt lại gần).
4. THE Vocabulary_System SHALL tính và hiển thị số "từ đã thuộc" là số từ có `mastery >= 4`.
5. WHILE người chơi đã đăng nhập, THE SRS_Scheduler SHALL đồng bộ trạng thái ôn tập của từ vào hệ SRS server (`vocabulary_items`) tái dùng dịch vụ SM-2 hiện có.
6. WHERE người chơi là Guest, THE SRS_Scheduler SHALL duy trì lịch ôn cục bộ trong `FarmState` mà không gọi dịch vụ server.
7. IF không có từ nào đến hạn, THEN THE SRS_Scheduler SHALL cho phép tiếp tục với từ mới hoặc từ sắp đến hạn thay vì để phiên ôn rỗng.

### Requirement 4: Vòng lặp gameplay gắn học

**User Story:** Là trẻ học tiếng Anh, tôi muốn một vòng chơi rõ ràng từ cày đất đến thu hoạch và nhận thưởng, để mỗi vòng đều giúp tôi học thêm và tiến bộ.

#### Acceptance Criteria
1. THE Farm_System SHALL áp dụng máy trạng thái ô đất: `empty` → `tilled` → `planted` → (thu hoạch) → `empty`.
2. WHEN người chơi gieo một hạt lên ô đã cày, THE Farm_System SHALL giảm số lượng hạt tương ứng đi 1 VÀ đặt cây ở Growth_Stage 0.
3. IF người chơi cố gieo khi không còn hạt loại đó, THEN THE Farm_System SHALL từ chối thao tác VÀ giữ nguyên trạng thái.
4. WHEN một ngày game trôi qua (`advanceDay`), THE Farm_System SHALL tăng Growth_Stage thêm 1 (giới hạn tối đa `GROWTH_STAGE_MAX`) cho mỗi cây đã được tưới trong ngày, VÀ đặt lại trạng thái "đã tưới hôm nay" về false cho mọi cây (kể cả cây chưa được tưới).
5. WHILE một cây chưa được tưới trong ngày, THE Farm_System SHALL giữ nguyên Growth_Stage của cây đó khi sang ngày mới.
6. WHEN người chơi thu hoạch một cây đã đạt Growth_Stage tối đa, THE Farm_System SHALL thêm 1 nông sản vào kho (tôn trọng giới hạn ô kho), đặt lại ô về `empty`, VÀ trả về từ vựng để mở quiz.
7. IF kho đã đầy khi thu hoạch, THEN THE Farm_System SHALL từ chối thu hoạch VÀ giữ nguyên cây trên ô.
8. WHEN người chơi bán một nông sản, THE Economy_System SHALL tăng xu theo `sellValue` của loại cây đó VÀ giảm số lượng nông sản đó trong kho đi 1.

### Requirement 5: Mở rộng danh mục rau củ và quy trình tạo asset

**User Story:** Là người duy trì game, tôi muốn dễ dàng thêm rau củ mới kèm từ vựng và asset, để nội dung học phong phú hơn theo thời gian.

#### Acceptance Criteria
1. THE Crop_Catalog SHALL hỗ trợ nhiều hơn 6 loại rau củ, mỗi loại có `id` duy nhất, cặp từ `en`/`vi`, `level`, `growthDays > 0`, `sellValue > 0`, `seedKey`, và `spriteKey`.
2. THE Crop_Catalog SHALL cho phép gắn điều kiện mở khóa cho từng loại rau củ (ví dụ theo cấp độ người chơi hoặc số xu).
3. WHEN một asset sprite của một loại rau củ bị thiếu trong `public/games/english-farm/assets/`, THE Animation_System SHALL dùng asset dự phòng (bộ Icons8 hoặc emoji) mà không gây lỗi.
4. THE Asset_Pipeline SHALL cung cấp quy ước đặt tên file thống nhất (ví dụ `<cropId>.png` và các frame lớn dần `<cropId>-1..-4.png`) để game tự ráp asset theo `spriteKey`.
5. THE Asset_Pipeline SHALL cung cấp một prompt template Dreamina cho mỗi loại asset rau củ mới (phong cách 2D cartoon top-down, nền trong suốt) để người dùng tạo ảnh nhất quán.

### Requirement 6: Hiệu ứng và animation chân thật hơn

**User Story:** Là trẻ chơi game, tôi muốn nông trại sống động với cây đung đưa, lớn mượt và hiệu ứng vui mắt, để cảm thấy thích thú khi chơi.

#### Acceptance Criteria
1. WHILE một cây đang ở trạng thái `planted`, THE Animation_System SHALL hiển thị chuyển động đung đưa nhẹ theo "gió" lặp lại liên tục.
2. WHEN một cây tăng Growth_Stage, THE Animation_System SHALL chuyển khung hình lớn dần một cách mượt (chuyển tiếp có nội suy) thay vì đổi đột ngột.
3. WHEN một hạt vừa được gieo, THE Animation_System SHALL hiển thị hiệu ứng nảy mầm.
4. WHILE một cây đã đạt Growth_Stage tối đa, THE Animation_System SHALL hiển thị hiệu ứng lấp lánh báo cây đã chín.
5. WHEN người chơi cày đất hoặc tưới nước, THE Animation_System SHALL hiển thị hiệu ứng particle tương ứng (đất/nước); WHERE cả hai thao tác cày và tưới xảy ra cùng lúc, THE Animation_System SHALL ưu tiên thao tác cày và chỉ hiển thị particle đất.
6. WHEN người chơi trả lời quiz, THE Animation_System SHALL hiển thị phản hồi hình ảnh phân biệt đúng và sai.
7. THE Animation_System SHALL duy trì tốc độ khung hình mượt trên thiết bị mobile bằng cách giới hạn số particle/hiệu ứng đồng thời.

### Requirement 7: Cutscene video bằng Veo 3 (offline) kèm fallback

**User Story:** Là trẻ chơi game, tôi muốn xem những đoạn video ngắn vui khi đạt cột mốc, để có cảm giác phần thưởng và muốn chơi tiếp.

#### Acceptance Criteria
1. WHEN người chơi đạt một cột mốc cutscene (thu hoạch lớn, lên cấp, hoặc đổi mùa), THE Cutscene_System SHALL phát một video cutscene ngắn đã được tạo sẵn (offline bằng Veo 3) tương ứng với cột mốc đó.
2. THE Cutscene_System SHALL phát video từ asset cục bộ trong dự án mà không gọi Veo 3/Gemini lúc chạy game.
3. IF video cutscene tương ứng bị thiếu hoặc không phát được, THEN THE Cutscene_System SHALL hiển thị hiệu ứng dự phòng bằng CSS/particle VÀ tiếp tục game mà không crash; THE Cutscene_System SHALL luôn cho phép game tiếp tục kể cả khi hiệu ứng dự phòng cũng thất bại.
4. WHEN một cutscene đang phát, THE Cutscene_System SHALL cho phép người chơi bỏ qua (skip) để quay lại chơi.
5. THE Asset_Pipeline SHALL cung cấp prompt template Veo 3 và quy ước đặt tên cho từng video cutscene để tạo offline nhất quán.

### Requirement 8: Kinh tế, tiến trình và mở khóa đồng bộ tài khoản

**User Story:** Là trẻ chơi game, tôi muốn tích xu, lên cấp và mở khóa nội dung mới được lưu theo tài khoản, để tiến trình của tôi không bị mất.

#### Acceptance Criteria
1. THE Economy_System SHALL giữ số xu luôn lớn hơn hoặc bằng 0 sau mọi giao dịch.
2. IF người chơi cố mua hạt hoặc vật phẩm khi không đủ xu, THEN THE Economy_System SHALL từ chối giao dịch VÀ giữ nguyên số xu và kho.
3. WHEN tổng XP của người chơi đạt hoặc vượt ngưỡng của một hay nhiều cấp kế tiếp, THE Progression_System SHALL tăng cấp độ người chơi lên đúng cấp tương ứng với tổng XP (cho phép nhảy nhiều cấp cùng lúc).
4. WHEN người chơi đạt điều kiện mở khóa một loại rau củ hoặc ô đất mới, THE Progression_System SHALL đánh dấu nội dung đó là đã mở khóa VÀ cho phép sử dụng.
5. THE Progression_System SHALL cung cấp daily quest với mục tiêu đo được (ví dụ "thu hoạch 3 cây", "ôn 5 từ") VÀ trao thưởng khi hoàn thành.
6. WHILE người chơi đã đăng nhập, THE Save_System SHALL đồng bộ `FarmState` (xu, XP, cấp độ, mở khóa, từ đã thu thập) lên Supabase theo tài khoản.
7. WHERE người chơi là Guest, THE Save_System SHALL lưu `FarmState` vào localStorage trong mọi trường hợp để không mất tiến trình phiên; THE Economy_System (Req 8.1) vẫn chịu trách nhiệm giữ giá trị xu hợp lệ trước khi lưu.

### Requirement 9: Bền vững, fallback và khôi phục trạng thái

**User Story:** Là phụ huynh/người chơi, tôi muốn game không bị treo khi thiếu tài nguyên hoặc mất mạng, để trẻ luôn chơi được.

#### Acceptance Criteria
1. WHEN game khởi động và phát hiện trạng thái đã lưu, THE Save_System SHALL khôi phục `FarmState` về đúng trạng thái trước đó.
2. IF dữ liệu lưu bị hỏng hoặc sai schema version, THEN THE Save_System SHALL khởi tạo trạng thái mới mặc định an toàn thay vì crash.
3. IF việc đồng bộ Supabase thất bại (mạng/timeout/quyền), THEN THE Save_System SHALL giữ trạng thái cục bộ và cho phép tiếp tục chơi mà không mất dữ liệu phiên hiện tại.
4. WHEN bất kỳ asset hình/âm/video nào bị thiếu, THE Animation_System SHALL dùng fallback (Icons8/emoji/CSS) để game vẫn hiển thị đầy đủ và chơi được.
5. THE Farm_System SHALL không ném ngoại lệ cho thao tác không hợp lệ mà trả về kết quả thất bại có lý do, giữ nguyên trạng thái.
6. THE game SHALL hiển thị và điều khiển được bằng chạm trên màn hình mobile.

---

## Correctness Properties (cho phần logic thuần)

Các thuộc tính dưới đây dành cho logic thuần (pure TypeScript, không Phaser/React), kiểm thử bằng property-based testing với Vitest.

1. **Xu không âm (invariant):** với bất kỳ chuỗi giao dịch hợp lệ nào (bán/mua/thưởng), `state.coins >= 0` luôn đúng. (Req 8.1, 8.2)
2. **Tiến trình cây theo ngày (metamorphic/invariant):** sau `advanceDay`, mỗi cây được tưới có `stage' = min(stage + 1, GROWTH_STAGE_MAX)`, cây không tưới giữ nguyên `stage`, và `wateredToday` của mọi cây trở về false; `stage` luôn nằm trong 0..GROWTH_STAGE_MAX. (Req 4.4, 4.5)
3. **Quiz luôn hợp lệ (invariant):** `buildQuizForWord` luôn trả về đúng 4 lựa chọn duy nhất (so sánh không phân biệt hoa/thường), luôn chứa đáp án đúng, kể cả khi word bank rỗng. (Req 2.2, 2.7)
4. **Chấm spelling chuẩn hóa (invariant):** với Quiz_Mode `spelling`, đáp án được chấm đúng khi và chỉ khi khớp từ đích sau khi bỏ qua hoa/thường và khoảng trắng đầu/cuối. (Req 2.4)
5. **Lập lịch SRS đơn điệu (metamorphic):** trả lời đúng làm ngày ôn kế tiếp không gần hơn so với trước (interval không giảm); trả lời sai đặt lại ngày ôn về gần (interval về mức nhỏ nhất); `mastery` luôn nằm trong 0..5. (Req 3.3)
6. **Chọn từ ôn ưu tiên đến hạn (model-based):** `SRS_Scheduler` chỉ chọn từ có ngày ôn kế tiếp <= ngày hiện tại khi còn từ đến hạn, và sắp xếp mastery thấp trước; kết quả khớp một mô hình tham chiếu đơn giản. (Req 3.2)
7. **Round-trip lưu/khôi phục (round-trip):** `deserialize(serialize(state))` cho ra `FarmState` tương đương về mặt dữ liệu với `state` ban đầu. (Req 9.1)
8. **Khôi phục an toàn khi hỏng dữ liệu (error condition):** với dữ liệu lưu không hợp lệ bất kỳ, `Save_System` trả về một `FarmState` mặc định hợp lệ thay vì ném lỗi. (Req 9.2)
9. **Bán nông sản nhất quán (invariant):** bán một nông sản làm số lượng loại đó trong kho giảm đúng 1 và xu tăng đúng `sellValue`; không bán được khi không có nông sản đó. (Req 4.8)
