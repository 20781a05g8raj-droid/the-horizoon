-- ============================================================================
-- The Horizoon: Complete Supabase Database Suite
-- Run this in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. POSTS TABLE (Main Blog & SEO Studio) - Already created & working!
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lifestyle',
  categoryslug TEXT NOT NULL DEFAULT 'lifestyle',
  seotitle TEXT,
  metadesc TEXT,
  summary TEXT,
  content TEXT NOT NULL,
  image TEXT NOT NULL,
  imagealt TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  author JSONB DEFAULT '{"name": "Elena Vance", "role": "Senior Editor", "bio": "", "avatar": "assets/images/avatar-elena.jpg"}'::jsonb,
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  readtime TEXT DEFAULT '8 min read',
  wordscount INTEGER DEFAULT 1000,
  date TEXT,
  isodate TIMESTAMPTZ DEFAULT NOW(),
  createdat TIMESTAMPTZ DEFAULT NOW(),
  updatedat TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.posts;
CREATE POLICY "Allow public read access" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access" ON public.posts;
CREATE POLICY "Allow admin write access" ON public.posts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(categoryslug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);

-- ============================================================================
-- 2. COMMENTS TABLE (Reader engagement & feedback on single blog posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'approved'
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read comments" ON public.comments;
CREATE POLICY "Allow public read comments" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert comments" ON public.comments;
CREATE POLICY "Allow public insert comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_comments_slug ON public.comments(post_slug);

-- ============================================================================
-- 3. NEWSLETTER SUBSCRIBERS TABLE (Captures emails from newsletter.html & footer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read subscribers" ON public.subscribers;
CREATE POLICY "Allow public read subscribers" ON public.subscribers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert subscribers" ON public.subscribers;
CREATE POLICY "Allow public insert subscribers" ON public.subscribers FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. CONTACT MESSAGES TABLE (Contact us form inquiries from contact.html)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read contact" ON public.contact_messages;
CREATE POLICY "Allow public read contact" ON public.contact_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert contact" ON public.contact_messages;
CREATE POLICY "Allow public insert contact" ON public.contact_messages FOR ALL USING (true) WITH CHECK (true);
