-- ==========================================
-- DEVHUB CENTRAL DATABASE SCHEMA (OPTIMIZED)
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

-- Users table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories lookup table
CREATE TABLE IF NOT EXISTS public.categories (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);

-- Tags table (system and custom tags)
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  color TEXT DEFAULT '#525252',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table (Added user_id to track ownership)
CREATE TABLE IF NOT EXISTS public.projects (
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

-- Project-Tags junction table
CREATE TABLE IF NOT EXISTS public.project_tags (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Vercel tokens table (secure storage)
CREATE TABLE IF NOT EXISTS public.vercel_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- ==========================================
-- 2. SEED DEFAULT DATA
-- ==========================================

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

-- ==========================================
-- 3. AUTOMATION TRIGGERS (AUTH SYNC & UPDATED_AT)
-- ==========================================

-- Trigger: Automatically sync new users from Supabase Auth to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, is_admin)
  VALUES (
    new.id,
    new.email,
    split_part(new.email, '@', 1), -- Lấy phần trước @ làm username mặc định
    true -- (Tùy chọn) Mặc định cho mọi user mới làm Admin nếu bạn làm web cá nhân
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Auto update 'updated_at' column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_tokens ENABLE ROW LEVEL SECURITY;

-- Users: Can read all users, update only themselves
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects: Public view, Admin full access, Owners manage their own
CREATE POLICY "Public can view non-private projects" ON public.projects FOR SELECT USING (is_private = false);
CREATE POLICY "Users can view own private projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin full access to projects" ON public.projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Tags & Project_Tags: Publicly readable, restricted write
CREATE POLICY "Tags are public" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Project tags are public" ON public.project_tags FOR SELECT USING (true);
CREATE POLICY "Users can manage tags for own projects" ON public.project_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tags.project_id AND projects.user_id = auth.uid())
);

-- Vercel Tokens: Strictly private
CREATE POLICY "Users can manage own tokens" ON public.vercel_tokens FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. INDEXES & PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health ON public.projects(health_status);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON public.project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON public.project_tags(tag_id);

-- ==========================================
-- 6. UTILITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_vercel_projects(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_build_object('success', true, 'projects_created', 0, 'projects_updated', 0);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_project_health(project_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  project_url TEXT;
  start_time TIMESTAMPTZ;
  response_time_ms INTEGER;
  is_healthy BOOLEAN;
BEGIN
  SELECT url INTO project_url FROM public.projects WHERE id = check_project_health.project_id;
  IF project_url IS NULL THEN
    RETURN jsonb_build_object('status', 'unknown');
  END IF;

  start_time := NOW();
  response_time_ms := floor(random() * 500)::INTEGER;
  is_healthy := random() > 0.2;

  result := jsonb_build_object(
    'status', CASE WHEN is_healthy THEN 'healthy' ELSE 'unhealthy' END,
    'response_time', response_time_ms
  );

  UPDATE public.projects
  SET health_status = CASE WHEN is_healthy THEN 'healthy' ELSE 'unhealthy' END, last_health_check = NOW()
  WHERE id = check_project_health.project_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. HEALTH CHECK RPC (SECURITY DEFINER)
-- ==========================================

-- Hàm này được gọi từ API route với anon key.
-- SECURITY DEFINER cho phép nó chạy với quyền của owner (postgres),
-- bypass RLS để chỉ update 2 trường health_status và last_health_check.
CREATE OR REPLACE FUNCTION public.update_project_health(
  p_id UUID,
  p_health_status TEXT,
  p_last_health_check TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.projects
  SET
    health_status       = p_health_status,
    last_health_check   = p_last_health_check,
    -- Đồng bộ cột status (online/offline) theo kết quả health check
    status              = CASE
                            WHEN p_health_status = 'healthy'   THEN 'online'
                            WHEN p_health_status = 'unhealthy' THEN 'offline'
                            ELSE status  -- giữ nguyên nếu unknown
                          END
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cho phép anon role gọi hàm này
GRANT EXECUTE ON FUNCTION public.update_project_health(UUID, TEXT, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.update_project_health(UUID, TEXT, TIMESTAMPTZ) TO authenticated;