# Requirements Document

## Glossary

- **Design token**: biến CSS (`--admin-*`) đóng vai trò nguồn chân lý cho màu/shadow/radius của admin; được map sang Tailwind (`colors.admin.*`, `boxShadow.admin-*`).
- **Primitive**: class dùng lại định nghĩa trong `@layer components` (`.admin-card`, `.admin-btn-*`, `.admin-badge-*`, `.admin-tab*`, `.admin-input`).
- **Surface**: nền của card/panel (`--admin-surface`) và nền phụ (`--admin-surface-muted`).
- **Status color**: quy ước màu theo ý nghĩa — success (emerald), warning (amber), danger (red), info (sky).
- **Sticky bar**: thanh hành động cố định ở đáy trang (vd thanh "Lưu thay đổi" của trang Nhạc nền).
- **Progressive enhancement**: chiến lược dùng icon Iconscout nếu có, nếu không thì fallback lucide-react mà không lỗi.
- **Manifest**: file `public/assets/iconscout/manifest.json` liệt kê asset Iconscout đã tải sẵn.
- **lucide-react**: thư viện line-icon hiện đang dùng trong admin (fallback mặc định).

## Introduction

Làm mới giao diện admin panel của ComicLingua Kids (Engkids) cho **đẹp, hiện đại, trẻ trung và nhất quán**, dựa trên một hệ thống design token tập trung. Hiện tại admin bị chắp vá: dashboard truyện/video đã hiện đại (tím–fuchsia, bo góc lớn, badge pill) nhưng trang Game và Nhạc nền vẫn dùng style cũ (`bg-gray-50`, nút `bg-blue-600`, `rounded-lg`); `globals.css` dùng nhiều override `!important` khó bảo trì; màu hardcode rải rác không có token; và có một lỗi căn lề ở thanh lưu cố định của trang Nhạc.

Feature này là **thuần UI/UX** — không thay đổi logic nghiệp vụ (CRUD, upload, auth, API, data model). Bổ sung tùy chọn icon 3D từ Iconscout theo hướng **tải sẵn 1 lần** với fallback an toàn về lucide-react.

Tài liệu này được rút ra từ `design.md` (design-first workflow).

### Phạm vi
- **Trong phạm vi**: tất cả route dưới `/admin/*` + `AdminSidebar`, design token trong `globals.css` và `tailwind.config.js`, tích hợp icon Iconscout tải sẵn.
- **Ngoài phạm vi**: UI người dùng cuối (`/`, `/stories`, `/videos`...), dark mode, thay đổi data/API/auth.

---

## Requirements

### Requirement 1: Hệ thống màu hiện đại, nhất quán

**User Story:** Là quản trị viên, tôi muốn toàn bộ trang admin có một bảng màu hiện đại và đồng nhất, để trải nghiệm quản lý trông chuyên nghiệp và dễ chịu.

#### Acceptance Criteria
1. WHEN admin xem bất kỳ trang nào dưới `/admin/*` THEN hệ thống SHALL hiển thị cùng một bảng màu chủ đạo (indigo → violet → fuchsia gradient) cho thương hiệu, CTA và trạng thái active.
2. WHEN admin chuyển giữa các trang (Truyện, Video, Game, Nhạc) THEN card, nút, input, badge và tab SHALL có cùng kiểu dáng (surface, border, radius, shadow) trên mọi trang.
3. THE hệ thống SHALL KHÔNG còn sử dụng các lớp style cũ rời rạc như `bg-gray-50`, `bg-blue-600`, `text-blue-600`, `rounded-lg` cho khối giao diện chính của admin.

### Requirement 2: Quy ước màu trạng thái rõ nghĩa

**User Story:** Là quản trị viên, tôi muốn nhận biết trạng thái nội dung qua màu sắc nhất quán, để nắm nhanh tình trạng video/truyện.

#### Acceptance Criteria
1. WHEN hiển thị badge trạng thái THEN hệ thống SHALL dùng: `ready`/đã đăng = success (emerald), `processing`/`uploading`/cảnh báo = warning (amber), `error`/xóa = danger (red), trạng thái phụ = info (sky).
2. WHEN cùng một ý nghĩa trạng thái xuất hiện ở nhiều trang THEN hệ thống SHALL hiển thị cùng một màu cho ý nghĩa đó.
3. WHEN một nút mang ý nghĩa nguy hiểm (xóa) THEN hệ thống SHALL hiển thị nó bằng kiểu danger để phân biệt rõ với nút thường.

### Requirement 3: Design token tập trung, dễ bảo trì

**User Story:** Là lập trình viên, tôi muốn quản lý theme qua một nguồn token duy nhất, để đổi giao diện nhanh và an toàn.

#### Acceptance Criteria
1. THE hệ thống SHALL định nghĩa các design token (màu, gradient, surface, border, text, status, shadow, radius) dưới dạng CSS custom properties scope trong `.admin-theme`, và expose qua Tailwind (`colors.admin.*`, `boxShadow.admin-*`).
2. WHEN giá trị của một token được thay đổi THEN tất cả thành phần admin tham chiếu token đó SHALL thay đổi theo mà không cần sửa từng component.
3. THE hệ thống SHALL loại bỏ các override `!important` trong `.admin-theme` của `globals.css`, VÀ token/primitive admin SHALL KHÔNG ảnh hưởng tới UI người dùng cuối ngoài cây `.admin-theme`.
4. THE hệ thống SHALL cung cấp các class primitive dùng lại (`.admin-card`, `.admin-btn-*`, `.admin-badge-*`, `.admin-tab*`, `.admin-input`) để giảm lặp class.

### Requirement 4: Sửa lỗi căn lề & layout

**User Story:** Là quản trị viên, tôi muốn các thành phần cố định căn đúng với sidebar, để giao diện không bị lệch.

#### Acceptance Criteria
1. WHEN trang Nhạc nền hiển thị thanh lưu cố định (sticky bar) THEN hệ thống SHALL căn nó khớp với chiều rộng sidebar (`w-64`), không bị lệch (sửa `left-56` → `left-64`).
2. WHEN nội dung chính render cạnh sidebar THEN hệ thống SHALL giữ khoảng cách `ml-64` khớp với sidebar trên mọi trang admin.
3. WHEN trang Game/Nhạc bỏ wrapper `min-h-screen bg-*` riêng THEN hệ thống SHALL vẫn hiển thị nền chung của layout admin mà không vỡ bố cục.

### Requirement 5: Không thay đổi hành vi nghiệp vụ

**User Story:** Là quản trị viên, tôi muốn mọi chức năng hiện có vẫn chạy nguyên vẹn sau khi đổi theme, để không gián đoạn công việc.

#### Acceptance Criteria
1. WHEN admin thực hiện thao tác (tạo/sửa/xóa truyện, upload/sửa/xóa video, lưu câu hỏi game, upload/lưu nhạc nền) THEN hệ thống SHALL giữ nguyên hành vi, route, API call và state như trước redesign.
2. THE thay đổi SHALL chỉ nằm ở lớp trình bày (className/CSS); các hàm xử lý sự kiện, gọi API và optimistic update/rollback SHALL giữ nguyên.
3. WHEN chạy `npm run type-check` và `npm run lint` sau redesign THEN hệ thống SHALL KHÔNG phát sinh lỗi mới.

### Requirement 6: Khả năng tiếp cận (Accessibility) tối thiểu

**User Story:** Là quản trị viên dùng bàn phím hoặc cần độ tương phản tốt, tôi muốn giao diện dễ thao tác và dễ đọc.

#### Acceptance Criteria
1. THE text trên nền SHALL đạt độ tương phản WCAG AA cho nội dung chính.
2. WHEN admin điều hướng bằng bàn phím THEN các phần tử tương tác SHALL hiển thị focus ring rõ ràng, VÀ touch target SHALL ≥ 44px.
3. THE hệ thống SHALL giữ trạng thái phân biệt cho nút disabled (opacity/cursor) và badge đủ tương phản chữ–nền.

*(Ghi chú: kiểm định WCAG đầy đủ cần test thủ công với công cụ a11y và review chuyên sâu; phạm vi này đảm bảo các tiêu chí cơ bản nêu trên.)*

### Requirement 7: Tích hợp icon Iconscout (tải sẵn, fallback an toàn)

**User Story:** Là quản trị viên, tôi muốn icon trong admin sinh động (3D) khi có sẵn asset Iconscout, nhưng giao diện vẫn ổn nếu chưa có.

#### Acceptance Criteria
1. THE hệ thống SHALL lấy asset Iconscout theo hướng **tải sẵn 1 lần** qua `scripts/download-iconscout-assets.js` (`npm run iconscout:download`) vào `public/assets/iconscout/` kèm `manifest.json`, VÀ SHALL KHÔNG gọi Iconscout API lúc runtime.
2. IF chưa có credentials (`ICONSCOUT_CLIENT_ID`/`ICONSCOUT_CLIENT_SECRET`) hoặc chưa chạy script THEN hệ thống SHALL hiển thị đầy đủ bằng icon `lucide-react` hiện có (fallback), không lỗi build.
3. WHEN `manifest.json` có asset ứng với một key admin (vd stories, videos, games, music, dashboard, upload) THEN component `AdminIcon` SHALL ưu tiên dùng asset Iconscout đó; ngược lại dùng lucide fallback.
4. THE credentials Iconscout SHALL KHÔNG được commit vào repo; chỉ set trong shell/`.env.local`.

---

## Out of Scope / Future

- Dark mode (token đã thiết kế sẵn để mở rộng).
- Proxy API Iconscout động (đã cân nhắc và loại do chậm/tốn credit).
- Thay đổi cấu trúc dữ liệu, API, hoặc luồng xác thực.

## Open Questions (cần xác nhận khi review)

1. Tông chủ đạo: giữ indigo → violet → fuchsia (mặc định) hay đổi hướng teal/ocean?
2. Nút "Sửa" (hiện slate-900 đậm): giữ tối nổi bật hay đổi sang secondary sáng?
3. Iconscout credentials: bạn sẽ cung cấp `CLIENT_ID`/`CLIENT_SECRET` để chạy script, hay tạm dùng lucide fallback trước?
