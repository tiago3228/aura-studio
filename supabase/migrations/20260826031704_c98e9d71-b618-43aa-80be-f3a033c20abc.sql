
create policy "clinic_files_read" on storage.objects for select to authenticated
using (bucket_id = 'clinic-files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "clinic_files_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'clinic-files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "clinic_files_update" on storage.objects for update to authenticated
using (bucket_id = 'clinic-files' and public.is_org_member(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'clinic-files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "clinic_files_delete" on storage.objects for delete to authenticated
using (bucket_id = 'clinic-files' and public.is_org_member(((storage.foldername(name))[1])::uuid));
