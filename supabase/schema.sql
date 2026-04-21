-- Run this once in the Supabase SQL editor.
-- Creates the `posts` table that the generator writes to and the web app reads from.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  post_date date unique not null,
  ai_post text not null,
  web3_post text not null,
  ai_sources jsonb not null default '[]'::jsonb,
  web3_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_post_date_desc on public.posts (post_date desc);

alter table public.posts enable row level security;

drop policy if exists "public read" on public.posts;
create policy "public read"
  on public.posts
  for select
  to anon
  using (true);
