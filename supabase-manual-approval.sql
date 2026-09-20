create table if not exists public.public_map_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint public_map_videos_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

alter table public.public_map_videos
add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'public_map_videos_status_check'
  ) then
    alter table public.public_map_videos
    add constraint public_map_videos_status_check
    check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.public_map_videos enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Allow public read" on public.public_map_videos;
drop policy if exists "Allow public insert" on public.public_map_videos;
drop policy if exists "Allow public read approved videos" on public.public_map_videos;
drop policy if exists "Allow public insert pending videos" on public.public_map_videos;
drop policy if exists "Allow admins to read all videos" on public.public_map_videos;
drop policy if exists "Allow admins to update video status" on public.public_map_videos;

create policy "Allow public read approved videos"
on public.public_map_videos
for select
using (status = 'approved');

create policy "Allow public insert pending videos"
on public.public_map_videos
for insert
with check (status = 'pending');

create policy "Allow admins to read all videos"
on public.public_map_videos
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create policy "Allow admins to update video status"
on public.public_map_videos
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Allow admins to read admin list" on public.admin_users;

create policy "Allow admins to read admin list"
on public.admin_users
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin_check
    where admin_check.user_id = (select auth.uid())
  )
);

-- After creating your Supabase Auth admin user, replace the UUID below and run it once.
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
