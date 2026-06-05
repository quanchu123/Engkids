# Design Document — Admin Theme Redesign

## Overview

Mục tiêu: làm lại theme của admin panel cho **đẹp, hiện đại, nhất quán** mà không thay đổi logic nghiệp vụ (CRUD, upload, auth). Đây là một feature thuần UI/UX + design-system.

Vấn đề cốt lõi hiện tại **không phải** là "thiếu màu đẹp", mà là **thiếu nhất quán và thiếu hệ thống màu tập trung**:

- Dashboard truyện (`admin/page.tsx`) và Video (`admin/videos/page.tsx`) đã hiện đại: `rounded-2xl`, badge pill, sidebar gradient tím–fuchsia.
- Nhưng `admin/games/page.tsx`, `admin/games/[type]/page.tsx`, `admin/music/page.tsx`, `admin/error.tsx` vẫn dùng style cũ: `bg-gray-50`, `bg-blue-600`, `rounded-lg`, `text-blue-600`. Hai phong cách đá nhau → cảm giác "xấu" và chắp vá.
- `globals.css` dùng nhiều override `!important` cho `.admin-theme` (vd `.admin-theme .bg-white`), khó bảo trì và làm màu bị đục do `backdrop-filter: blur(18px)` áp quá rộng.
- Màu hardcode rải rác, không có design token → mỗi trang một kiểu.
- Bug nhỏ: music page sticky bar dùng `left-56` trong khi sidebar rộng `w-64` (`left-64`) → lệch 32px.

Giải pháp: định nghĩa **một bộ design token tập trung** (CSS variables + Tailwind), refactor toàn bộ trang admin để dùng chung token và component pattern, và **gỡ bỏ các override `!important`** dễ vỡ.

### Goals

1. Bộ màu hiện đại, trẻ trung, có chiều sâu (indigo/violet làm chủ đạo, accent sky + amber/emerald cho trạng thái).
2. Nhất quán 100% giữa tất cả các trang admin (cùng card, button, input, badge, tab).
3. Dễ bảo trì: đổi 1 biến → đổi toàn theme. Không dùng `!important`.
4. Không đổi hành vi: mọi route, API call, state đều giữ nguyên.
5. Accessibility: contrast đạt WCAG AA cho text, focus ring rõ ràng, touch target ≥ 44px (đã có sẵn `min-h-[44px]`).

### Non-Goals

- Không đổi cấu trúc dữ liệu, API, hay auth.
- Không thêm dark mode trong phạm vi này (nhưng token sẽ thiết kế sẵn sàng để mở rộng sau).
- Không đụng tới UI phía người dùng (stories/videos/games công khai), chỉ `/admin/*`.

---

## Architecture

High-Level Design — kiến trúc tổng thể của theme system (token → Tailwind → primitives → pages).

### 1. Kiến trúc theme

```
┌─────────────────────────────────────────────────────────┐
│  globals.css  →  :root .admin-theme { --admin-* tokens }  │
│  (single source of truth: màu, shadow, radius, surface)   │
└───────────────┬───────────────────────────────────────────┘
                │ tham chiếu qua
                ▼
┌─────────────────────────────────────────────────────────┐
│  tailwind.config.js  →  colors.admin.* + boxShadow.admin  │
│  (map token → Tailwind utilities: bg-admin-surface, ...)  │
└───────────────┬───────────────────────────────────────────┘
                │ dùng bởi
                ▼
┌─────────────────────────────────────────────────────────┐
│  Admin UI primitives (class patterns dùng lại)            │
│  .admin-card / .admin-btn / .admin-input / .admin-badge   │
└───────────────┬───────────────────────────────────────────┘
                │ áp dụng trong
                ▼
┌─────────────────────────────────────────────────────────┐
│  Pages: layout, page, videos, games, games/[type],        │
│         music, error, loading + AdminSidebar              │
└─────────────────────────────────────────────────────────┘
```

Nguyên tắc: **token-driven**. Component không hardcode màu thô (`violet-600`, `gray-50`...) mà dùng class theo token (`bg-admin-accent`, `admin-card`, `admin-btn-primary`). Khi muốn đổi tông màu cả admin → chỉ sửa token trong `globals.css`/`tailwind.config.js`.

### 2. Bảng màu đề xuất (palette)

Tông chủ đạo: **Indigo → Violet** gradient (giữ DNA tím sẵn có nhưng tinh tế hơn), nền sáng trung tính ấm, accent rõ ràng cho trạng thái.

| Vai trò | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Brand primary | `--admin-primary` | `#6366f1` (indigo-500) | nút chính, link active |
| Brand primary strong | `--admin-primary-strong` | `#4f46e5` (indigo-600) | hover nút chính |
| Brand gradient | `--admin-gradient` | `linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)` | logo, sidebar active, CTA |
| Surface (card) | `--admin-surface` | `#ffffff` | card, panel |
| Surface muted | `--admin-surface-muted` | `#f8fafc` | input bg, hàng hover |
| App background | `--admin-bg` | `linear-gradient(135deg,#eef2ff,#faf5ff,#fdf4ff)` | nền toàn trang admin |
| Border | `--admin-border` | `#e2e8f0` | viền card/input |
| Border accent | `--admin-border-accent` | `#c7d2fe` | viền focus/nhấn |
| Text strong | `--admin-text` | `#0f172a` (slate-900) | tiêu đề |
| Text muted | `--admin-text-muted` | `#64748b` (slate-500) | phụ đề |
| Success | `--admin-success` | `#10b981` (emerald-500) | ready, published |
| Warning | `--admin-warning` | `#f59e0b` (amber-500) | processing, cảnh báo |
| Danger | `--admin-danger` | `#ef4444` (red-500) | xóa, lỗi |
| Info | `--admin-info` | `#0ea5e9` (sky-500) | trạng thái phụ |

Shadow mềm, có hơi tím để tạo chiều sâu nhưng không đục:

| Token | Giá trị |
|---|---|
| `--admin-shadow-sm` | `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(99,102,241,.08)` |
| `--admin-shadow-md` | `0 4px 12px rgba(15,23,42,.06), 0 2px 6px rgba(99,102,241,.10)` |
| `--admin-shadow-lg` | `0 12px 32px rgba(79,70,229,.14), 0 4px 12px rgba(15,23,42,.08)` |

Radius: thống nhất `rounded-xl` (12px) cho control, `rounded-2xl` (16px) cho card.

### 3. UI primitives (class patterns)

Định nghĩa trong `globals.css` dưới `@layer components` để dùng lại, giảm lặp class:

- `.admin-card` — card nền surface, border, shadow-sm, radius-2xl.
- `.admin-card-pad` — card + padding chuẩn.
- `.admin-btn` (base) + biến thể: `.admin-btn-primary` (gradient), `.admin-btn-secondary` (outline), `.admin-btn-ghost`, `.admin-btn-danger`.
- `.admin-input` — đã có sẵn, chuẩn hóa lại theo token.
- `.admin-badge` + `.admin-badge-{success|warning|danger|info|neutral}`.
- `.admin-tab` / `.admin-tab-active` — dùng cho tab Video/Nhạc và tab độ khó game.
- `.admin-stat-icon` — ô icon vuông bo góc cho stat card.

### 4. Phạm vi thay đổi theo file

| File | Loại thay đổi |
|---|---|
| `globals.css` | Thêm `:root`/`.admin-theme` tokens + `@layer components` primitives; **gỡ** khối override `!important` cũ |
| `tailwind.config.js` | Thêm `colors.admin.*`, `boxShadow.admin-*`, map từ CSS vars |
| `src/app/admin/layout.tsx` | Dùng `--admin-bg` qua class token, bỏ gradient hardcode |
| `src/components/layout/AdminSidebar.tsx` | Áp token gradient, active state, hover; tinh chỉnh |
| `src/app/admin/page.tsx` | Thay class thô → primitives (`admin-card`, `admin-btn-primary`, `admin-badge-*`) |
| `src/app/admin/videos/page.tsx` | Như trên + StatCard, tab, status badge dùng token |
| `src/app/admin/games/page.tsx` | **Refactor lớn**: bỏ `bg-gray-50/blue-600`, theo theme mới |
| `src/app/admin/games/[type]/page.tsx` | **Refactor lớn**: editor, tab độ khó, nút save theo theme |
| `src/app/admin/music/page.tsx` | **Refactor lớn** + fix sticky bar `left-56` → `left-64` |
| `src/app/admin/error.tsx` | Đồng bộ nút/nền theo token |
| `src/app/admin/loading.tsx` | Skeleton theo surface/border token |
| `scripts/download-iconscout-assets.js` | Mở rộng query cho icon admin (nav, stat) — dùng lại script có sẵn |
| `src/config/admin-icons.ts` (mới) | Mapping icon: ưu tiên asset Iconscout nếu có, fallback lucide |

### 4b. Tích hợp Iconscout (tải sẵn, fallback an toàn)

Quyết định: **tải asset 1 lần** bằng script có sẵn (`scripts/download-iconscout-assets.js` → `npm run iconscout:download`), lưu tĩnh vào `public/assets/iconscout/` + `manifest.json`. **Không** gọi Iconscout API lúc runtime (tránh chậm, tốn credit, rate limit).

Nguyên tắc **progressive enhancement**:

- Theme phải hoạt động đầy đủ với `lucide-react` (đã có sẵn) **kể cả khi chưa tải asset Iconscout**.
- Khi `public/assets/iconscout/manifest.json` tồn tại và có asset cho 1 key → admin dùng icon 3D đó (sidebar nav, stat card, empty-state). Nếu không → fallback lucide icon hiện tại.
- Credentials `ICONSCOUT_CLIENT_ID` / `ICONSCOUT_CLIENT_SECRET` set trong shell/`.env.local` khi chạy script (không commit). Script đã có logic skip an toàn nếu thiếu secret.

Helper `src/config/admin-icons.ts`:

```ts
// Đọc manifest tĩnh (import JSON) để biết asset nào có sẵn.
// Trả về { type: 'image', src } nếu có Iconscout asset, ngược lại { type: 'lucide', Icon }.
// Component AdminIcon render <img> hoặc <LucideIcon> tương ứng.
```

Query bổ sung cho script (qua `ICONSCOUT_QUERIES` hoặc default mở rộng): `stories`, `videos`, `games`, `music`, `dashboard`, `upload` — phong cách "3d flat icon" đồng tông với palette.

Lưu ý license: Iconscout asset có ràng buộc bản quyền theo gói tài khoản của bạn — chỉ dùng trong app này, không redistribute. Việc tải về tĩnh là hợp lệ với tài khoản có quyền download.

### 5. Trải nghiệm sau redesign

- Sidebar: nền sáng kính nhẹ, logo gradient indigo→fuchsia, item active có gradient + shadow, hover mượt.
- Mỗi trang: header card thống nhất (eyebrow nhỏ in hoa + tiêu đề đậm + mô tả), CTA gradient bên phải.
- Card/stat/badge/button đồng bộ tuyệt đối giữa các trang.
- Trạng thái màu rõ nghĩa: ready=emerald, processing/uploading=amber, error=red, info=sky.

---

## Components and Interfaces

Low-Level Design — chi tiết từng file, class pattern, và mapping cụ thể.

### 1. CSS tokens & primitives (`src/app/globals.css`)

Thêm khối token (đặt gần `:root`, scope `.admin-theme` để không rò rỉ ra UI người dùng):

```css
.admin-theme {
  /* Brand */
  --admin-primary: #6366f1;
  --admin-primary-strong: #4f46e5;
  --admin-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);

  /* Surfaces */
  --admin-bg: linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #fdf4ff 100%);
  --admin-surface: #ffffff;
  --admin-surface-muted: #f8fafc;

  /* Lines & text */
  --admin-border: #e2e8f0;
  --admin-border-accent: #c7d2fe;
  --admin-text: #0f172a;
  --admin-text-muted: #64748b;

  /* Status */
  --admin-success: #10b981;
  --admin-warning: #f59e0b;
  --admin-danger: #ef4444;
  --admin-info: #0ea5e9;

  /* Elevation */
  --admin-shadow-sm: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(99,102,241,.08);
  --admin-shadow-md: 0 4px 12px rgba(15,23,42,.06), 0 2px 6px rgba(99,102,241,.10);
  --admin-shadow-lg: 0 12px 32px rgba(79,70,229,.14), 0 4px 12px rgba(15,23,42,.08);

  --admin-radius: 0.75rem;   /* 12px control */
  --admin-radius-lg: 1rem;   /* 16px card   */
}
```

Primitives trong `@layer components`:

```css
@layer components {
  .admin-card {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-radius-lg);
    box-shadow: var(--admin-shadow-sm);
  }

  .admin-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
    min-height: 44px; padding: 0 1rem; border-radius: var(--admin-radius);
    font-size: .875rem; font-weight: 800; transition: all .15s ease;
  }
  .admin-btn-primary {
    color: #fff; background: var(--admin-gradient);
    box-shadow: var(--admin-shadow-md);
  }
  .admin-btn-primary:hover { transform: translateY(-1px); box-shadow: var(--admin-shadow-lg); }
  .admin-btn-secondary {
    color: var(--admin-text); background: var(--admin-surface);
    border: 1px solid var(--admin-border);
  }
  .admin-btn-secondary:hover { background: var(--admin-surface-muted); }
  .admin-btn-danger {
    color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca;
  }
  .admin-btn-danger:hover { background: #fee2e2; }

  .admin-badge {
    display: inline-flex; align-items: center;
    border-radius: 9999px; padding: .25rem .625rem;
    font-size: .75rem; font-weight: 800;
  }
  .admin-badge-success { background:#ecfdf5; color:#047857; }
  .admin-badge-warning { background:#fffbeb; color:#b45309; }
  .admin-badge-danger  { background:#fef2f2; color:#b91c1c; }
  .admin-badge-info    { background:#f0f9ff; color:#0369a1; }
  .admin-badge-neutral { background:#f1f5f9; color:#475569; }

  .admin-tab {
    display:inline-flex; align-items:center; gap:.5rem;
    min-height:40px; padding:0 1rem; border-radius:.5rem;
    font-size:.875rem; font-weight:800; color: var(--admin-text-muted);
    transition: all .15s ease;
  }
  .admin-tab-active { background: var(--admin-surface); color: var(--admin-primary-strong); box-shadow: var(--admin-shadow-sm); }
}
```

Chỉnh `.admin-input` hiện có để dùng token (`--admin-border`, `--admin-primary`). **Xóa** toàn bộ khối override `!important` (các selector `.admin-theme .bg-white`, `.admin-theme .text-slate-*`, `.admin-theme tr:hover`...).

### 2. Tailwind config (`tailwind.config.js`)

Bổ sung trong `theme.extend`:

```js
colors: {
  // ...giữ nguyên primary/secondary/accent/kid...
  admin: {
    primary: 'var(--admin-primary)',
    'primary-strong': 'var(--admin-primary-strong)',
    surface: 'var(--admin-surface)',
    'surface-muted': 'var(--admin-surface-muted)',
    border: 'var(--admin-border)',
    'border-accent': 'var(--admin-border-accent)',
    text: 'var(--admin-text)',
    'text-muted': 'var(--admin-text-muted)',
    success: 'var(--admin-success)',
    warning: 'var(--admin-warning)',
    danger: 'var(--admin-danger)',
    info: 'var(--admin-info)',
  },
},
boxShadow: {
  // ...giữ nguyên kid/*...
  'admin-sm': 'var(--admin-shadow-sm)',
  'admin-md': 'var(--admin-shadow-md)',
  'admin-lg': 'var(--admin-shadow-lg)',
},
```

Lưu ý: token màu dạng `var(...)` hoạt động tốt với utility nền/viền/text; với opacity modifier (`/50`) thì hạn chế — nên ưu tiên primitives `.admin-*` cho các chỗ cần alpha.

### 3. `layout.tsx`

```tsx
// Trước:
<div className="admin-theme flex min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#fdf2f8_100%)]">

// Sau: dùng token nền
<div className="admin-theme flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
```

Giữ `ml-64` cho main khớp sidebar `w-64`.

### 4. `AdminSidebar.tsx`

- Logo box: `style={{ backgroundImage: 'var(--admin-gradient)' }}` thay cho `from-violet-500...`.
- Nút "Thêm truyện": dùng `.admin-btn .admin-btn-primary`.
- Item active: nền `var(--admin-gradient)` + `text-white` + `shadow-admin-md`; item thường: `text-admin-text-muted hover:bg-admin-surface-muted hover:text-admin-primary`.
- Viền sidebar: `border-admin-border`; nền: `bg-admin-surface/80` + `backdrop-blur` nhẹ (giữ hiệu ứng kính nhưng giảm blur xuống ~12px).

### 5. `admin/page.tsx` (Dashboard truyện)

Mapping class thô → primitive:

| Hiện tại | Thay bằng |
|---|---|
| `rounded-2xl border border-slate-200 bg-white ... shadow-sm` | `admin-card` (+ padding) |
| nút `bg-violet-600 ... hover:bg-violet-700` | `admin-btn admin-btn-primary` |
| stat icon `bg-violet-50 text-violet-700` | `admin-stat-icon` (token tint) |
| badge published `bg-emerald-50 text-emerald-700` | `admin-badge admin-badge-success` |
| badge draft `bg-amber-50 text-amber-700` | `admin-badge admin-badge-warning` |
| nút Sửa `bg-slate-900` | `admin-btn admin-btn-secondary` (hoặc giữ dark nếu muốn tương phản) |
| nút Xóa `border-red-200 bg-red-50 text-red-700` | `admin-btn admin-btn-danger` |
| input search | `admin-input` (đã token hóa) |

Không đổi logic `useEffect`, `handleDeleteStory`, `filteredStories`.

### 6. `admin/videos/page.tsx`

- Header/CTA/stat/search: như dashboard.
- `statusBadge()` trả về class primitive:

```ts
function statusBadge(status: Video['status']) {
  switch (status) {
    case 'ready':     return 'admin-badge admin-badge-success';
    case 'error':     return 'admin-badge admin-badge-danger';
    case 'uploading': return 'admin-badge admin-badge-warning';
    default:          return 'admin-badge admin-badge-info';
  }
}
```

- Tab Video/Nhạc: `admin-tab` + `admin-tab-active`.
- Status filter chips, `StatCard`: dùng token (`admin-card`, `admin-stat-icon`, warn → tint amber).
- Giữ nguyên `loadVideos`, polling, `handleDelete/handleSyncStatus/handleForceReady`.

### 7. `admin/games/page.tsx` (refactor)

```tsx
// Bỏ wrapper min-h-screen bg-gray-50 (layout đã có nền). Dùng spacing chuẩn.
<div className="space-y-6">
  <header className="admin-card flex flex-col gap-1 p-5">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Nội dung học</p>
    <h1 className="text-2xl font-black text-admin-text">Nội dung Game</h1>
    <p className="text-sm text-admin-text-muted">Chỉnh sửa câu hỏi cho các game...</p>
  </header>

  <div className="grid gap-4 md:grid-cols-2">
    {EDITABLE_GAMES.map((game) => (
      <Link key={game.type} href={`/admin/games/${game.type}`}
        className="admin-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-admin-lg">
        <div className="mb-3 text-4xl">{game.emoji}</div>
        <h2 className="text-xl font-black text-admin-text">{game.title}</h2>
        <p className="mt-1 text-sm text-admin-text-muted">{game.desc}</p>
        <span className="mt-4 inline-block text-sm font-black text-admin-primary">Chỉnh sửa nội dung →</span>
      </Link>
    ))}
  </div>
</div>
```

### 8. `admin/games/[type]/page.tsx` (refactor)

- Bỏ `min-h-screen bg-gray-50`.
- Header card chuẩn; nút "Quay lại" → `admin-btn admin-btn-ghost`.
- Tab độ khó: dùng pill `admin-tab/admin-tab-active` thay border-bottom xanh.
- Card câu hỏi: `admin-card p-4` thay `border-gray-300`.
- Input: class `admin-input`; focus ring xanh `ring-blue-500` → token `--admin-primary`.
- Sticky bar: nút "+ Thêm câu hỏi" → giữ nghĩa "tạo" nhưng đổi sang token success (`admin-btn` nền emerald) hoặc secondary; nút "Lưu" → `admin-btn-primary`.
- Đáp án đúng highlight `border-green-400 bg-green-50` → emerald token nhẹ.
- Giữ nguyên `McEditor`, `TfEditor` logic.

### 9. `admin/music/page.tsx` (refactor + bugfix)

- Bỏ `min-h-screen bg-gray-50`; dùng layout chung.
- Card trạng thái/upload → `admin-card`.
- Nút Bật/Tắt nhạc: bật → `admin-btn` nền emerald; tắt → secondary.
- Input file: tint theo `--admin-primary` thay `bg-blue-50/text-blue-700`.
- Nút Upload/Lưu → `admin-btn-primary`; Hoàn tác → `admin-btn-ghost`.
- **Bugfix sticky bar**: `left-56` → `left-64` để khớp sidebar `w-64`. Nền `bg-admin-surface/95 backdrop-blur`, viền `border-admin-border`.
- Progress bar fill: `--admin-primary` thay `bg-emerald-500` (hoặc giữ emerald — nhất quán với "đang xử lý").
- Giữ nguyên upload/auth/save logic.

### 10. `admin/error.tsx` & `admin/loading.tsx`

- `error.tsx`: nút "Thử lại" → `admin-btn admin-btn-primary`; "Về trang chủ" → `admin-btn admin-btn-secondary`; nền dùng `--admin-bg`.
- `loading.tsx`: skeleton blocks dùng `bg-admin-surface-muted`, card `admin-card`.

### 10b. `AdminIcon` + `src/config/admin-icons.ts`

Component nhỏ thống nhất cách render icon admin, ưu tiên Iconscout, fallback lucide:

```tsx
// src/config/admin-icons.ts
import manifest from '../../public/assets/iconscout/manifest.json'; // optional; build vẫn chạy nếu thiếu (xử lý try/catch hoặc dynamic)
// Map key admin (stories/videos/games/music/dashboard/upload) → file Iconscout nếu manifest có.

// src/components/admin/AdminIcon.tsx
// Props: name (key), fallback: LucideIcon, className.
// Nếu có asset Iconscout cho name → render <Image src=... />, ngược lại render <Fallback />.
```

Quy tắc: nếu `manifest.json` chưa tồn tại (chưa chạy script), import phải an toàn — dùng `try/catch` khi require, hoặc commit một `manifest.json` rỗng `{ "results": [] }` làm mặc định để build không vỡ. Mọi nơi gọi `AdminIcon` đều truyền sẵn lucide fallback (chính là icon đang dùng), nên giao diện không bao giờ "trống icon".

### 11. Data / control flow

Không thay đổi. Tất cả thay đổi nằm ở lớp trình bày (className/CSS). Các hàm xử lý sự kiện, gọi API (`storyApi`, `videoApi`, `api`), state (`useState/useEffect`), routing đều **giữ nguyên byte-for-byte** ngoài className.

### 12. Rủi ro & cách kiểm soát

| Rủi ro | Giảm thiểu |
|---|---|
| Gỡ `!important` làm vài chỗ đang dựa vào override bị đổi màu | Đã refactor trực tiếp class trên từng trang theo token nên không còn phụ thuộc override |
| `var()` trong Tailwind color không hỗ trợ alpha `/opacity` | Chỗ cần alpha dùng primitive `.admin-*` hoặc rgba trực tiếp |
| Sai khác layout do bỏ wrapper `min-h-screen` ở games/music | Layout admin đã có nền + padding; kiểm tra bằng `npm run dev` từng trang |
| TypeScript/lint lỗi | Chạy `npm run type-check` và `npm run lint` sau khi sửa |

## Data Models

Feature này thuần UI nên **không thay đổi data model nghiệp vụ** (`Story`, `Video`, `MusicSetting`, `MCContent`, `TFContent`... giữ nguyên). Mô hình dữ liệu duy nhất được thêm là **design token model** — bộ biến CSS đóng vai trò nguồn chân lý cho giao diện.

### Design Token Model

```
AdminThemeTokens (CSS custom properties, scope .admin-theme)
├── Brand
│   ├── --admin-primary           : color   (#6366f1)
│   ├── --admin-primary-strong    : color   (#4f46e5)
│   └── --admin-gradient          : gradient (indigo→violet→fuchsia)
├── Surface
│   ├── --admin-bg                : gradient (nền toàn trang)
│   ├── --admin-surface           : color   (#ffffff)
│   └── --admin-surface-muted     : color   (#f8fafc)
├── Line & Text
│   ├── --admin-border            : color   (#e2e8f0)
│   ├── --admin-border-accent     : color   (#c7d2fe)
│   ├── --admin-text              : color   (#0f172a)
│   └── --admin-text-muted        : color   (#64748b)
├── Status
│   ├── --admin-success           : color   (#10b981)
│   ├── --admin-warning           : color   (#f59e0b)
│   ├── --admin-danger            : color   (#ef4444)
│   └── --admin-info              : color   (#0ea5e9)
└── Elevation & Shape
    ├── --admin-shadow-sm|md|lg   : box-shadow
    ├── --admin-radius            : 0.75rem
    └── --admin-radius-lg         : 1rem
```

Token được expose ra Tailwind qua `colors.admin.*` và `boxShadow.admin-*` (tham chiếu `var(...)`), và đóng gói thành các class primitive (`.admin-card`, `.admin-btn-*`, `.admin-badge-*`, `.admin-tab*`) trong `@layer components`. Quan hệ: **1 token → N utility/primitive → N component instance**. Đổi 1 token lan toả toàn admin.

## Correctness Properties

Các tính chất phải đúng sau redesign (dùng làm tiêu chí nghiệm thu):

### Property 1: Bất biến hành vi
Với cùng input/thao tác, mọi route, API call, state transition của admin giống hệt trước redesign. Chỉ `className`/CSS thay đổi.

**Validates: Requirements 5.1, 5.2**

### Property 2: Nhất quán theme
Mọi card admin dùng cùng surface/border/radius/shadow; mọi nút chính dùng cùng gradient; mọi badge trạng thái cùng quy ước màu (ready=success, processing/uploading=warning, error=danger, info=sky). Không còn trang nào dùng `bg-gray-50`/`bg-blue-600`/`text-blue-600` kiểu cũ.

**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

### Property 3: Single source of truth
Không còn override `!important` trong `.admin-theme`; đổi giá trị 1 token CSS → tất cả nơi tham chiếu đổi theo, không cần sửa từng component.

**Validates: Requirements 3.1, 3.2**

### Property 4: Không rò rỉ
Token và primitive admin chỉ áp dụng trong cây `.admin-theme`; UI người dùng (`/`, `/stories`, `/videos`...) không bị ảnh hưởng.

**Validates: Requirements 3.3**

### Property 5: Khớp layout
Phần content `ml-64` và mọi thanh cố định (sticky bar music) căn đúng theo sidebar `w-64` (left-64), không lệch.

**Validates: Requirements 4.1**

### Property 6: A11y tối thiểu
Text trên nền đạt contrast AA; focus ring hiển thị rõ khi điều hướng bàn phím; touch target ≥ 44px được giữ.

**Validates: Requirements 6.1, 6.2**

### Property 7: Build sạch
`npm run type-check` và `npm run lint` không phát sinh lỗi mới.

**Validates: Requirements 5.3**

## Error Handling

- **Không thêm đường xử lý lỗi mới**: các `try/catch`, toast lỗi, optimistic update và rollback (vd `handleDeleteStory` khôi phục `previousStories`, `handleDelete` video) giữ nguyên hoàn toàn.
- **Error/loading boundaries**: `admin/error.tsx` và `admin/loading.tsx` chỉ đổi lớp trình bày; vẫn nhận `error`/`reset`, vẫn `console.error`, vẫn render skeleton.
- **Fallback màu**: nếu một token CSS thiếu, trình duyệt bỏ qua giá trị không hợp lệ — để an toàn, primitive đặt giá trị literal hợp lý làm cơ sở và token chỉ phủ lên; tránh để control mất hẳn nền/viền.
- **Tránh trạng thái "vô hình"**: khi token đổi, đảm bảo nút disabled vẫn phân biệt được (giữ `disabled:opacity-*`/cursor hiện có), badge vẫn đủ tương phản chữ–nền.

---

## Testing Strategy

- **Build/type/lint**: `npm run type-check`, `npm run lint` phải sạch.
- **Thủ công (npm run dev)**: duyệt qua `/admin`, `/admin/videos`, `/admin/games`, `/admin/games/multiple-choice`, `/admin/games/true-false`, `/admin/music`, trang error/loading → xác nhận đồng bộ màu, không vỡ layout, sticky bar music thẳng hàng.
- **Accessibility**: kiểm tra contrast text trên nền (AA), focus ring hiện rõ khi tab bàn phím, touch target ≥ 44px. Lưu ý: kiểm định WCAG đầy đủ cần test thủ công với công cụ a11y và review chuyên sâu.
- **Regression chức năng**: tạo/sửa/xóa truyện, upload nhạc, lưu câu hỏi game vẫn chạy đúng (không đổi logic, chỉ smoke test).

---

## Open Questions

1. **Tông màu chủ đạo**: bạn muốn giữ DNA **tím/fuchsia** hiện có (đề xuất: indigo→violet→fuchsia), hay đổi hướng khác (vd xanh teal/ocean cho cảm giác "tech-modern" hơn)? Mặc định mình chọn indigo→violet→fuchsia.
2. **Nút "Sửa" màu đậm (slate-900)**: giữ tương phản tối để nổi bật, hay đổi sang secondary sáng cho đồng bộ? Mặc định mình giữ secondary sáng.
3. **Dark mode**: ngoài phạm vi lần này, đúng không? Token đã thiết kế sẵn để mở rộng sau.
