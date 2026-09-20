# Novel-Map

## Manual video approval

This app now uploads videos as `pending`. `Holo-Map.html` only displays videos after an admin approves them from `Admin.html`.

### Supabase setup

1. Open the Supabase Dashboard for project `rzrsuvnmyxgapeufxfwg`.
2. Go to SQL Editor and run `supabase-manual-approval.sql`.
3. Go to Authentication > Users and create an admin user with email/password.
4. Copy that user's UUID.
5. In SQL Editor, run:

```sql
insert into public.admin_users (user_id)
values ('PASTE_AUTH_USER_UUID_HERE')
on conflict (user_id) do nothing;
```

### Review workflow

1. Users upload from `Map-upload.html`.
2. Admin signs in at `Admin.html`.
3. Click `通過` to publish a video to the map, or `拒絕` to keep it hidden.
