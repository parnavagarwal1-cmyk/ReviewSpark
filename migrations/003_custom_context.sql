-- ReviewSpark: Add custom_context to businesses
-- Run this in your Supabase SQL editor:

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS custom_context TEXT;
