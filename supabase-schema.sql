-- Master Soutien Pedagogique - Schema Supabase
-- A executer dans Supabase > SQL Editor > New query > Run.
-- Ce schema cree les tables necessaires pour :
-- 1. la sauvegarde cloud chiffree de bout en bout,
-- 2. la validation serveur des codes d'acces,
-- 3. la revocation/reactivation des codes par l'administrateur.
-- NOTE (6 nov. 2026) : pour synchroniser les fiches pédagogiques officielles,
-- exécuter séparément supabase/migrations/20261106_prep_fiches_catalog.sql.
-- Cette migration n’ouvre aucune écriture publique; la publication exige l’API Vercel.

-- Extensions utiles
create extension if not exists pgcrypto;

-- =========================================================
-- 1) Sauvegardes chiffrees des utilisateurs
-- =========================================================
-- IMPORTANT : la colonne data contient des donnees deja chiffrees cote application.
-- Supabase ne voit jamais les notes/eleves en clair.

create table if not exists public.backups (
  sync_code text primary key,
  data text not null,
  updated_at timestamptz not null default now()
);

create index if not exists backups_updated_at_idx
on public.backups (updated_at desc);

alter table public.backups enable row level security;

drop policy if exists "backups_anon_select" on public.backups;
drop policy if exists "backups_anon_insert" on public.backups;
drop policy if exists "backups_anon_update" on public.backups;

create policy "backups_anon_select"
on public.backups
for select
to anon
using (true);

create policy "backups_anon_insert"
on public.backups
for insert
to anon
with check (true);

create policy "backups_anon_update"
on public.backups
for update
to anon
using (true)
with check (true);

-- Met automatiquement updated_at a jour lors des updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists backups_set_updated_at on public.backups;
create trigger backups_set_updated_at
before update on public.backups
for each row
execute function public.set_updated_at();

-- =========================================================
-- 2) Licences / codes d'acces payants
-- =========================================================
-- Le code est stocke sans tirets (format nettoye), le nom est normalise
-- par l'application avant envoi au serveur.
-- status = active | revoked

create table if not exists public.licenses (
  code text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licenses_status_idx
on public.licenses (status);

create index if not exists licenses_created_at_idx
on public.licenses (created_at desc);

alter table public.licenses enable row level security;

drop policy if exists "licenses_anon_select" on public.licenses;
drop policy if exists "licenses_anon_insert" on public.licenses;
drop policy if exists "licenses_anon_update" on public.licenses;

-- L'application doit pouvoir verifier un code, donc select est autorise.
create policy "licenses_anon_select"
on public.licenses
for select
to anon
using (true);

-- L'espace administrateur de l'application enregistre les codes generes.
create policy "licenses_anon_insert"
on public.licenses
for insert
to anon
with check (true);

-- L'espace administrateur peut revoquer/reactiver un code.
create policy "licenses_anon_update"
on public.licenses
for update
to anon
using (true)
with check (true);

drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
before update on public.licenses
for each row
execute function public.set_updated_at();

-- =========================================================
-- 3) Vue utile pour verifier rapidement dans Supabase
-- =========================================================

create or replace view public.licenses_admin_view as
select
  code,
  name,
  status,
  created_at,
  updated_at
from public.licenses
order by created_at desc;

-- =========================================================
-- 4) Donnees de test facultatives
-- =========================================================
-- Ne pas executer en production, sauf pour tester manuellement.
-- insert into public.licenses (code, name, status)
-- values ('TEST000000000000', 'enseignant test', 'active')
-- on conflict (code) do update set status = excluded.status;
