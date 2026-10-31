-- ReviewSpark: Add manual business details, SEO keywords, multi-language, aspects & tags
-- Run this in your Supabase SQL editor:

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS nearby TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS service_keywords TEXT,
ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'english',
ADD COLUMN IF NOT EXISTS secondary_language TEXT DEFAULT 'hinglish',
ADD COLUMN IF NOT EXISTS aspects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rating_tags JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS show_aspects BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_tags BOOLEAN DEFAULT TRUE;
