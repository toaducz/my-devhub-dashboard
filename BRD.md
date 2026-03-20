# Business Requirements Document (BRD)

**Dự án:** ToanDucz DevHub Central
**Chủ dự án:** Toàn Đức (toaducz)
**Ngày lập:** 19/03/2026
**Trạng thái:** Draft v1.0
**Cập nhật:** 19/03/2026

---

## 1. Mục tiêu (Objectives)

Xây dựng một Dashboard cá nhân giúp quản lý tập trung các dự án đã deploy trên Vercel và các nền tảng khác (VPS, GitHub, Docker...).

## 2. Công nghệ lõi (Core Tech Stack)

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Lucide React (Icons).
- **Backend/Database:** Supabase (PostgreSQL, Auth, Realtime) - _Optional, hỗ trợ chế độ mock để phát triển_.
  - **Config:** `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ `.env`
- **Integrations:** Vercel API (để fetch dữ liệu tự động).
  - **Config:** `MY_VERCEL_TOKEN` từ `.env` (ưu tiên), fallback to cookie `vercel_token`, cuối cùng mới nhập tay qua UI

## 3. Tính năng chính (Key Features)

### 3.1 Vercel Sync

- **Không tự động sync** - Chỉ lấy projects từ database khi khởi động.
- Khi user click nút "sync_vercel":
  1. Gọi Vercel API để lấy danh sách projects
  2. Lưu/update các projects vào database
  3. Refetch projects từ database để hiển thị
- Hỗ trợ đồng bộ từ nhiều teams.
- Merge thông minh: giữ lại các dự án custom, cập nhật thông tin từ Vercel.
- Hiển thị trạng thái sync và thời gian đồng bộ cuối cùng.
- Xử lý lỗi và hiển thị thông báo khi sync thất bại.
- **Token Resolution Priority:** Tự động kiểm tra Vercel token theo thứ tự ưu tiên:
  1. **`.env` file** (`MY_VERCEL_TOKEN`) - Server-side, highest priority
  2. **Cookie** (`vercel_token`) - Client-side fallback
  3. **Manual input** - UI form trong Settings page (lưu vào cookie)
  - Nếu không có token nào: Chỉ hiển thị custom projects, hoạt động bình thường.
  - Token được lưu trong cookie với thời hạn 30 ngày khi nhập tay.
  - UI hiển thị trạng thái "Đã kết nối Vercel" hoặc "Chế độ offline" trên dashboard.
  - Nút "sync_vercel" chỉ hiển thị khi có token.

### 3.2 Custom Cards

- Thêm thủ công các dự án ngoài hệ sinh thái Vercel.
- Hỗ trợ nhiều nền tảng: Vercel, VPS, GitHub, Docker.
- Form nhập liệu trực quan với validation.

### 3.3 Categorization

- Phân loại theo 4 category: `active`, `learning`, `research`, `archive` (dựa trên `categories.key`).
- Filter nhanh bằng sidebar.
- Tự động gán category dựa trên loại dự án (Vercel projects → 'active', learning projects → 'learning', etc.).

### 3.4 Smart Tagging

- Hệ thống tự gắn tag platform (`Vercel`, `VPS`, `GitHub`, `Docker`) - được seed sẵn dưới dạng `system` tags với màu preset.
- Cho phép người dùng tự định nghĩa tag công nghệ (`NextJS`, `Go`, `NestJS`, `Rust`, ...) - `custom` tags.
- Dynamic tag filtering.
- Tags có trường `color` để hiển thị màu badge.

### 3.5 Health Check

- Hiển thị trạng thái Online/Offline của dự án.
- Tracking response time.
- Lịch sử health checks (đang phát triển).

### 3.6 Clickable Project Cards

- Toàn bộ card có thể click để mở project URL.
- Hover effect để cải thiện UX.
- Mở link trong tab mới.

## 4. Cấu trúc dữ liệu (Data Schema)

### 4.1 Project Model

```typescript
interface Project {
  id: string; // UUID PRIMARY KEY
  user_id: string; // UUID REFERENCES users(id)
  name: string;
  description?: string; // nullable
  status: "online" | "offline" | "learning" | "research" | "archive";
  platforms: string[]; // TEXT[] NOT NULL DEFAULT '{}'
  is_live: boolean; // DEFAULT false
  tech_stack: string[]; // TEXT[] NOT NULL DEFAULT '{}'
  url: string;
  category: string; // TEXT REFERENCES categories(key) - values: "active", "learning", "research", "archive"
  is_private: boolean; // DEFAULT false
  vercel_project_id?: string | null; // UNIQUE - Vercel project ID for synced projects
  last_health_check?: Date | null; // TIMESTAMPTZ
  health_status?: "healthy" | "unhealthy" | "unknown" | null;
  created_at: Date; // TIMESTAMPTZ DEFAULT NOW()
  updated_at: Date; // TIMESTAMPTZ DEFAULT NOW() - auto-updated by trigger
}
```

### 4.2 Database Tables (Supabase)

- **Supabase URL:** `https://finyrgszcwskmwezykab.supabase.co`
- `users` - Extended from Supabase Auth users (id, email, username, is_admin)
- `categories` - Lookup table with fields: `key` (TEXT PK), `label` (TEXT), `description` (TEXT). Seeded: active, learning, research, archive
- `projects` - Main project table with all project details
- `tags` - System and custom tags (name, type: 'system'|'custom', color)
- `project_tags` - Many-to-many relationship between projects and tags
- `vercel_tokens` - Secure storage for user Vercel API tokens (token, user_id, created_at, last_used_at)
- **Note:** Health data is stored directly in `projects` table (`last_health_check`, `health_status`), no separate `health_checks` table

## 5. Phân quyền (Security)

- **Supabase Auth:** Sử dụng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ `.env`
- **Public View:** Khách có thể xem các dự án không đánh dấu `is_private`.
- **Admin View:** Chỉ Toàn Đức (sau khi đăng nhập Supabase Auth) mới có quyền:
  - Thêm/sửa/xóa projects
  - Quản lý Vercel Token
  - Truy cập trang settings
- **Optional Config:** `ADMIN_EMAIL` (mặc định: `toaducz@gmail.com`) - có thể cấu hình trong `.env`

## 6. Triển khai thực tế (Implementation)

### 6.1 Vercel API Integration

- **Config:** `MY_VERCEL_TOKEN` từ `.env` (ví dụ: `vcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Token Resolution:** Server-side ưu tiên `.env` → Authorization header → fallback. Client-side dùng cookie `vercel_token`.
- File: `src/lib/vercel-api.ts` (client-side) và `src/services/vercel-service.ts` (server-side)
- **Server-side (`vercel-service.ts`):**
  - `createServerVercelClient(token)` - Tạo client với token cụ thể
  - `resolveVercelToken(authHeader)` - Lấy token theo thứ tự: Authorization header → `MY_VERCEL_TOKEN` từ env
- **Client-side (`vercel-api.ts`):**
  - Singleton `VercelAPI` class với các methods:
    - `getProjects()` - Lấy tất cả projects từ user và teams
    - `getProject(projectId)` - Lấy chi tiết project
    - `getProjectDomains(projectId)` - Lấy domains
    - `redeploy(projectId)` - Trigger redeploy
    - `getDeployment(deploymentId)` - Lấy deployment status
    - `hasToken()` - Kiểm tra xem có Vercel token trong cookie không
    - `setToken(token)` - Lưu token vào cookie (30 ngày)
    - `clearToken()` - Xóa token khỏi cookie
- Helper function `transformVercelProject()` - Chuyển đổi Vercel data sang internal format
- **API Routes:** `/api/vercel` - Proxy server-side với token resolution: cookie `vercel_token` → Authorization header → `MY_VERCEL_TOKEN` env

### 6.2 Sync Mechanism

- **No auto-sync on startup:** Chỉ fetch projects từ database.
- **Manual sync:** User click nút "sync_vercel" (chỉ hiển thị khi có token):
  1. Gọi Vercel API qua `/api/vercel` (server-side token resolution)
  2. Gửi danh sách projects vào `/api/projects/vercel-sync` để lưu vào DB
  3. Refetch tất cả projects từ database
- Loading state với spinner animation
- Error handling với thông báo lỗi (nếu token invalid hoặc API lỗi)
- Merge logic trong database:
  - Nếu project có `vercel_project_id` trùng → update (preserve custom fields như `is_private`, `description` custom)
  - Nếu là project mới từ Vercel → insert mới
  - Custom projects (không có `vercel_project_id`) không bị ảnh hưởng
- **Settings page:** Nhập/xóa Vercel token (lưu vào cookie, 30 ngày). Không hiển thị nếu đã có `.env` token.

### 6.3 UI Components

- **ProjectCard:** Clickable card với hover effect, hiển thị đầy đủ thông tin
  - **Card Color Logic:**
    - Nếu `status === "offline"` → border và status indicator màu đỏ (`#ef4444`)
    - Nếu `status === "online"` → màu dựa trên `category`:
      - `active` → xanh lá (`#22c55e`)
      - `learning` → vàng cam (`#f59e0b`)
      - `research` → xanh dương (`#3b82f6`)
      - `archive` → cam đậm (`#ea580c`)
  - URL link ở footer hiển thị màu đỏ khi offline, xám khi online
- **Sidebar:** Navigation và category filter
- **FilterTags:** Dynamic tag filtering
- **StatsRow:** Statistics overview
- **AddProjectModal:** Form để thêm custom project
- **SettingsPage:** Vercel token management

### 6.4 State Management

- React hooks (useState, useMemo, useCallback)
- Cookie-based storage cho Vercel token (`vercel_token`, 30 ngày hết hạn) - chỉ dùng khi `.env` không có
- In-memory state cho projects (có thể mở rộng sang Supabase)
- Context/Provider để quản lý trạng thái Vercel connection và projects

## 7. Chế độ hoạt động (Operating Modes)

### 7.1 Vercel Integration Mode

Dựa trên sự có mặt của Vercel token theo thứ tự ưu tiên:

**Token Resolution Priority:**

1. **Server-side `.env`** (`MY_VERCEL_TOKEN`) - Highest priority, luôn có sẵn trên server
2. **Client-side cookie** (`vercel_token`) - Fallback khi server không có
3. **Manual input** - User nhập qua Settings UI, lưu vào cookie

**Khi có Vercel token (từ bất kỳ nguồn nào):**

- **Không tự động fetch** - Chỉ hiển thị projects từ database
- Sync thủ công có thể được kích hoạt qua nút "sync_vercel"
- Hiển thị trạng thái "Đã kết nối Vercel"
- Sau khi sync, projects từ Vercel được merge với custom projects trong database

**Khi không có Vercel token:**

- Chỉ hiển thị custom projects (đã thêm thủ công)
- Ứng dụng hoạt động bình thường với đầy đủ tính năng
- Không gọi Vercel API
- Hiển thị trạng thái "Chế độ offline"
- Sync button không hiển thị
- Settings page cho phép nhập token thủ công

### 7.2 Database Mode (Supabase)

- **Mock Mode:** Không có Supabase credentials → Database operations là no-op, data lưu trong memory
- **Production Mode:** Có Supabase credentials → Kết nối database thực, data được persist, real-time updates

## 8. Các vấn đề đã khắc phục (Bug Fixes)

- Type safety: Đã thêm `vercel_project_id` vào Project interface
- URL handling: Tự động thêm `https://` nếu thiếu
- Platform typing: Cast từ string[] sang ProjectPlatform[]
- Component structure: Đã fix closing tags cho ProjectCard

## 9. Kế hoạch phát triển (Future Enhancements)

- Real-time health checks với WebSocket
- OAuth integration với Vercel
- Project editing và deletion
- Bulk operations
- Export/import functionality
- Advanced search với fuzzy matching
- Project dependencies graph
- Deployment history và rollbacks
- Mobile responsive design
- Dark/Light theme toggle

---

**Version:** 1.0  
**Last Updated:** 19/03/2026
