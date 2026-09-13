-- ============================================================================
-- The Horizoon: Supabase Database Schema
-- Run this in your Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ============================================================================

-- 1. Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lifestyle',
  categorySlug TEXT NOT NULL DEFAULT 'lifestyle',
  seoTitle TEXT,
  metaDesc TEXT,
  summary TEXT,
  content TEXT NOT NULL,
  image TEXT NOT NULL,
  imageAlt TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  author JSONB DEFAULT '{"name": "Elena Vance", "role": "Senior Editor", "bio": "", "avatar": "assets/images/avatar-elena.jpg"}'::jsonb,
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  readTime TEXT DEFAULT '8 min read',
  wordsCount INTEGER DEFAULT 1000,
  date TEXT,
  isoDate TIMESTAMPTZ DEFAULT NOW(),
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public can read all published posts
DROP POLICY IF EXISTS "Allow public read access" ON public.posts;
CREATE POLICY "Allow public read access"
ON public.posts
FOR SELECT
USING (true);

-- 4. Policy: Allow insert, update, delete with publishable / anon key
DROP POLICY IF EXISTS "Allow admin write access" ON public.posts;
CREATE POLICY "Allow admin write access"
ON public.posts
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Helpful index for ultra-fast slug queries and category browsing
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(categorySlug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
