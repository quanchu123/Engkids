# Implementation Plan — Admin Theme Redesign

## Overview

Kế hoạch triển khai redesign theme admin theo design-first. Thứ tự: dựng nền tảng token/primitives trước (task 1–2), rồi áp dụng cho layout/sidebar (task 3), refactor từng trang (task 4–9), tích hợp Iconscout với fallback (task 10), cuối cùng kiểm tra & nghiệm thu (task 11). Tất cả thay đổi là lớp trình bày — không đụng logic nghiệp vụ.

## Tasks

- [x] 1. Thiết lập design token & primitives trong `globals.css`
  - Thêm khối token `--admin-*` (brand, surface, border, text, status, shadow, radius) scope trong `.admin-theme` gần `:root`.
  - Thêm `@layer components` các primitive: `.admin-card`, `.admin-btn` + biến thể (`primary`/`secondary`/`ghost`/`danger`), `.admin-badge` + biến thể, `.admin-tab`/`.admin-tab-active`, `.admin-stat-icon`.
  - Chuẩn hóa `.admin-input` hiện có để dùng token.
  - **Gỡ bỏ** toàn bộ khối override `!important` của `.admin-theme` (`.admin-theme .bg-white`, `.text-slate-*`, `tr:hover`, ...).
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Mở rộng `tailwind.config.js` map token
  - Thêm `colors.admin.*` (primary, primary-strong, surface, surface-muted, border, border-accent, text, text-muted, success, warning, danger, info) tham chiếu `var(--admin-*)`.
  - Thêm `boxShadow['admin-sm'|'admin-md'|'admin-lg']`.
  - Giữ nguyên các color/shadow `kid`/`primary`/`secondary`/`accent` hiện có.
  - _Requirements: 3.1, 3.2_

- [x] 3. Áp token cho layout & sidebar
  - [x] 3.1 `src/app/admin/layout.tsx`: dùng `--admin-bg` cho nền (bỏ gradient hardcode), giữ `ml-64`.
    - _Requirements: 1.1, 4.2_
  - [x] 3.2 `src/components/layout/AdminSidebar.tsx`: logo gradient theo `--admin-gradient`, nút "Thêm truyện" dùng `.admin-btn-primary`, item active dùng gradient token + `shadow-admin-md`, item thường dùng token text/hover, viền `border-admin-border`.
    - _Requirements: 1.1, 1.2, 6.2_

- [x] 4. Refactor trang Dashboard truyện `src/app/admin/page.tsx`
  - Header card, CTA, stat card, search input, badge published/draft, nút Sửa/Xóa → dùng primitives & token.
  - Giữ nguyên `useEffect`, `handleDeleteStory`, `filteredStories`.
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 5.1, 5.2_

- [x] 5. Refactor trang Video & Nhạc `src/app/admin/videos/page.tsx`
  - Header/CTA/stat/search/tab/status-filter → primitives.
  - `statusBadge()` trả về class primitive (`admin-badge admin-badge-{success|danger|warning|info}`).
  - `StatCard` dùng `admin-card` + `admin-stat-icon`.
  - Giữ nguyên `loadVideos`, polling, `handleDelete/handleSyncStatus/handleForceReady`.
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2_

- [x] 6. Refactor trang Game `src/app/admin/games/page.tsx`
  - Bỏ wrapper `min-h-screen bg-gray-50`; dùng header card + grid card theo token; bỏ `text-blue-600`.
  - _Requirements: 1.1, 1.3, 4.3, 5.1_

- [x] 7. Refactor editor Game `src/app/admin/games/[type]/page.tsx`
  - Bỏ `min-h-screen bg-gray-50`; header card; tab độ khó dùng pill `admin-tab`; card câu hỏi `admin-card`; input `admin-input`; nút "+ Thêm câu hỏi" (success) và "Lưu" (`admin-btn-primary`); highlight đáp án đúng theo emerald token.
  - Giữ nguyên `McEditor`, `TfEditor`.
  - _Requirements: 1.1, 1.3, 2.1, 5.1, 5.2_

- [x] 8. Refactor trang Nhạc nền `src/app/admin/music/page.tsx` (+ bugfix layout)
  - Bỏ `min-h-screen bg-gray-50`; card trạng thái/upload `admin-card`; nút bật/tắt, upload, lưu, hoàn tác theo token; input file tint theo `--admin-primary`.
  - **Sửa sticky bar `left-56` → `left-64`**; nền `bg-admin-surface/95 backdrop-blur`, viền `border-admin-border`.
  - Giữ nguyên upload/auth/save logic.
  - _Requirements: 1.1, 1.3, 4.1, 4.3, 5.1, 5.2_

- [x] 9. Đồng bộ `error.tsx` & `loading.tsx`
  - `src/app/admin/error.tsx`: nút theo token, nền `--admin-bg`.
  - `src/app/admin/loading.tsx`: skeleton dùng `bg-admin-surface-muted`, card `admin-card`.
  - _Requirements: 1.1, 1.2_

- [x] 10. Tích hợp Iconscout tải sẵn + fallback (progressive enhancement)
  - [x] 10.1 Thêm `public/assets/iconscout/manifest.json` mặc định `{ "results": [] }` để build an toàn khi chưa chạy script.
    - _Requirements: 7.2_
  - [x] 10.2 Tạo `src/config/admin-icons.ts` đọc manifest an toàn (try/catch) + mapping key admin → asset.
    - _Requirements: 7.2, 7.3_
  - [x] 10.3 Tạo `src/components/admin/AdminIcon.tsx`: ưu tiên asset Iconscout, fallback lucide; áp dụng cho sidebar nav & stat card.
    - _Requirements: 7.2, 7.3_
  - [x] 10.4 Mở rộng query trong `scripts/download-iconscout-assets.js` (stories, videos, games, music, dashboard, upload) — chỉ chạy khi có credentials, không commit secret.
    - _Requirements: 7.1, 7.4_

- [x] 11. Kiểm tra & nghiệm thu
  - Chạy `npm run type-check` và `npm run lint` đảm bảo không lỗi mới.
  - Smoke test thủ công các trang admin (đồng bộ màu, không vỡ layout, sticky bar music thẳng hàng).
  - _Requirements: 5.3, 6.1, 6.2, 6.3_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3"] },
    { "wave": 3, "tasks": ["4", "5", "6", "7", "8", "9", "10.1", "10.4"] },
    { "wave": 4, "tasks": ["10.2"] },
    { "wave": 5, "tasks": ["10.3"] },
    { "wave": 6, "tasks": ["11"] }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": ["1", "2"],
    "4": ["3"],
    "5": ["3"],
    "6": ["3"],
    "7": ["3"],
    "8": ["3"],
    "9": ["3"],
    "10.1": [],
    "10.2": ["10.1"],
    "10.3": ["10.2", "3"],
    "10.4": [],
    "11": ["4", "5", "6", "7", "8", "9", "10.3", "10.4"]
  }
}
```

```
1 (tokens/primitives) ──┬─> 3 (layout/sidebar) ──> 4,5,6,7,8,9 (refactor pages)
2 (tailwind map) ───────┘                              │
                                                       ▼
10 (Iconscout: 10.1 -> 10.2 -> 10.3, 10.4 song song) ──┐
                                                       ▼
                                              11 (kiểm tra & nghiệm thu)
```

- Task 1 và 2 độc lập, chạy trước; cùng là nền tảng cho mọi task sau.
- Task 3 phụ thuộc 1, 2.
- Task 4–9 phụ thuộc 1, 2, 3 (có thể làm tuần tự hoặc song song).
- Task 10.1 → 10.2 → 10.3 tuần tự; 10.4 độc lập (chỉ cần script + credentials).
- Task 11 phụ thuộc tất cả task trước.

## Notes

- Không thay đổi data model, API, hay auth — chỉ className/CSS.
- Iconscout là progressive enhancement: thiếu credentials/asset thì fallback lucide, build vẫn chạy.
- Secrets Iconscout không commit vào repo.
- Sau khi hoàn tất và kiểm tra sạch, commit và push lên nhánh mới (không push thẳng main).

