-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
-- Stores user economy and settings
create table profiles (
  user_id text primary key, -- We will use a generated UUID stored in localStorage for now
  wallet integer default 0,
  is_pro boolean default false,
  veo_trials integer default 3,
  owned_themes text[] default array['default'],
  owned_voices text[] default array['Kore'],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. PROJECTS TABLE
-- Stores the generated cartoons
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id text references profiles(user_id) on delete cascade,
  title text,
  script jsonb, -- Stores the full script/scenes data
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table projects enable row level security;

-- POLICIES
-- For this simple "anonymous auth" demo where the ID is stored in localStorage,
-- we will effectively allow public access but ideally, the app would send the ID.
-- Since we aren't using Supabase Auth (GoTrue) fully yet, we'll use a simple "public" policy
-- but restricting updates to matching user_id would require actual Auth tokens.

-- OPEN ACCESS FOR DEMO (Simplest for this stage)
-- Warning: This allows anyone to read/write if they have the Anon key.
-- In a real app, use supabase.auth and RLS based on auth.uid()

create policy "Public profiles access"
on profiles for all
using (true)
with check (true);

create policy "Public projects access"
on projects for all
using (true)
with check (true);

-- OPTIONAL: Seed some data if you want generic public projects
-- insert into projects (title, script) values ('Demo Project', '{}');
