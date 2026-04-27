-- Tabela global de novidades — gerenciada pelo admin 00000, visível a todos os logins
drop table if exists novidades cascade;

create table novidades (
  id           uuid primary key default gen_random_uuid(),
  titulo       text,
  imagem_url   text not null,
  storage_path text,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz default now()
);

create index if not exists novidades_ativo_ordem on novidades (ativo, ordem);

-- RLS aberta: leitura pública, escrita via UI do admin (protegida por senha)
alter table novidades enable row level security;
create policy "novidades leitura pública" on novidades for select using (true);
create policy "novidades escrita admin"   on novidades for all    using (true);

-- Bucket público para as imagens
insert into storage.buckets (id, name, public)
values ('novidades', 'novidades', true)
on conflict (id) do nothing;

create policy "novidades storage select" on storage.objects
  for select using (bucket_id = 'novidades');

create policy "novidades storage insert" on storage.objects
  for insert with check (bucket_id = 'novidades');

create policy "novidades storage delete" on storage.objects
  for delete using (bucket_id = 'novidades');
