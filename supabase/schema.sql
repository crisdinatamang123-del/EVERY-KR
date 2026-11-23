-- EveryKR Database Schema for Supabase PostgreSQL
-- Run this in your Supabase Project -> SQL Editor

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  university TEXT,
  nationality TEXT,
  visa_type TEXT DEFAULT 'D-2',
  visa_expiry_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Universities Directory
CREATE TABLE IF NOT EXISTS public.universities (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_kr TEXT NOT NULL,
  acronym TEXT NOT NULL,
  region TEXT NOT NULL,
  nearest_subway TEXT NOT NULL,
  website TEXT NOT NULL,
  ranking INTEGER,
  english_track_available BOOLEAN DEFAULT true,
  min_topik_level INTEGER DEFAULT 3,
  min_ielts_score NUMERIC(3,1) DEFAULT 6.0,
  annual_tuition_krw BIGINT,
  gks_scholarship_eligible BOOLEAN DEFAULT true,
  undergrad_deadline TEXT,
  grad_deadline TEXT,
  popular_majors TEXT[],
  description TEXT,
  intl_office_email TEXT,
  intl_office_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Housing Listings
CREATE TABLE IF NOT EXISTS public.housing_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('goshiwon', 'oneroom', 'officetel', 'dormitory', 'sharehouse')),
  area TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  nearest_station TEXT NOT NULL,
  walk_minutes INTEGER DEFAULT 5,
  monthly_rent_krw INTEGER NOT NULL,
  deposit_krw INTEGER NOT NULL,
  maintenance_fee_krw INTEGER DEFAULT 0,
  image TEXT,
  gender_preference TEXT DEFAULT 'All',
  amenities TEXT[],
  english_speaking_host BOOLEAN DEFAULT true,
  includes_utilities BOOLEAN DEFAULT false,
  free_food_supplies TEXT[],
  contact_number TEXT,
  verified BOOLEAN DEFAULT false,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Marketplace Items
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('textbooks', 'appliances', 'furniture', 'clothing', 'electronics', 'free')),
  price_krw INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Fair')),
  image TEXT,
  location_station TEXT NOT NULL,
  seller_id UUID REFERENCES auth.users(id),
  seller_name TEXT NOT NULL,
  seller_university TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'sold')),
  description TEXT,
  negotiable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Community Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  author_university TEXT,
  author_nationality TEXT,
  likes INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Saved University Applications
CREATE TABLE IF NOT EXISTS public.saved_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id TEXT,
  university_name TEXT NOT NULL,
  degree_level TEXT NOT NULL,
  major TEXT NOT NULL,
  intake_season TEXT NOT NULL,
  status TEXT DEFAULT 'Preparing Documents',
  deadline TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user specific tables
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active marketplace items"
  ON public.marketplace_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create marketplace items"
  ON public.marketplace_items FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Everyone can read community posts"
  ON public.community_posts FOR SELECT USING (true);

CREATE POLICY "Users can manage their own saved applications"
  ON public.saved_applications FOR ALL USING (auth.uid() = user_id);
