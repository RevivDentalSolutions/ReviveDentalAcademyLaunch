-- Allow signed-in Academy administrators to upload their own builder media
-- directly to Storage. This avoids routing large MP4/image payloads through
-- a Vercel function and keeps write access limited to the existing admin role.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Academy admins upload builder media'
  ) then
    create policy "Academy admins upload builder media"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'academy-media'
        and (
          name like 'video-lesson-builder/%'
          or name like 'course-media/%'
        )
        and exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end $$;
