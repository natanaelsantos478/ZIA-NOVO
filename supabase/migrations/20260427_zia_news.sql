-- Tabela de novidades do sistema — gerenciada pela Zitasoftware via painel admin
create table if not exists public.zia_news_items (
  id           uuid primary key default gen_random_uuid(),
  titulo       text,
  descricao    text,
  arquivo_url  text,
  arquivo_nome text,
  arquivo_tipo text,
  ativo        boolean not null default true,
  ordem        integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.zia_news_items enable row level security;

create policy "zia_news_select" on public.zia_news_items
  for select using (true);

create policy "zia_news_all" on public.zia_news_items
  for all using (true) with check (true);

-- Bucket público para anexos de novidades
insert into storage.buckets (id, name, public)
  values ('zia-news', 'zia-news', true)
  on conflict (id) do nothing;

create policy "zia_news_storage_select" on storage.objects
  for select using (bucket_id = 'zia-news');

create policy "zia_news_storage_insert" on storage.objects
  for insert with check (bucket_id = 'zia-news');

create policy "zia_news_storage_delete" on storage.objects
  for delete using (bucket_id = 'zia-news');
