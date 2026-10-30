-- ReviewSpark Migration 004: Add Google Maps listing URL and Place ID uniqueness constraint
-- Run this in your Supabase SQL editor:

-- 1. Add google_maps_url column if not exists
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- 2. Add partial unique index on place_id to prevent duplicate business registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_place_id_unique
ON public.businesses (place_id)
WHERE place_id IS NOT NULL AND place_id != '';
