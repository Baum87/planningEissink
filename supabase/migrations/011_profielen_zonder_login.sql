-- ============================================================
-- 011_profielen_zonder_login.sql
-- Ontkoppelt profielen van auth.users zodat een projectleider
-- in het systeem kan bestaan zonder loginaccount.
--
-- Wat verandert:
--   - user_id kolom toegevoegd (nullable FK → auth.users)
--   - Bestaande profielen: user_id = id (hadden al een account)
--   - FK profielen.id → auth.users verwijderd
--   - id krijgt gen_random_uuid() als default voor nieuwe rijen
--
-- Projecten die naar profielen.id verwijzen blijven onaangetast —
-- de bestaande UUID-waarden veranderen niet.
-- ============================================================

-- Stap 1: user_id kolom toevoegen (nullable)
alter table profielen
  add column user_id uuid references auth.users(id) on delete set null;

-- Stap 2: bestaande profielen koppelen aan hun loginaccount
-- (id was gelijk aan auth.users.id — dat bewaren we in user_id)
update profielen set user_id = id;

-- Stap 3: unieke koppeling afdwingen (max 1 profiel per loginaccount)
alter table profielen
  add constraint profielen_user_id_unique unique (user_id);

-- Stap 4: FK van profielen.id → auth.users loskoppelen
-- (id blijft PK, maar is niet meer gebonden aan een loginaccount)
alter table profielen drop constraint profielen_id_fkey;

-- Stap 5: id krijgt automatisch een UUID voor nieuwe profielen zonder account
alter table profielen alter column id set default gen_random_uuid();

-- ─── Validatie ────────────────────────────────────────────────
-- Voer dit uit na de migratie — counts moeten kloppen.
select
  count(*)                                    as totaal_profielen,
  count(user_id)                              as met_loginaccount,
  count(*) filter (where user_id is null)     as zonder_loginaccount
from profielen;
