# English Farm — 2D art drop zone (Unity Asset Store → Phaser)

Thả các file **PNG sprite** (2D, top-down/isometric, cartoon) vào thư mục này:
`public/games/english-farm/assets/`

## Tải pack nào trên Unity Asset Store

- Lên **assetstore.unity.com** → lọc **2D** + **Free** → tìm "farm", "top down farm", "isometric farm", "farm crops".
- ⚠️ Cần **góc nhìn top-down hoặc isometric** (KHÔNG lấy platformer side-view).
- Ưu tiên pack 2D sprite ghi rõ cho dùng trong project của bạn (license rộng). Tránh pack ràng buộc "Unity only".

## Mình cần những sprite gì (đặt tên đúng để mình tự ráp)

Đặt tên file theo đúng các key dưới (PNG, nền trong suốt). Thiếu cái nào mình tự fallback sang bộ Icons8 đã có, không sao.

Cây trồng (mỗi loại 1 file, hoặc kèm các frame lớn dần `*-1..-4`):
- `carrot.png`, `tomato.png`, `corn.png`, `pumpkin.png`, `strawberry.png`, `potato.png`
- mầm chung: `sprout.png`, `leaf.png`

Mặt đất / ô (nếu pack có — rất quý):
- `tile-grass.png` (ô cỏ), `tile-soil.png` (ô đất cày), `tile-wet.png` (ô đất ướt)
- nếu là tile vuông top-down cũng được; isometric (hình thoi) càng tốt.

Nhân vật + động vật:
- `farmer.png` (đứng) — nếu có spritesheet đi 4 hướng thì đặt `farmer-walk.png` + cho mình biết số frame.
- `cow.png`, `chicken.png`
- `dreamina-2026-06-08-8213.png` (pet companion mới cho farm) — đặt file này vào đây thì farm tự hiển thị cạnh ruộng.

Nhà / cảnh vật:
- `barn.png`, `tree.png`, `fence.png`, `well.png` (nếu có)

UI / hiệu ứng:
- `coins.png`, `star.png`, `watering-can.png`, `shovel.png`, `water.png`

## Cách thả

1. Giải nén / mở pack, lấy các PNG cần.
2. Copy vào `public/games/english-farm/assets/` với tên như trên.
3. Nhắn "xong". Mình sẽ ưu tiên dùng art trong `assets/`; thiếu thì fallback bộ Icons8 ở `../iso/`.

## Ghi chú
- Game render bằng **Phaser (web)**, nhẹ, chạy mobile tốt, nối thẳng vào vocab/quiz/SRS/save.
- Mình đang dựng engine isometric trước bằng bộ Icons8 (`public/games/english-farm/iso/`) để có cái chơi ngay; art của bạn sẽ thay vào sau, không phải làm lại.
- Nhớ ghi credit tác giả pack (nếu license yêu cầu).

---

## Quy ước đặt tên (đợt nâng cấp)

Game tự ráp asset theo `spriteKey` của mỗi cây trong `src/game/farm/data/crops.ts`. Đặt tên đúng theo quy ước dưới đây (PNG nền trong suốt, trừ tile đất giữ vuông):

- **Sprite chính của cây:** `<cropId>.png` — ví dụ `carrot.png`, `eggplant.png`, `watermelon.png`.
- **Frame lớn dần (tùy chọn):** `<cropId>-1.png`, `<cropId>-2.png`, `<cropId>-3.png`, `<cropId>-4.png` — mầm nhỏ → cây non → cây trưởng thành → chín sẵn sàng thu hoạch. Scene map stage → bucket `-1/-2/-3`.
- **Tile đất:** `tile-grass.png` (ô cỏ), `tile-soil.png` (ô đất cày), `tile-wet.png` (ô đất ướt). KHÔNG cắt padding — giữ hình vuông.
- **Cutscene video:** `cutscenes/<id>.mp4` với `id ∈ { big-harvest, level-up, season-change }` → đặt vào `public/games/english-farm/cutscenes/`.

Thiếu file nào → game tự fallback (Icons8 ở `../iso/` → emoji → CSS particle), không crash.

## Dreamina pack mới: `dreamina-2026-06-08-8213`

File farm cần đặt đúng tên:

- `public/games/english-farm/assets/dreamina-2026-06-08-8213.png`

Prompt tạo companion cho farm:

```
A cute magical farm companion pet for a children's English learning farming game,
top-down three-quarter view, full body, friendly big eyes, soft rounded shape,
bright cheerful colors, clean thick outline, premium 2D/3D cartoon game asset,
matching a sunny vegetable farm, centered, isolated on a fully transparent
background, no shadow, no text, no watermark. The pet should look helpful and
small enough to stand beside crop tiles, not scary, suitable for children aged
5-10. Export as dreamina-2026-06-08-8213.png.
```

Prompt tạo animation idle nếu Dreamina hỗ trợ video/spritesheet:

```
Animate the cute magical farm companion pet in a short idle loop for a children's
farming game: gentle breathing, tiny hop, happy blink, small sparkle particles,
subtle tail/ear motion, no movement across the screen, transparent or simple
green farm background, no text, no watermark, seamless loop, 2-3 seconds.
```

Nếu xuất spritesheet, đặt tên `dreamina-2026-06-08-8213-idle.png` và báo số frame
để mình nối animation frame-by-frame. Nếu xuất video, đặt vào
`public/games/english-farm/cutscenes/dreamina-2026-06-08-8213-idle.mp4`.

## Prompt template Dreamina (asset rau củ 2D top-down, nền trong suốt)

Thay `<ENGLISH_NAME>` bằng tên tiếng Anh của cây và `<cropId>` bằng id (ví dụ `eggplant`):

```
A cute 2D cartoon <ENGLISH_NAME> for a children's farming game, top-down front view,
soft rounded shapes, bright cheerful colors, thick clean outline, flat shading,
centered, isolated on a fully transparent background, no shadow, no text,
game asset sprite, high detail. Variants for growth: small sprout -> medium plant
-> mature <ENGLISH_NAME> ready to harvest (export as <cropId>-1.png .. <cropId>-4.png).
```

## Prompt template Veo 3 (cutscene cột mốc — tạo offline)

Dùng để tạo 3 video cutscene ngắn (English, no text/no watermark). Với `season-change`, thay `<PREV_THEME>`/`<NEXT_THEME>` bằng cặp mùa mong muốn (mặc định spring → summer):

```
big-harvest:    "Animate a joyful kids farming game reward: a cute cartoon farmer lifts a giant
                 basket overflowing with colorful vegetables, golden sparkles burst, confetti,
                 gentle camera push in, bright sunny 2D cartoon, no text, no watermark."
level-up:       "Animate a cheerful level-up celebration on a cartoon farm: glowing stars and
                 a big golden badge rise, light rays, happy sparkles, gentle zoom, no text, no watermark."
season-change:  "Animate a smooth season transition over a cartoon vegetable field: from <PREV_THEME>
                 to <NEXT_THEME>, soft cross-fade of colors and weather, gentle camera pan, no text, no watermark."
```

## Chạy script sau khi thêm asset

- **Sau khi thêm PNG cây:** chạy `node scripts/trim-farm-assets.mjs` để cắt padding trong suốt (tile đất đã được loại trừ, giữ vuông).
- **Tạo cutscene offline:** chạy `node scripts/gen-veo-farm.mjs` để sinh `cutscenes/<id>.mp4` + `cutscenes/manifest.json` bằng Veo 3.
  - Cần `GEMINI_API_KEY` (hoặc `GOOGLE_API_KEY`, `gemini_key1`, `gemini_key2`) trong env hoặc `.env.local`.
  - Tạo lại từng cái: `node scripts/gen-veo-farm.mjs big-harvest` (hoặc `--only level-up,season-change`).
  - Script **chỉ chạy offline thủ công** — game KHÔNG gọi Veo/Gemini lúc chạy; runtime chỉ phát file `.mp4` cục bộ, thiếu video thì fallback CSS/particle.
