-- Enforce the application's current upload limits and formats at the Storage service,
-- and ensure published training media is readable only by active professionals or
-- team members with the training permission.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png']::text[],
    updated_at = now()
where id = 'professional-documents';

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4','video/webm','video/quicktime']::text[],
    updated_at = now()
where id = 'training-media';

drop policy if exists training_media_read on storage.objects;
create policy training_media_read
on storage.objects for select to authenticated
using (
  bucket_id = 'training-media'
  and (
    public.has_permission('treinamentos')
    or (
      (public.current_profile()).role = 'profissional'
      and coalesce(
        nullif(user_metadata->>'published','')::boolean,
        nullif(metadata->>'published','')::boolean,
        false
      )
    )
  )
);
