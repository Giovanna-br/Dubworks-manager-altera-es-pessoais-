-- Bucket público usado pelas capas dos projetos.
insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do update set public = excluded.public;

-- O app usa autenticação própria; por isso o upload precisa aceitar o papel anon.
-- A aplicação limita os arquivos a imagens de até 8 MB.
drop policy if exists "project covers public read" on storage.objects;
create policy "project covers public read"
on storage.objects for select
using (bucket_id = 'project-covers');

drop policy if exists "project covers upload" on storage.objects;
create policy "project covers upload"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'project-covers');
