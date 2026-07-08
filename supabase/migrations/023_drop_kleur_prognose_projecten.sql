-- Kleur wordt in Prognose Planning bepaald via de projectleider (avatar_kleur).
-- Bij geen projectleider: hash op project-id. Opgeslagen kleur is niet meer nodig.
alter table prognose_projecten drop column if exists kleur;
