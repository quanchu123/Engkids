# Requirements Document

## Introduction

Xây dựng một **game nông trại học tiếng Anh** ("English Farming Game") mới cho nền tảng Engkids (ComicLingua Kids). Đây là một life-simulation kiểu Stardew Valley nhẹ, nơi trẻ em (5-10 tuổi) vừa trồng trọt, chăm sóc động vật, làm nhiệm vụ, vừa **học từ vựng tiếng Anh tự nhiên** thông qua gameplay.

### Bối cảnh & quyết định nền tảng (Phase 1 — Research & Selection)

Đã khảo sát các repo farming open-source trên GitHub:
- **jeremyckahn/farmhand** (React+TS, 131★, maintained tốt) — chất lượng cao nhưng **license GPL-2.0 (code) + CC BY-NC-SA 4.0 (art)**: không tương thích với sản phẩm thương mại Engkids (NC cấm dùng thương mại, GPL buộc mở toàn bộ mã nguồn).
- Các Stardew clone tốt khác đều là Unity/C#/Python — sai stack, không nhúng được vào Next.js.
- Các farming game Phaser/JS còn lại đều là prototype nhỏ, bỏ hoang.

**Quyết định (đã chốt với chủ dự án):** Hướng A — **tự xây game farming mới bằng Phaser 3**, tái dùng đúng stack `public/games/` + Supabase + Gemini đã có của Engkids. Tham khảo *ý tưởng thiết kế* từ Farmhand/Stardew Valley nhưng **không copy code hay art** → an toàn pháp lý, đúng nguyên tắc "reuse stack, don't rewrite".

### Phạm vi tích hợp (tái dùng hệ thống có sẵn)
- Game là một trang React `src/app/games/english-farm/page.tsx`, dynamic-import Phaser (giống `rpg-world`, `tank-word`...).
- Assets đặt tại `public/games/english-farm/`.
- Từ vựng nạp qua `@/lib/word-bank` (`loadWordBank()`, `getWordBank()`), quiz qua `@/services/game-content`.
- Tiến độ/điểm/streak lưu qua bảng `user_progress` / `vocabulary_items` (Supabase) đã có.
- Game xuất hiện trong hub `src/app/games/page.tsx` và quản lý nội dung qua admin panel hiện có.
- AI dùng Gemini API qua một API route server-side mới (`/api/games/farm/ai`), không gọi trực tiếp từ client.

### Mục tiêu (Main Goal)
Tạo một game nông trại giáo dục được trau chuốt, nơi người chơi học tiếng Anh tự nhiên trong lúc chơi, dùng nền tảng và hạ tầng Engkids sẵn có làm nền móng.

### Ngoài phạm vi (Out of Scope)
- Multiplayer/online play.
- 3D hoặc engine ngoài Phaser.
- Sao chép tài sản (art/audio/code) từ bất kỳ game thương mại nào.
- Thay đổi data model nghiệp vụ hiện có ngoài các bảng mở rộng cần thiết cho game.

---

## Glossary

- **Plot (Ô đất):** một ô trên lưới nông trại có thể cày, gieo, tưới, thu hoạch.
- **Crop (Cây trồng):** thực thể trồng trên plot, có các giai đoạn sinh trưởng; mỗi loại gắn với 1 từ vựng tiếng Anh.
- **Vocabulary item (Từ vựng):** cặp Anh-Việt (mở rộng: phát âm, ví dụ) người chơi thu thập được.
- **Vocabulary level (Cấp độ từ):** beginner / intermediate / advanced (khớp `GameDifficulty` hiện có).
- **SRS (Spaced Repetition System):** lịch ôn tập giãn cách dựa trên `ease_factor`, `interval_days`, `next_review_date` (đã có trong `vocabulary_items`).
- **Quiz:** bài kiểm tra ngắn (trắc nghiệm / nghe / nối từ) gắn vào hành động trong game.
- **Daily task (Nhiệm vụ ngày):** mục tiêu học/chơi reset mỗi ngày, thưởng XP/coin.
- **Streak (Chuỗi ngày):** số ngày liên tiếp người chơi hoàn thành mục tiêu học.
- **XP / Coin:** điểm kinh nghiệm (tiến cấp) và tiền tệ trong game (mua hạt giống, vật phẩm).
- **NPC:** nhân vật trong game đưa hội thoại, nhiệm vụ, dạy từ.
- **Game session bridge:** lớp giao tiếp giữa Phaser (game) và React/Supabase (lưu trữ, UI overlay).
- **Word bank:** kho từ vựng dùng chung do admin quản lý (`game_content: word-bank`).
- **Gemini:** mô hình AI của Google dùng để sinh từ vựng/quiz động và điều chỉnh độ khó.

---

## Requirements

### Requirement 1: Hệ thống nông trại (Farming & Harvesting)

**User Story:** Là người chơi nhỏ tuổi, tôi muốn cày đất, gieo hạt, tưới nước và thu hoạch cây, để trải nghiệm vòng lặp nông trại vui và gắn mỗi cây với một từ tiếng Anh.

#### Acceptance Criteria
1. WHEN người chơi chọn một plot trống và dùng công cụ cày THEN hệ thống SHALL chuyển plot sang trạng thái "đã cày".
2. WHEN người chơi gieo một hạt giống lên plot đã cày THEN hệ thống SHALL tạo một crop ở giai đoạn sinh trưởng đầu tiên VÀ gắn nó với một từ vựng tiếng Anh tương ứng.
3. WHILE một crop chưa được tưới trong ngày THEN hệ thống SHALL KHÔNG tăng giai đoạn sinh trưởng của crop đó.
4. WHEN một crop đạt giai đoạn trưởng thành VÀ người chơi thu hoạch THEN hệ thống SHALL thêm sản phẩm vào inventory VÀ ghi nhận từ vựng của crop đó vào bộ sưu tập từ của người chơi.
5. WHERE plot đã có crop THEN hệ thống SHALL KHÔNG cho gieo hạt mới lên plot đó cho tới khi thu hoạch hoặc dọn.
6. WHEN trạng thái nông trại thay đổi (cày/gieo/tưới/thu hoạch) THEN hệ thống SHALL lưu trạng thái để khôi phục ở phiên chơi sau (save/load).

### Requirement 2: Chăm sóc động vật (Animal Care)

**User Story:** Là người chơi, tôi muốn nuôi và chăm sóc động vật, để học từ vựng về con vật và nhận sản phẩm.

#### Acceptance Criteria
1. WHEN người chơi cho một con vật ăn THEN hệ thống SHALL tăng chỉ số "no/hạnh phúc" của con vật đó trong ngày.
2. WHILE một con vật đang ở trạng thái hạnh phúc THEN hệ thống SHALL cho phép thu sản phẩm (vd trứng, sữa) một lần mỗi ngày.
3. WHEN người chơi tương tác với một con vật THEN hệ thống SHALL hiển thị tên tiếng Anh + nghĩa tiếng Việt của con vật đó.
4. WHEN người chơi thu sản phẩm từ động vật THEN hệ thống SHALL thêm sản phẩm vào inventory VÀ ghi nhận từ vựng liên quan.
5. IF một con vật không được cho ăn trong N ngày liên tiếp THEN hệ thống SHALL giảm chỉ số hạnh phúc của nó (không "chết" — phù hợp trẻ em).

### Requirement 3: Kho đồ & Cửa hàng (Inventory & Shops)

**User Story:** Là người chơi, tôi muốn quản lý vật phẩm và mua/bán ở cửa hàng, để duy trì vòng kinh tế trong game.

#### Acceptance Criteria
1. THE hệ thống SHALL hiển thị inventory gồm các vật phẩm với số lượng, biểu tượng và tên tiếng Anh.
2. WHEN người chơi bán một sản phẩm ở cửa hàng THEN hệ thống SHALL tăng số coin tương ứng giá bán VÀ giảm số lượng vật phẩm.
3. WHEN người chơi mua một vật phẩm VÀ có đủ coin THEN hệ thống SHALL trừ coin VÀ thêm vật phẩm vào inventory.
4. IF người chơi không đủ coin để mua THEN hệ thống SHALL từ chối giao dịch VÀ hiển thị thông báo thân thiện.
5. THE inventory SHALL có giới hạn số ô (slot) cấu hình được; WHEN inventory đầy THEN hệ thống SHALL ngăn nhận thêm vật phẩm mới VÀ báo cho người chơi.
6. WHEN inventory hoặc coin thay đổi THEN hệ thống SHALL lưu lại để khôi phục ở phiên sau.

### Requirement 4: Nhiệm vụ, Tiến cấp & Thành tích (Quests, Progression, Achievements)

**User Story:** Là người chơi, tôi muốn có nhiệm vụ, lên cấp và mở khóa thành tích, để có mục tiêu và động lực quay lại.

#### Acceptance Criteria
1. THE hệ thống SHALL cung cấp danh sách nhiệm vụ (vd "Thu hoạch 3 cà rốt", "Học 5 từ mới") với mô tả song ngữ.
2. WHEN người chơi hoàn thành điều kiện của một nhiệm vụ THEN hệ thống SHALL đánh dấu hoàn thành VÀ trao phần thưởng (XP và/hoặc coin).
3. WHEN người chơi tích lũy đủ XP cho ngưỡng cấp tiếp theo THEN hệ thống SHALL tăng cấp người chơi VÀ hiển thị hiệu ứng chúc mừng.
4. WHEN người chơi đạt một mốc đặc biệt (vd thu hoạch lần đầu, học 50 từ, streak 7 ngày) THEN hệ thống SHALL mở khóa achievement tương ứng (mỗi achievement chỉ mở khóa một lần).
5. THE tiến độ nhiệm vụ/cấp/thành tích SHALL được lưu và khôi phục giữa các phiên chơi.

### Requirement 5: Thu thập & cấp độ từ vựng (Vocabulary Collection & Levels)

**User Story:** Là người học, tôi muốn thu thập từ vựng theo cấp độ trong lúc chơi, để mở rộng vốn từ một cách có hệ thống.

#### Acceptance Criteria
1. WHEN người chơi gặp một từ mới qua gameplay (thu hoạch, gặp NPC, mua vật phẩm) THEN hệ thống SHALL thêm từ đó vào bộ sưu tập từ vựng của người chơi (nếu chưa có).
2. THE mỗi từ vựng SHALL có cấp độ (beginner/intermediate/advanced) khớp với `GameDifficulty` hiện có.
3. THE hệ thống SHALL hiển thị màn hình bộ sưu tập từ vựng cho phép xem các từ đã thu thập, kèm nghĩa tiếng Việt.
4. WHERE một từ đã có trong bộ sưu tập THEN hệ thống SHALL KHÔNG tạo bản trùng lặp mà cập nhật số lần gặp / mức thành thạo.
5. THE từ vựng trong game SHALL lấy từ word bank dùng chung (`@/lib/word-bank`) làm nguồn mặc định, đảm bảo nhất quán với các game khác.

### Requirement 6: Hệ thống Quiz gắn với gameplay (Quiz System)

**User Story:** Là người học, tôi muốn trả lời quiz ngắn trong lúc chơi, để củng cố từ đã học và nhận thưởng.

#### Acceptance Criteria
1. WHEN một sự kiện học xảy ra (vd thu hoạch một cây "mới", hoặc bắt đầu nhiệm vụ học) THEN hệ thống SHALL hiển thị một quiz ngắn liên quan tới từ vừa gặp.
2. THE quiz SHALL hỗ trợ ít nhất dạng trắc nghiệm (multiple-choice), tái dùng cấu trúc `MCQuestion`/`getWordBank` hiện có.
3. WHEN người chơi trả lời đúng THEN hệ thống SHALL trao XP và/hoặc coin VÀ cập nhật mức thành thạo của từ đó.
4. WHEN người chơi trả lời sai THEN hệ thống SHALL hiển thị đáp án đúng kèm giải thích thân thiện, KHÔNG phạt nặng (phù hợp trẻ em).
5. IF không có nội dung quiz hợp lệ từ nguồn dữ liệu THEN hệ thống SHALL dùng quiz sinh từ word bank mặc định để không bao giờ hiển thị rỗng.

### Requirement 7: Nhiệm vụ học hằng ngày, XP, Coin & Streak (Daily Tasks & Rewards)

**User Story:** Là người học, tôi muốn có nhiệm vụ học mỗi ngày và chuỗi streak, để tạo thói quen học đều đặn.

#### Acceptance Criteria
1. THE hệ thống SHALL tạo một bộ nhiệm vụ học mỗi ngày (reset theo ngày), ví dụ "Học 5 từ", "Hoàn thành 1 quiz".
2. WHEN người chơi hoàn thành một nhiệm vụ ngày THEN hệ thống SHALL trao XP và/hoặc coin được định nghĩa cho nhiệm vụ đó.
3. WHEN người chơi hoàn thành ít nhất một mục tiêu học trong ngày THEN hệ thống SHALL tăng streak lên 1 (mỗi ngày tối đa +1).
4. IF người chơi bỏ lỡ một ngày không hoàn thành mục tiêu học THEN hệ thống SHALL đặt lại streak về 0.
5. THE streak hiện tại và streak dài nhất SHALL được lưu trong `user_progress` (tái dùng `current_streak`) và hiển thị cho người chơi.

### Requirement 8: Ôn tập & Lặp lại giãn cách (Word Review & Spaced Repetition)

**User Story:** Là người học, tôi muốn ôn lại các từ đến hạn theo lịch giãn cách, để ghi nhớ lâu dài.

#### Acceptance Criteria
1. THE hệ thống SHALL xác định các từ "đến hạn ôn" dựa trên `next_review_date` trong `vocabulary_items`.
2. WHEN người chơi mở chế độ ôn tập THEN hệ thống SHALL trình bày các từ đến hạn dưới dạng quiz ôn.
3. WHEN người chơi trả lời một từ ôn tập đúng THEN hệ thống SHALL tăng `interval_days`/`ease_factor` và dời `next_review_date` ra xa hơn theo thuật toán SRS.
4. WHEN người chơi trả lời một từ ôn tập sai THEN hệ thống SHALL rút ngắn khoảng ôn (đặt lại về khoảng ngắn) để gặp lại sớm.
5. THE thay đổi lịch SRS SHALL được lưu vào `vocabulary_items` để nhất quán với trang Progress/Review hiện có.

### Requirement 9: Phát âm & Luyện nghe (Pronunciation & Listening)

**User Story:** Là người học, tôi muốn nghe phát âm từ và làm bài luyện nghe, để cải thiện kỹ năng nghe-nói.

#### Acceptance Criteria
1. WHEN người chơi chạm vào biểu tượng loa cạnh một từ THEN hệ thống SHALL phát âm thanh phát âm của từ đó (Web Speech API hoặc audio có sẵn).
2. IF trình duyệt không hỗ trợ phát âm THEN hệ thống SHALL ẩn/disable nút loa một cách nhẹ nhàng mà không gây lỗi.
3. THE hệ thống SHALL cung cấp ít nhất một dạng bài luyện nghe: phát âm một từ rồi yêu cầu người chơi chọn từ/nghĩa đúng.
4. WHEN người chơi hoàn thành một bài luyện nghe THEN hệ thống SHALL chấm đúng/sai VÀ cập nhật tiến độ học như quiz thường.

### Requirement 10: Tích hợp AI Gemini (Dynamic AI Features)

**User Story:** Là người học, tôi muốn nội dung từ vựng/quiz đa dạng và độ khó phù hợp với mình, nhờ AI, để không bị nhàm và không bị quá tải.

#### Acceptance Criteria
1. THE hệ thống SHALL gọi Gemini API thông qua một API route server-side (vd `/api/games/farm/ai`); client SHALL KHÔNG bao giờ nhận hoặc gửi khóa API Gemini trực tiếp.
2. WHEN cần nội dung học mới mà nguồn tĩnh không đủ THEN hệ thống SHALL yêu cầu Gemini sinh từ vựng động (cặp Anh-Việt + ví dụ) theo chủ đề/cấp độ.
3. WHEN cần quiz mới THEN hệ thống SHALL yêu cầu Gemini sinh câu hỏi quiz hợp lệ (đúng định dạng `MCQuestion`) VÀ hệ thống SHALL validate trước khi dùng.
4. THE hệ thống SHALL điều chỉnh độ khó cá nhân hóa: WHEN người chơi trả lời đúng nhiều liên tiếp THEN tăng cấp độ từ/quiz; WHEN sai nhiều THEN giảm cấp độ.
5. IF Gemini không phản hồi, lỗi, hoặc trả nội dung không hợp lệ THEN hệ thống SHALL fallback về word bank/quiz tĩnh và KHÔNG làm gián đoạn gameplay.
6. THE các lời gọi AI SHALL được giới hạn tần suất (rate limit) phía server để kiểm soát chi phí (tái dùng `src/lib/rate-limit.ts`).

### Requirement 11: Lưu & khôi phục tiến trình (Save / Load)

**User Story:** Là người chơi, tôi muốn tiến trình nông trại và việc học của tôi được lưu, để tiếp tục ở lần chơi sau trên cùng tài khoản/thiết bị.

#### Acceptance Criteria
1. THE hệ thống SHALL lưu trạng thái game (nông trại, inventory, coin, XP/cấp, nhiệm vụ, từ vựng, streak) theo người dùng.
2. WHERE người dùng đã đăng nhập (Supabase) THEN hệ thống SHALL lưu vào Supabase (`user_progress`/`vocabulary_items` + payload game); WHERE người dùng ẩn danh THEN hệ thống SHALL lưu cục bộ (localStorage theo `device_id`).
3. WHEN người chơi mở lại game THEN hệ thống SHALL khôi phục trạng thái đã lưu gần nhất.
4. IF dữ liệu lưu bị hỏng hoặc không đọc được THEN hệ thống SHALL khởi tạo trạng thái mặc định mới mà không crash.
5. THE việc lưu SHALL không chặn (non-blocking) trải nghiệm chơi (lưu nền/định kỳ, không làm khựng game).

### Requirement 12: UI/UX hiện đại (Phase 3 — Modernization)

**User Story:** Là người chơi nhỏ tuổi, tôi muốn giao diện game đẹp, rõ ràng và phản hồi sinh động, để thấy hứng thú và dễ dùng.

#### Acceptance Criteria
1. THE game SHALL có HUD hiển thị coin, XP/cấp, streak và công cụ đang chọn, rõ ràng và đồng bộ phong cách Engkids (vui tươi, bo góc lớn, màu tươi sáng).
2. THE màn inventory, bảng nhiệm vụ, hội thoại NPC và màn tiến độ SHALL được trình bày trau chuốt với typography dễ đọc cho trẻ em.
3. WHEN một hành động quan trọng xảy ra (thu hoạch, lên cấp, trả lời đúng, nhận thưởng) THEN hệ thống SHALL phản hồi bằng animation/hiệu ứng thị giác (và âm thanh nếu có).
4. THE giao diện SHALL responsive: chơi được trên cả desktop và mobile (cảm ứng), tái dùng cách scale `Phaser.Scale.RESIZE` như các game hiện có.
5. THE hội thoại NPC SHALL hỗ trợ nội dung song ngữ Anh-Việt và nhấn mạnh từ vựng cần học.

### Requirement 13: Tích hợp vào nền tảng Engkids (Platform Integration)

**User Story:** Là người dùng Engkids, tôi muốn truy cập game nông trại từ phòng game như các game khác, để trải nghiệm liền mạch.

#### Acceptance Criteria
1. THE game SHALL truy cập được tại route `src/app/games/english-farm` và xuất hiện trong hub game (`src/app/games/page.tsx`) như một thẻ game.
2. THE assets của game SHALL nằm trong `public/games/english-farm/` theo đúng quy ước thư mục hiện có.
3. THE game SHALL nạp Phaser bằng dynamic import và dọn dẹp (`destroy`) khi unmount, theo đúng pattern của các game hiện có (không gây leak).
4. THE nội dung học cốt lõi (word bank) SHALL quản lý được qua admin panel hiện có, không cần công cụ riêng.
5. THE game SHALL không phá vỡ build, type-check, hoặc lint hiện có (`npm run build`, `npm run type-check`, `npm run lint` vẫn pass).

### Requirement 14: Chất lượng mã & bảo trì (Phase 4 — Refactoring discipline)

**User Story:** Là lập trình viên duy trì dự án, tôi muốn mã của game sạch, có cấu trúc và tài liệu, để dễ bảo trì và mở rộng.

#### Acceptance Criteria
1. THE logic game SHALL được tách thành các module/hệ thống rõ ràng (vd farming, inventory, vocabulary, quiz, save, ai-bridge) thay vì gộp hết vào một file khổng lồ.
2. THE mã SHALL dùng TypeScript với kiểu rõ ràng cho trạng thái game và dữ liệu học (hạn chế `any`).
3. THE các quy ước đặt tên, cấu trúc thư mục SHALL nhất quán với phần còn lại của `src/` (PascalCase component, camelCase hàm, v.v.).
4. THE các hệ thống cốt lõi (vd thuật toán SRS, tính XP/level, validate quiz) SHALL có test đơn vị nơi khả thi.
5. THE mã mới SHALL không lặp lại logic đã có (tái dùng `word-bank`, `game-content`, `progress`, `rate-limit`); WHERE có thể tái dùng THEN tái dùng thay vì viết lại.

### Requirement 15: Phát triển tăng dần & an toàn (Phase 5 — Incremental Development)

**User Story:** Là chủ dự án, tôi muốn game được xây từng bước nhỏ, kiểm thử và commit từng phần, để kiểm soát rủi ro và không có rewrite mất kiểm soát.

#### Acceptance Criteria
1. THE quá trình triển khai SHALL chia thành các bước nhỏ, mỗi bước tạo ra phần chạy được và kiểm thử được.
2. WHEN một bước hoàn tất THEN hệ thống SHALL ở trạng thái build/type-check/lint sạch trước khi sang bước kế tiếp.
3. THE mỗi thay đổi SHALL ưu tiên sửa/mở rộng hệ thống hiện có thay vì viết lại; KHÔNG thực hiện rewrite lớn không kiểm soát.
4. WHERE một thay đổi ảnh hưởng tệp khác THEN phạm vi ảnh hưởng SHALL được nêu rõ trước khi thực hiện.
5. THE các thay đổi quan trọng SHALL được commit theo từng phần có ý nghĩa (không gộp một commit khổng lồ).

---

## MVP Scope (đã chốt)

**Vòng 1 (MVP) — làm trước:** Farming (R1), Harvesting (trong R1), Inventory (R3 — phần kho đồ, KHÔNG gồm Shop/mua-bán ở MVP), Vocabulary collection & levels (R5), Quiz (R6), Save/Load (R11), cộng với các yêu cầu nền tảng bắt buộc: UI/UX (R12 ở mức cơ bản), Tích hợp Engkids (R13), Chất lượng mã (R14), Phát triển tăng dần (R15).

**Các vòng sau — hoãn lại:** Animal care (R2), Shops/mua-bán (phần còn lại R3), Quests/Progression/Achievements (R4), Daily tasks/Streak (R7), Spaced repetition (R8), Pronunciation/Listening (R9), AI Gemini (R10).

Lưu ý: ở MVP, các tiêu chí thuộc R3 chỉ áp dụng phần **inventory** (hiển thị, thêm/bớt vật phẩm, giới hạn slot, lưu trữ); các tiêu chí mua/bán cửa hàng để vòng sau. Tương tự, XP/Coin có thể xuất hiện tối thiểu để hỗ trợ quiz reward nhưng tiến cấp/achievement đầy đủ thuộc vòng sau.

## Quyết định mặc định cho các Open Questions

1. **MVP:** farming + harvesting + inventory + vocab + quiz + save (đã chốt ở trên).
2. **Art:** dùng asset CC0 thương mại (Kenney.nl) làm placeholder cho MVP; có thể thay art riêng sau. *(mặc định, xác nhận khi review nếu cần)*
3. **Gemini key:** hoãn — MVP chạy hoàn toàn bằng word bank tĩnh; AI để vòng sau.
4. **Lưu trữ:** dùng **bảng riêng `farm_saves`** (JSONB payload theo user/device) cho trạng thái nông trại; tái dùng `user_progress`/`vocabulary_items` cho phần học. *(mặc định)*
