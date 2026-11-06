-- Gateway IA MSP : accès par codes IA dédiés, quotas et journal minimal.
-- Exécuter une seule fois dans le SQL Editor du projet Supabase.
-- Aucun texte de conversation ni réponse de modèle n'est stocké dans ces tables.

create table if not exists public.msp_ai_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (char_length(display_name) between 1 and 120),
  role text not null check (role in ('principal', 'team')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  daily_limit integer not null default 25 check (daily_limit between 1 and 1000)
);

create table if not exists public.msp_ai_usage (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.msp_ai_access_tokens(id) on delete cascade,
  provider text not null,
  model text not null,
  input_chars integer not null default 0 check (input_chars >= 0),
  output_chars integer not null default 0 check (output_chars >= 0),
  status text not null default 'started' check (status in ('started', 'success', 'error')),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists msp_ai_usage_token_created_idx
  on public.msp_ai_usage (token_id, created_at desc);
create index if not exists msp_ai_usage_created_idx
  on public.msp_ai_usage (created_at desc);

alter table public.msp_ai_access_tokens enable row level security;
alter table public.msp_ai_usage enable row level security;
revoke all on table public.msp_ai_access_tokens from public, anon, authenticated;
revoke all on table public.msp_ai_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.msp_ai_access_tokens to service_role;
grant select, insert, update, delete on table public.msp_ai_usage to service_role;

create or replace function public.msp_ai_reserve_request(
  p_token_id uuid,
  p_provider text,
  p_model text,
  p_input_chars integer,
  p_per_minute_limit integer,
  p_global_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_daily_limit integer;
  v_minute_count integer;
  v_daily_count integer;
  v_global_count integer;
  v_request_id uuid;
begin
  -- Sérialise les appels d'un même code et le plafond global pour éviter
  -- que des requêtes simultanées dépassent facilement les quotas.
  perform pg_advisory_xact_lock(hashtextextended(p_token_id::text, 0));
  perform pg_advisory_xact_lock(8675309, 1);

  select daily_limit into v_daily_limit
  from public.msp_ai_access_tokens
  where id = p_token_id
    and is_active = true
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  select
    count(*) filter (where created_at >= now() - interval '1 minute'),
    count(*) filter (where created_at >= date_trunc('day', now()))
  into v_minute_count, v_daily_count
  from public.msp_ai_usage
  where token_id = p_token_id
    and status in ('started', 'success', 'error');

  if v_minute_count >= greatest(1, least(p_per_minute_limit, 20)) then
    return jsonb_build_object('ok', false, 'reason', 'minute');
  end if;
  if v_daily_count >= v_daily_limit then
    return jsonb_build_object('ok', false, 'reason', 'daily');
  end if;

  select count(*) into v_global_count
  from public.msp_ai_usage
  where created_at >= date_trunc('day', now())
    and status in ('started', 'success', 'error');

  if v_global_count >= greatest(1, least(p_global_daily_limit, 100000)) then
    return jsonb_build_object('ok', false, 'reason', 'global');
  end if;

  insert into public.msp_ai_usage (token_id, provider, model, input_chars, status)
  values (p_token_id, left(p_provider, 40), left(p_model, 100), greatest(0, p_input_chars), 'started')
  returning id into v_request_id;

  return jsonb_build_object('ok', true, 'request_id', v_request_id);
end;
$$;

create or replace function public.msp_ai_finish_request(
  p_request_id uuid,
  p_status text,
  p_output_chars integer,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('success', 'error') then
    return false;
  end if;

  update public.msp_ai_usage
  set status = p_status,
      output_chars = greatest(0, p_output_chars),
      error_code = case when p_status = 'error' then left(coalesce(p_error_code, ''), 80) else null end,
      finished_at = now()
  where id = p_request_id
    and status = 'started';

  return found;
end;
$$;

revoke all on function public.msp_ai_reserve_request(uuid, text, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.msp_ai_finish_request(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.msp_ai_reserve_request(uuid, text, text, integer, integer, integer) to service_role;
grant execute on function public.msp_ai_finish_request(uuid, text, integer, text) to service_role;
