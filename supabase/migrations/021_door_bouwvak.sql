-- Migratie 021: door_bouwvak vlag op prognose_projecten
-- Geeft per project aan of het doorloopt in de bouwvak (kalenderweken)
-- of stopt en hervat na de bouwvak (werkweken, default).
-- Bestaande records krijgen automatisch false via de DEFAULT.

ALTER TABLE prognose_projecten
  ADD COLUMN door_bouwvak boolean NOT NULL DEFAULT false;
