-- Tabela de novidades/anúncios exibidos na tela de entrada
create table if not exists novidades (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null,
  titulo       text,
  imagem_url   text not null,
  storage_path text,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz default now()
);

create index if not exists novidades_tenant_ativo on novidades (tenant_id, ativo, ordem);

alter table novidades enable row level security;

create policy "tenant vê suas novidades"
  on novidades for select
  using (tenant_id = (current_setting('app.tenant_id', true))::uuid);

create policy "tenant gerencia suas novidades"
  on novidades for all
  using (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Bucket público para imagens de novidades
insert into storage.buckets (id, name, public)
values ('novidades', 'novidades', true)
on conflict (id) do nothing;

create policy "novidades leitura pública"
  on storage.objects for select
  using (bucket_id = 'novidades');

create policy "novidades upload autenticado"
  on storage.objects for insert
  with check (bucket_id = 'novidades');

create policy "novidades delete autenticado"
  on storage.objects for delete
  using (bucket_id = 'novidades');
