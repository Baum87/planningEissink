# Onboarding — nieuwe tenant opzetten

Dit stappenplan doorloop je wanneer je een nieuwe klant aansluit op de planning app.
De app is multi-tenant: elke klant deelt dezelfde Supabase database, maar ziet alleen zijn eigen data.

---

## Benodigdheden

- Toegang tot Supabase dashboard (SQL Editor + Authentication)
- Naam, slug en kleur van de nieuwe tenant (vraag dit bij de klant op)
- CSV-export van monteurs en projecten (indien beschikbaar)
- E-mailadres van de eerste admin-gebruiker bij de klant

---

## Stap 1 — Tenant aanmaken in Supabase

Ga naar **Supabase → SQL Editor** en voer het volgende uit. Pas de waarden aan:

```sql
-- 1. Tenant aanmaken
insert into tenants (naam, slug, primaire_kleur, label_project, label_monteur)
values (
  'Bedrijfsnaam BV',     -- volledige naam
  'bedrijfsnaam',        -- unieke slug (kleine letters, geen spaties)
  '#2563eb',             -- primaire kleur (optioneel)
  'project',             -- hoe het woord "project" heet bij deze klant
  'monteur'              -- hoe het woord "monteur" heet bij deze klant
)
returning id;            -- sla dit UUID op — je hebt het in de volgende stappen nodig
```

```sql
-- 2. Tenant instellingen aanmaken (gebruik het id uit stap 1)
insert into tenant_instellingen (tenant_id)
values ('<tenant_id_uit_stap_1>');
```

---

## Stap 2 — Eerste admin-gebruiker aanmaken

De eerste gebruiker kan nog niet via de app worden aangemaakt (die vereist een bestaande admin). Doe dit direct in Supabase.

**Ga naar Authentication → Users → Add user → Create new user**

Vul in:
- E-mailadres van de admin
- Tijdelijk wachtwoord (de gebruiker kan dit later wijzigen)
- Zet "Auto Confirm User" aan

Kopieer het UUID van de nieuwe gebruiker — je hebt dit in de volgende stap nodig.

---

## Stap 3 — app_metadata instellen op de eerste gebruiker

Ga naar **SQL Editor** en voer uit (vervang beide UUIDs):

```sql
-- Koppelt de gebruiker aan de tenant en geeft admin-rechten
update auth.users
set app_metadata = jsonb_build_object(
  'rol',       'admin',
  'naam',      'Voornaam Achternaam',
  'tenant_id', '<tenant_id_uit_stap_1>',
  'afkorting', 'XX'   -- optioneel, max 4 tekens
)
where id = '<user_id_uit_stap_2>';
```

Maak daarna ook een profiel aan voor deze gebruiker:

```sql
insert into profielen (user_id, tenant_id, weergave_naam, afkorting)
values (
  '<user_id_uit_stap_2>',
  '<tenant_id_uit_stap_1>',
  'Voornaam Achternaam',
  'XX'
);
```

---

## Stap 4 — Inloggen en testen

Log in met de nieuwe admin-gebruiker via de app. Controleer:
- De tenantnaam staat linksboven in de header
- Alle tabs zijn zichtbaar (Planning, Overzicht, Projecten, Monteurs, Beheer)
- Beheer → Gebruikers toont de admin zelf

---

## Stap 5 — Expertises instellen

Ga in de app naar **Beheer → Expertises** en voeg de vakgebieden toe die voor deze klant gelden.

Dit kan ook via SQL als je een lijst hebt:

```sql
insert into tenant_expertises (tenant_id, naam, volgorde) values
  ('<tenant_id>', 'Plafonds',      1),
  ('<tenant_id>', 'Wanden',        2),
  ('<tenant_id>', 'Systeemwanden', 3),
  ('<tenant_id>', 'Afsmeren',      4),
  ('<tenant_id>', 'Overig',        5);
```

---

## Stap 6 — Monteurs importeren via CSV

Als de klant een ledenlijst aanlevert, importeer je die via SQL. Zet de CSV eerst om naar een insert-statement, of gebruik het onderstaande patroon:

```sql
insert into monteurs (tenant_id, voornaam, achternaam, type, expertises, telefoon, woonplaats)
values
  ('<tenant_id>', 'Jan',   'Jansen',   'Intern',        '{"Plafonds"}',           '06-12345678', 'Amsterdam'),
  ('<tenant_id>', 'Piet',  'Pietersen','Intern',        '{"Wanden","Afsmeren"}',  null,          'Utrecht'),
  ('<tenant_id>', 'Kees',  'de Vries', 'Onderaannemer', '{}',                     '06-87654321', null);
```

Type moet exact `'Intern'` of `'Onderaannemer'` zijn (hoofdlettergevoelig).

---

## Stap 7 — Projecten importeren via CSV

```sql
insert into projecten (tenant_id, werknummer, omschrijving, opdrachtgever, plaats)
values
  ('<tenant_id>', '2024-001', 'Verbouwing kantoor',  'Opdrachtgever BV', 'Amsterdam'),
  ('<tenant_id>', '2024-002', 'Nieuwbouw hal',       'Ander Bedrijf',    'Rotterdam');
```

---

## Stap 8 — Overige gebruikers aanmaken

Nu de admin is ingelogd, kunnen overige gebruikers via de app worden aangemaakt:

**Beheer → Gebruikers → Persoon toevoegen of Gebruiker uitnodigen**

Twee opties:
- **Via uitnodiging** — de gebruiker ontvangt een e-mail met een link om een wachtwoord in te stellen
- **Direct aanmaken** — jij stelt direct een wachtwoord in en geeft dat door aan de gebruiker

---

## Stap 9 — Opleverchecklist

- [ ] Tenant aangemaakt en instellingen correct
- [ ] Eerste admin kan inloggen
- [ ] Expertises ingesteld
- [ ] Monteurs geïmporteerd
- [ ] Projecten geïmporteerd
- [ ] Overige gebruikers aangemaakt
- [ ] Elke gebruiker kan inloggen en ziet de juiste data
- [ ] Verwerkersovereenkomst ondertekend (zie docs/verwerkersovereenkomst.md)

---

## Veelvoorkomende fouten

**Gebruiker ziet "geen data" na inloggen**
app_metadata ontbreekt of `tenant_id` klopt niet. Controleer via SQL:
```sql
select id, email, app_metadata from auth.users where email = 'email@bedrijf.nl';
```

**Monteur-type geeft een fout bij import**
Type moet exact `'Intern'` of `'Onderaannemer'` zijn — inclusief hoofdletter, zonder spaties.

**Profiel ontbreekt in Beheer-scherm**
Controleer of er een rij in de `profielen` tabel staat voor de gebruiker. Zie stap 3.
