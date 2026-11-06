-- Catalogue public des fiches pédagogiques publiées par l’administration.
-- Les navigateurs ne peuvent que lire le manifeste et les fichiers; seule
-- l’API Vercel, avec la clé service-role, peut publier ou remplacer le catalogue.

create table if not exists public.msp_prep_fiches_catalog (
  catalog_id text primary key check (catalog_id = 'current'),
  version text not null check (char_length(version) between 8 and 80),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.msp_prep_fiches_catalog enable row level security;
revoke all on table public.msp_prep_fiches_catalog from anon, authenticated;
grant select on table public.msp_prep_fiches_catalog to anon, authenticated;
grant all on table public.msp_prep_fiches_catalog to service_role;

drop policy if exists "Public may read published prep fiches catalog"
  on public.msp_prep_fiches_catalog;
create policy "Public may read published prep fiches catalog"
  on public.msp_prep_fiches_catalog
  for select
  to anon, authenticated
  using (true);

create or replace function public.touch_msp_prep_fiches_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists msp_prep_fiches_catalog_updated_at
  on public.msp_prep_fiches_catalog;
create trigger msp_prep_fiches_catalog_updated_at
  before update on public.msp_prep_fiches_catalog
  for each row execute function public.touch_msp_prep_fiches_catalog_updated_at();

-- Les objets sont adressés par un identifiant de snapshot, ce qui évite les
-- collisions entre publications et permet de cacher chaque page durablement.
-- 45 MB laisse une marge sous la limite Free de 50 MB par objet.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'msp-prep-fiches',
  'msp-prep-fiches',
  true,
  45000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Aucune politique d’écriture publique n’est créée. La publication passe par
-- l’API serveur et des URL temporaires d’envoi signées.
