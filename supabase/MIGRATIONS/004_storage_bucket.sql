-- ─── Migration 004: Supabase Storage bucket for reconciliation files ────────
-- Run this in the Supabase SQL editor or via the dashboard.

-- Create the storage bucket (if not already created via dashboard)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recon-files',
  'recon-files',
  false,   -- private bucket — files are NOT publicly accessible
  10485760,  -- 10 MB limit per file
  array['text/csv','application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain']
)
on conflict (id) do nothing;

-- ── RLS policies for the bucket ──────────────────────────────────────────────

-- Members of the org that owns the reconciliation can upload files
create policy "org members can upload recon files"
  on storage.objects for insert
  with check (
    bucket_id = 'recon-files'
    and (
      -- Path convention: {org_id}/{recon_id}/{file_type}/{filename}
      -- We validate the org prefix matches the user's org
      exists (
        select 1 from org_members
        where org_members.user_id  = auth.uid()
          and org_members.is_active = true
          and (storage.foldername(name))[1] = org_members.org_id::text
      )
    )
  );

-- Members can download files in their org
create policy "org members can download recon files"
  on storage.objects for select
  using (
    bucket_id = 'recon-files'
    and exists (
      select 1 from org_members
      where org_members.user_id  = auth.uid()
        and org_members.is_active = true
        and (storage.foldername(name))[1] = org_members.org_id::text
    )
  );

-- Members can delete files in their org (for re-uploads)
create policy "org members can delete recon files"
  on storage.objects for delete
  using (
    bucket_id = 'recon-files'
    and exists (
      select 1 from org_members
      where org_members.user_id  = auth.uid()
        and org_members.is_active = true
        and org_members.role     in ('owner','admin','reviewer','analyst')
        and (storage.foldername(name))[1] = org_members.org_id::text
    )
  );
