-- ============================================================
-- 014_fix_helper_functies_security.sql
-- Fixes twee Supabase Security Advisor warnings:
--   1. Function Search Path Mutable → SET search_path = ''
--   2. Public Can Execute SECURITY DEFINER → revoke van public,
--      expliciete grant aan authenticated (vereist voor RLS)
--
-- Warning 3 (Signed-In Users Can Execute) bewust niet gefixed:
-- revoking van authenticated breekt alle RLS policies.
-- Risico is nul — gebruikers zien alleen hun eigen JWT-data.
-- ============================================================

-- ─── 1. Search path fixen + functie herschrijven ─────────────

create or replace function get_user_rol()
returns text as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'rol',
    'geen'
  );
$$ language sql stable security definer
   set search_path = '';

create or replace function get_user_tenant_id()
returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$ language sql stable security definer
   set search_path = '';

-- ─── 2. Revoke van public, grant aan authenticated ───────────
-- REVOKE FROM public trekt rechten in van ALLE rollen.
-- Expliciete grant aan authenticated is verplicht — anders
-- falen alle RLS policies die deze functies aanroepen.

revoke execute on function get_user_rol()      from public;
revoke execute on function get_user_tenant_id() from public;

grant execute on function get_user_rol()       to authenticated;
grant execute on function get_user_tenant_id() to authenticated;

-- ─── Validatie ────────────────────────────────────────────────
-- Controleer na uitvoeren in Supabase SQL Editor als ingelogde
-- gebruiker — beide queries moeten een waarde teruggeven (niet null/fout).

select get_user_rol()       as mijn_rol;
select get_user_tenant_id() as mijn_tenant_id;
