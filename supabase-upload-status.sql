-- Run after supabase-manual-approval.sql. Existing upload UUIDs work as tracking IDs.
begin;

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- The unguessable UUID authorizes a status-only lookup for anonymous uploaders.
-- Keep this privileged helper outside the exposed API schemas.
create or replace function private.get_video_upload_status(p_upload_id uuid)
returns table (id uuid, status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select video.id, video.status, video.created_at
  from public.public_map_videos as video
  where video.id = p_upload_id;
$$;

revoke all on function private.get_video_upload_status(uuid) from public;
grant execute on function private.get_video_upload_status(uuid) to anon, authenticated;

create or replace function public.get_video_upload_status(p_upload_id uuid)
returns table (id uuid, status text, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_video_upload_status(p_upload_id);
$$;

revoke all on function public.get_video_upload_status(uuid) from public;
grant execute on function public.get_video_upload_status(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
