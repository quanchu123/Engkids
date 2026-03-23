# HƯỚNG DẪN NHANH - 3 PHÚT

## Bạn cần làm gì?

### 1. Truy cập Bunny.net
```
https://panel.bunny.net/register
```
→ Đăng ký tài khoản (miễn phí)

---

### 2. Tạo Video Library
- Vào **Stream** → Click **"Add Video Library"**
- Đặt tên: `comic-lingua-videos`
- **Copy Library ID** (con số ở góc trên)

📝 Ghi lại:
```
BUNNY_LIBRARY_ID = _______
```

---

### 3. Tạo API Key
- Click **Account** (góc phải) → **API**
- Click **"Add API Key"**
- Đặt tên: `comic-lingua-api`
- **Copy API Key** (chuỗi dài)

📝 Ghi lại:
```
BUNNY_API_KEY = ____________________
```

---

### 4. Lấy CDN Hostname
- Quay lại **Stream** → Click vào library vừa tạo
- Xem phần **Pull Zone**
- **Copy hostname** (vd: `vz-abc123.b-cdn.net`)

📝 Ghi lại:
```
BUNNY_CDN_HOSTNAME = ______________.b-cdn.net
```

---

### 5. Điền vào .env.local

Mở file: `comic-lingua-kids/.env.local`

Tìm phần Bunny.net và điền:

```env
BUNNY_API_KEY=paste_api_key_vào_đây
BUNNY_LIBRARY_ID=paste_library_id_vào_đây
NEXT_PUBLIC_BUNNY_LIBRARY_ID=paste_library_id_vào_đây
BUNNY_CDN_HOSTNAME=paste_cdn_hostname_vào_đây
```

**Lưu ý:** Không có dấu ngoặc, không có khoảng trắng

---

### 6. Kiểm tra

```bash
node check-bunny.js
```

Nếu OK → Thấy: ✅ HOÀN HẢO!

---

### 7. Chạy app

```bash
npm run dev
```

Truy cập: http://localhost:3000/admin/videos/new

---

## Gặp vấn đề?

Đọc file chi tiết: **LAY_API_BUNNY.md**

Hoặc chạy:
```bash
node check-bunny.js
```
để xem lỗi ở đâu.
