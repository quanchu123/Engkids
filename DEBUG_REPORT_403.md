# DEBUG REPORT: Lỗi 403 khi load thumbnail từ Bunny CDN

**Project:** `d:\Desktop\EngkidsEXE101\comic-lingua-kids`
**Date:** 2026-02-08
**Issue:** Thumbnails từ Bunny CDN trả về 403 Forbidden

---

## 1. KIỂM TRA ENV VARIABLES

### Kết quả:

- ✅ **BUNNY_CDN_HOSTNAME**: `vz-c47b1210-54e.b-cdn.net`
- ❌ **BUNNY_CDN_SECURITY_KEY**: **KHÔNG ĐƯỢC SET**
- ✅ **BUNNY_LIBRARY_ID**: `581761`
- ✅ **BUNNY_API_KEY**: Set (nhưng có vẻ không hợp lệ - 401 khi gọi API)

### Phân tích:

File `.env.example` có template cho `BUNNY_CDN_SECURITY_KEY`:

```env
# 4. CDN Security Key (OPTIONAL - only if Token Authentication is enabled)
# Found in: CDN -> Pull Zone -> Security -> Token Authentication -> Security Key
# Leave blank if not using token authentication
BUNNY_CDN_SECURITY_KEY=your_security_key_if_token_auth_enabled
```

Nhưng file `.env.local` **KHÔNG CÓ** biến này.

---

## 2. PHÂN TÍCH THUẬT TOÁN SIGNED URL

### Code Location: `src/services/bunny.ts`

#### Function `generateSignedUrl()` (lines 30-63):

```typescript
export function generateSignedUrl(url: string, expiresInSeconds: number = 86400): string {
  const { cdnSecurityKey } = getConfig();

  // If no security key configured, return original URL
  if (!cdnSecurityKey) {
    return url;  // ← RETURN URL GỐC nếu không có key
  }

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // Generate token: Base64(SHA256(security_key + path + expires))
    const hashableBase = cdnSecurityKey + path + expires;
    const hash = crypto.createHash('sha256').update(hashableBase).digest('base64');

    // Format token: replace special characters for base64url
    const token = hash
      .replace(/\n/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Add token and expires to URL
    urlObj.searchParams.set('token', token);
    urlObj.searchParams.set('expires', expires.toString());

    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to generate signed URL, using original:', error);
    return url;
  }
}
```

### Thuật toán:

1. **Hashable Base**: `security_key + path + expires`
2. **Hash**: `SHA256(hashableBase)` → Base64
3. **Token**: Convert Base64 → Base64URL (replace `+` → `-`, `/` → `_`, remove `=`)
4. **Final URL**: `original_url?token={token}&expires={timestamp}`

### Đánh giá:

✅ **Thuật toán ĐÚNG** theo Bunny.net Token Authentication spec:
- SHA256 hash ✓
- Base64URL encoding ✓
- URL query params `token` và `expires` ✓
- Path bao gồm leading `/` ✓

❌ **VẤN ĐỀ**: Nếu không có `cdnSecurityKey`, function return URL gốc **KHÔNG CÓ TOKEN**.

---

## 3. TEST THỰC TÉ

### Test với video từ database:

**Video ID**: `ade4e336-2c2d-4953-9960-e3bf0e3f86e0`
**Bunny Video ID**: `48c5a3c1-7ece-4773-91eb-315c11351d5d`
**Title**: "Doraemon English version 1 - English for Kids - Max&YuPi"

**Thumbnail URL (unsigned)**:
```
https://vz-c47b1210-54e.b-cdn.net/48c5a3c1-7ece-4773-91eb-315c11351d5d/thumbnail.jpg
```

### Kết quả fetch:

```
❌ Status: 403 Forbidden
```

### Test với mock security key:

Nếu có security key `my-secret-key-12345`, signed URL sẽ là:

```
https://vz-c47b1210-54e.b-cdn.net/abc123-test-video-id/thumbnail.jpg?token=w6AYARKUDNaofMwM_mdDB3GDir6hRm6MfUpsS2m_CJc&expires=1770650007
```

✅ Token được generate đúng format Base64URL
✅ Expires timestamp hợp lệ

---

## 4. FLOW HIỆN TẠI

### Khi load thumbnails:

1. **Frontend** (`VideoCard.tsx` line 97):
   ```tsx
   <img src={video.thumbnailUrl} alt={video.title} />
   ```

2. **Backend** (`video.ts` line 63-73):
   ```typescript
   function rowToVideo(row: VideoRow): Video {
     // Generate signed thumbnail URL if video is ready
     let thumbnailUrl = row.thumbnail_url || undefined;
     if (row.status === 'ready' && row.bunny_video_id) {
       try {
         thumbnailUrl = getSignedThumbnailUrl(row.bunny_video_id);
       } catch (error) {
         console.warn('Failed to generate signed thumbnail URL:', error);
       }
     }
     // ...
   }
   ```

3. **Bunny Service** (`bunny.ts` line 68-72):
   ```typescript
   export function getSignedThumbnailUrl(videoId: string, thumbnailFileName: string = 'thumbnail.jpg'): string {
     const { cdnHostname } = getConfig();
     const url = `https://${cdnHostname}/${videoId}/${thumbnailFileName}`;
     return generateSignedUrl(url);  // ← Gọi generateSignedUrl()
   }
   ```

4. **generateSignedUrl()**:
   - Check `cdnSecurityKey`
   - Nếu **KHÔNG CÓ** → return URL gốc
   - Nếu **CÓ** → sign URL với token

5. **Bunny CDN**:
   - Nhận request với URL không có token
   - Pull Zone có bật Token Authentication
   - **Reject với 403 Forbidden**

---

## 5. NGUYÊN NHÂN LỖI

### Root Cause:

**Pull Zone đã bật Token Authentication nhưng `BUNNY_CDN_SECURITY_KEY` không được set trong `.env.local`**

### Chi tiết:

1. Bunny Stream tự động tạo Pull Zone để deliver videos và thumbnails
2. Pull Zone này có hostname: `vz-c47b1210-54e.b-cdn.net`
3. Pull Zone đã bật Token Authentication (xác nhận bởi 403 response)
4. App không có security key → generate URL không có token
5. Bunny CDN reject requests không có valid token → 403

---

## 6. GIẢI PHÁP ĐỀ XUẤT

### Option 1: **Disable Token Authentication** (Đơn giản, nhanh)

**Ưu điểm:**
- Không cần config thêm
- Thumbnails public, dễ access
- Không ảnh hưởng đến performance

**Nhược điểm:**
- Thumbnails có thể bị hotlink
- Ít secure hơn

**Cách làm:**
1. Vào https://dash.bunny.net
2. Chọn **CDN → Pull Zones**
3. Tìm Pull Zone với hostname `vz-c47b1210-54e.b-cdn.net`
4. Click vào Pull Zone
5. Vào tab **Security**
6. **TẮT** "Token Authentication"
7. Save changes

**Kết quả:** Thumbnails sẽ hoạt động ngay lập tức với public URLs.

---

### Option 2: **Enable Token Authentication với Security Key** (Recommended, Secure)

**Ưu điểm:**
- Secure, prevent hotlinking
- Kiểm soát access tốt hơn
- Expire URLs tự động

**Nhược điểm:**
- Phải config security key
- URLs có expiry time

**Cách làm:**

#### Bước 1: Lấy Security Key từ Bunny Dashboard

1. Vào https://dash.bunny.net
2. Chọn **CDN → Pull Zones**
3. Tìm Pull Zone với hostname `vz-c47b1210-54e.b-cdn.net`
4. Click vào Pull Zone
5. Vào tab **Security**
6. Scroll xuống **Token Authentication**
7. Nếu chưa bật → bật lên
8. **Copy "Security Key"** (dạng hex string, ví dụ: `a1b2c3d4e5f6...`)

#### Bước 2: Thêm vào `.env.local`

Mở file `d:\Desktop\EngkidsEXE101\comic-lingua-kids\.env.local` và thêm:

```env
# Bunny.net CDN Security Key (for Token Authentication)
BUNNY_CDN_SECURITY_KEY=<paste_security_key_here>
```

**Ví dụ:**
```env
BUNNY_CDN_SECURITY_KEY=a1b2c3d4e5f67890abcdef1234567890
```

#### Bước 3: Restart dev server

```bash
# Ctrl+C để stop server hiện tại
npm run dev
```

#### Bước 4: Verify

Chạy test script:

```bash
node test-real-video.js
```

Kết quả mong đợi:
```
✅ Thumbnail accessible! Status: 200
   Content-Type: image/jpeg
```

---

## 7. VERIFY FIX

### Sau khi áp dụng fix, test bằng cách:

#### Option 1: Chạy test script

```bash
cd d:\Desktop\EngkidsEXE101\comic-lingua-kids
node test-real-video.js
```

#### Option 2: Check trong browser

1. Mở dev server: `npm run dev`
2. Vào http://localhost:3000/videos
3. Mở DevTools → Network tab
4. Filter "thumbnail.jpg"
5. Check response:
   - ✅ Status 200 → Success
   - ❌ Status 403 → Vẫn có vấn đề

#### Option 3: Direct cURL test

```bash
# Test unsigned URL (sẽ fail nếu token auth enabled)
curl -I "https://vz-c47b1210-54e.b-cdn.net/48c5a3c1-7ece-4773-91eb-315c11351d5d/thumbnail.jpg"

# Expected: 403 Forbidden (nếu token auth enabled)
```

---

## 8. CHECKLIST

Sau khi fix, kiểm tra:

- [ ] Thumbnails hiển thị trên trang Videos (`/videos`)
- [ ] Thumbnails hiển thị trên trang Home (`/`)
- [ ] Thumbnails hiển thị trong Admin panel (`/admin/videos`)
- [ ] Video detail page hoạt động bình thường
- [ ] Không có lỗi 403 trong Browser Console
- [ ] Không có warning "Failed to generate signed URL" trong server logs

---

## 9. NOTES

### API Key vs Security Key

- **BUNNY_API_KEY**: Dùng để authenticate với Bunny **API** (create/delete videos)
- **BUNNY_CDN_SECURITY_KEY**: Dùng để **sign URLs** cho CDN requests

Hai key này **HOÀN TOÀN KHÁC NHAU**, không thể dùng thay thế cho nhau.

### Code Quality

✅ Code xử lý signed URLs rất tốt:
- Có fallback nếu không có security key
- Try-catch để handle errors
- Console warning để debug
- Thuật toán đúng spec Bunny.net

### Security Best Practices

Nếu dùng Token Authentication:
- ✅ Security key được lưu server-side only (không `NEXT_PUBLIC_`)
- ✅ Tokens có expiry time (default 24h)
- ✅ URLs tự động expire, không bị reuse

---

## 10. SUMMARY

| Item | Status | Details |
|------|--------|---------|
| **BUNNY_CDN_HOSTNAME** | ✅ Set | `vz-c47b1210-54e.b-cdn.net` |
| **BUNNY_CDN_SECURITY_KEY** | ❌ NOT SET | Thiếu trong `.env.local` |
| **Signed URL Algorithm** | ✅ Correct | Đúng format Bunny.net |
| **Code Quality** | ✅ Good | Có fallback và error handling |
| **Test Result** | ❌ 403 Forbidden | Pull Zone có Token Auth enabled |
| **Root Cause** | ❌ Missing Key | Không có security key để sign URLs |

**RECOMMENDED FIX**: Thêm `BUNNY_CDN_SECURITY_KEY` vào `.env.local` (Option 2)

**ALTERNATIVE FIX**: Tắt Token Authentication trong Bunny Dashboard (Option 1)

---

**End of Report**
