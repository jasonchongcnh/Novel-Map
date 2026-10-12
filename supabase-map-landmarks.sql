create table if not exists public.map_landmarks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  tag text not null check (char_length(btrim(tag)) between 1 and 40),
  address text not null default '' check (char_length(address) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  image_url text not null default '' check (
    char_length(image_url) <= 2048 and (image_url = '' or image_url ~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$')
  ),
  link text not null default '' check (
    char_length(link) <= 2048 and (link = '' or link ~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$')
  ),
  description text not null default '' check (char_length(description) <= 1000),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists map_landmarks_public_created_at_idx
  on public.map_landmarks (created_at desc)
  where status = 'approved';

create index if not exists map_landmarks_pending_created_at_idx
  on public.map_landmarks (created_at)
  where status = 'pending';

alter table public.map_landmarks enable row level security;

grant select, insert on public.map_landmarks to anon, authenticated;
grant update on public.map_landmarks to authenticated;

drop policy if exists "Allow public read approved landmarks" on public.map_landmarks;
create policy "Allow public read approved landmarks"
on public.map_landmarks
for select
using (status = 'approved');

drop policy if exists "Allow public insert pending landmarks" on public.map_landmarks;
create policy "Allow public insert pending landmarks"
on public.map_landmarks
for insert
with check (status = 'pending');

drop policy if exists "Allow admins to read all landmarks" on public.map_landmarks;
create policy "Allow admins to read all landmarks"
on public.map_landmarks
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Allow admins to update landmark status" on public.map_landmarks;
create policy "Allow admins to update landmark status"
on public.map_landmarks
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
