// ==========================================
// 1. FILE: BRD.md (Business Requirements)
// ==========================================

# 📑 Business Requirements Document (BRD)

**Dự án:** My Project Dashboard (DevHub Central)
**Chủ dự án:** PHAN HUỲNH TOÀN ĐỨC (toaducz)

## Mục tiêu:

Quản lý tập trung hệ sinh thái dự án (Vercel & External) tại một Dashboard duy nhất.

## Tính năng chính:

- **Vercel Auto-Sync**: Đồng bộ qua Vercel API Token (proxy qua `/api/vercel`).
- **Custom Cards**: Thêm thủ công dự án ngoài Vercel (VPS, Docker, v.v.) qua `/api/projects`.
- **Health Check**: Theo dõi trạng thái Online/Offline thời gian thực qua `/api/health`.
- **Phân loại**: Sắp xếp theo Category (Active, Lab, Archive) và Tag công nghệ.
- **Authentication**: Đăng nhập/đăng xuất qua Supabase Auth. Protected routes yêu cầu session hợp lệ. Mock mode khi chưa cấu hình Supabase.

## Tech Stack:

- Next.js 16 (App Router + Turbopack)
- Supabase (Auth + Database) — `@supabase/supabase-js`, `@supabase/ssr`
- Vercel API (project sync)
- TypeScript strict + Zod validation

// ==========================================
// 2. FILE: RULE.md (Coding Conventions)
// ==========================================

# 📜 Coding Standards & Conventions (RULE.md)

## Nguyên tắc TypeScript (Strict Mode)

- Cấm sử dụng `any`: Dùng `unknown` hoặc interface/type cụ thể.
- Zod Validation: Luôn validate dữ liệu từ API hoặc Form đầu vào.
- Explicit Types: Khai báo kiểu trả về cho Server Actions và API Routes.

## Quy tắc đặt tên (Naming)

- Components: pascal-case.tsx (project-card.tsx)
- Hooks: use-camel-case.ts (use-vercel-sync.ts)
- Files/Folders: kebab-case (project-details/)
- Constants: UPPER_SNAKE_CASE (VERCEL_API_URL)

## Cấu trúc thư mục (Next.js 16)

src/
├── app/
│ └── api/ # Serverless API Routes (Next.js Route Handlers)
│ ├── vercel/ # Proxy & sync Vercel API (projects, deployments)
│ ├── health/ # Health check endpoint cho các dự án
│ └── projects/ # CRUD operations cho custom projects
├── components/ # ui/ (Shadcn), layout/, projects/ (Features)
├── lib/ # SDK Configs (supabase.ts, vercel.ts)
├── services/ # Logic fetching & Data transformation
└── types/ # TypeScript Definitions

## UI & React

- Server-First: Ưu tiên Server Components. Chỉ dùng 'use client' khi cần tương tác.
- Tailwind v4: Sử dụng @theme. Thứ tự: Layout -> Box Model -> Typography -> Visual.

-- ==========================================
// 3. FILE: schema.sql (Supabase Database)
// ==========================================

-- Kích hoạt Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng Users (mở rộng Supabase Auth users)
CREATE TABLE public.users (
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
email TEXT UNIQUE NOT NULL,
username TEXT UNIQUE NOT NULL,
is_admin BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Categories (lookup table với key TEXT)
CREATE TABLE public.categories (
key TEXT PRIMARY KEY,
label TEXT NOT NULL,
description TEXT
);

-- Bảng Tags (system và custom tags)
CREATE TABLE public.tags (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name TEXT UNIQUE NOT NULL,
type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
color TEXT DEFAULT '#525252',
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Projects (chính)
CREATE TABLE public.projects (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
name TEXT NOT NULL,
description TEXT,
status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'learning', 'research', 'archive')),
platforms TEXT[] NOT NULL DEFAULT '{}',
is_live BOOLEAN DEFAULT false,
tech_stack TEXT[] NOT NULL DEFAULT '{}',
url TEXT NOT NULL,
category TEXT NOT NULL REFERENCES public.categories(key),
is_private BOOLEAN DEFAULT false,
vercel_project_id TEXT UNIQUE,
last_health_check TIMESTAMPTZ,
health_status TEXT CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Project-Tags (many-to-many)
CREATE TABLE public.project_tags (
project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
PRIMARY KEY (project_id, tag_id)
);

-- Bảng Vercel Tokens (lưu trữ token bảo mật)
CREATE TABLE public.vercel_tokens (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
token TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
last_used_at TIMESTAMPTZ
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: Users
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Policies: Projects
CREATE POLICY "Public can view non-private projects" ON public.projects FOR SELECT USING (is_private = false);
CREATE POLICY "Users can view own private projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin full access to projects" ON public.projects FOR ALL USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Policies: Tags & Project_Tags
CREATE POLICY "Tags are public" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Project tags are public" ON public.project_tags FOR SELECT USING (true);
CREATE POLICY "Users can manage tags for own projects" ON public.project_tags FOR ALL USING (
EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tags.project_id AND projects.user_id = auth.uid())
);

-- Policies: Vercel Tokens
CREATE POLICY "Users can manage own tokens" ON public.vercel_tokens FOR ALL USING (auth.uid() = user_id);

-- Dữ liệu mẫu (Seed)
INSERT INTO public.categories (key, label, description) VALUES
('active', 'Active', 'Currently active and maintained projects'),
('learning', 'Learning', 'Projects for learning purposes'),
('research', 'Research', 'Experimental and research projects'),
('archive', 'Archive', 'Archived or deprecated projects')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tags (name, type, color) VALUES
('Vercel', 'system', '#22c55e'),
('Live', 'system', '#22c55e'),
('NextJS', 'system', '#3b82f6'),
('Go', 'system', '#00add8'),
('NestJS', 'system', '#e0234e'),
('Docker', 'system', '#2496ed'),
('Rust', 'system', '#ce422b'),
('VPS', 'system', '#f59e0b'),
('GitHub', 'system', '#a3a3a3')
ON CONFLICT (name) DO NOTHING;

// ==========================================
// 4. FILE: .eslintrc.json (Linting Config)
// ==========================================

{
"extends": [
"next/core-web-vitals",
"eslint:recommended",
"plugin:@typescript-eslint/recommended"
],
"rules": {
"@typescript-eslint/no-explicit-any": "error",
"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
"import/order": [
"warn",
{
"groups": ["builtin", "external", "internal"],
"newlines-between": "always",
"alphabetize": { "order": "asc", "caseInsensitive": true }
}
]
}
}
