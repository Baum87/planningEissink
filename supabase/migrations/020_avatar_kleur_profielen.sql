-- ============================================================
-- 020_avatar_kleur_profielen.sql
-- Voegt avatar_kleur toe aan profielen zodat admins een vaste
-- kleur per gebruiker kunnen instellen in het Beheer-tabblad.
-- Nullable — bestaande gebruikers krijgen de hash-fallback.
-- ============================================================

alter table profielen
  add column avatar_kleur varchar(7) null;

-- ─── Validatie ────────────────────────────────────────────────

select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'profielen'
  and column_name = 'avatar_kleur';
