# Quick Fix Guide: 403 Thumbnail Error

## 🔍 Problem

Thumbnails từ Bunny CDN trả về **403 Forbidden** vì Pull Zone đã bật Token Authentication nhưng thiếu `BUNNY_CDN_SECURITY_KEY`.

## ⚡ Quick Fix (Choose One)

### Option 1: Add Security Key (Recommended)

1. **Vào Bunny Dashboard:**
   - https://dash.bunny.net
   - CDN → Pull Zones → `vz-c47b1210-54e.b-cdn.net`
   - Security → Token Authentication → Copy "Security Key"

2. **Thêm vào `.env.local`:**
   ```env
   BUNNY_CDN_SECURITY_KEY=<paste_your_security_key>
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

### Option 2: Disable Token Auth

1. Vào Bunny Dashboard → CDN → Pull Zones → `vz-c47b1210-54e.b-cdn.net`
2. Security → Token Authentication → **TẮT**
3. Save

## ✅ Verify Fix

Run test script:
```bash
node test-real-video.js
```

Expected: `✅ Thumbnail accessible! Status: 200`

## 📄 Full Report

Xem chi tiết phân tích trong [DEBUG_REPORT_403.md](./DEBUG_REPORT_403.md)

## 🛠️ Test Scripts

- `test-bunny-signed-url.js` - Test signed URL algorithm
- `test-real-video.js` - Test với video thật từ DB
- `check-stream-library.js` - Check Stream Library config

---

**TL;DR:** Thêm `BUNNY_CDN_SECURITY_KEY` vào `.env.local` hoặc tắt Token Authentication trong Bunny Dashboard.
