-- ============================================================
-- 019_audit_prognose_projecten.sql
-- Voegt audit-logging toe aan prognose_projecten.
-- De log_wijziging() functie bestaat al (migratie 016).
-- ============================================================

create trigger audit_prognose_projecten
  after insert or update or delete on public.prognose_projecten
  for each row execute function log_wijziging();

-- ─── Validatie ────────────────────────────────────────────────
-- Verwacht: 4 triggers zichtbaar (projecten, monteurs, toewijzingen, prognose_projecten)

select trigger_name, event_object_table, event_manipulation
from information_schema.triggers
where trigger_name like 'audit_%'
order by event_object_table, event_manipulation;
