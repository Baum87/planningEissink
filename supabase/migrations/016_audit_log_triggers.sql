-- ============================================================
-- 016_audit_log_triggers.sql
-- Vult audit_log automatisch bij wijzigingen op projecten,
-- monteurs en toewijzingen.
--
-- Veiligheidsontwerp:
--   - AFTER trigger: logt nadat de operatie al geslaagd is,
--     zodat de trigger de originele actie niet kan blokkeren
--     in de BEFORE-fase.
--   - EXCEPTION WHEN OTHERS THEN NULL: als het wegschrijven
--     naar audit_log om welke reden dan ook mislukt, wordt de
--     fout stilzwijgend opgegangen. De app blijft werken.
--   - SECURITY DEFINER + SET search_path: consistent met de
--     andere helper-functies in dit project.
-- ============================================================

-- ─── Trigger-functie ─────────────────────────────────────────

create or replace function log_wijziging()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.audit_log (
      tenant_id,
      user_id,
      actie,
      tabel,
      record_id,
      oude_waarde,
      nieuwe_waarde
    ) values (
      case tg_op when 'DELETE' then OLD.tenant_id else NEW.tenant_id end,
      auth.uid(),
      tg_op,
      tg_table_name,
      case tg_op when 'DELETE' then OLD.id else NEW.id end,
      case tg_op when 'INSERT' then null else to_jsonb(OLD) end,
      case tg_op when 'DELETE' then null else to_jsonb(NEW) end
    );
  exception when others then
    -- Logging mag de app nooit blokkeren — fout opvangen en doorgaan
    null;
  end;
  return null;
end;
$$;

-- ─── Triggers per tabel ──────────────────────────────────────

create trigger audit_projecten
  after insert or update or delete on public.projecten
  for each row execute function log_wijziging();

create trigger audit_monteurs
  after insert or update or delete on public.monteurs
  for each row execute function log_wijziging();

create trigger audit_toewijzingen
  after insert or update or delete on public.toewijzingen
  for each row execute function log_wijziging();

-- ─── Validatie ────────────────────────────────────────────────
-- Voer dit uit na de migratie. Verwacht: 3 triggers zichtbaar.

select trigger_name, event_object_table, event_manipulation
from information_schema.triggers
where trigger_name like 'audit_%'
order by event_object_table, event_manipulation;
