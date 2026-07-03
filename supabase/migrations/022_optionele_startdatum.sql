-- Migratie 022: start_datum en duur_weken optioneel maken
-- Projecten zonder datum verschijnen als rij in de prognose zonder balk.
-- Bestaande records blijven ongewijzigd (hebben al waarden).

ALTER TABLE prognose_projecten
  ALTER COLUMN start_datum DROP NOT NULL,
  ALTER COLUMN duur_weken DROP NOT NULL;
