-- 1) Create the table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Optional: add an index for lookup speed
create index if not exists waitlist_email_idx
on public.waitlist (email);

-- 2) Enable Row Level Security
alter table public.waitlist enable row level security;

-- 3) Allow anonymous users to insert emails
create policy "Anyone can join waitlist"
  on public.waitlist
  for insert
  with check (true);

-- 4) Allow only admins/service role to read the table
create policy "Only admins can read waitlist"
  on public.waitlist
  for select
  using (false);

-- 5) Optional: allow only authenticated admins to delete rows
create policy "Only admins can delete waitlist rows"
  on public.waitlist
  for delete
  using (false);

-- If you want to see rows in your Supabase dashboard, you can temporarily allow read access:
-- create policy "Allow service role read access"
-- on public.waitlist
-- for select
-- using (true);
