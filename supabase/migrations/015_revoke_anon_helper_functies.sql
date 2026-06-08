-- ============================================================
-- 015_revoke_anon_helper_functies.sql
-- Vervolg op 014: REVOKE FROM public dekte de anon-rol niet af
-- omdat Supabase daar een expliciete grant op had staan.
-- ============================================================

revoke execute on function get_user_rol()       from anon;
revoke execute on function get_user_tenant_id() from anon;
