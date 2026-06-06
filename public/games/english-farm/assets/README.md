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
