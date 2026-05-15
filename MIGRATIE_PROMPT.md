# Claude Code prompt — Multi-tenancy migratie

## Doel
Migreer de planningsapplicatie van een single-tenant naar een multi-tenant architectuur.
Dit is een voorbereiding op commerciële uitrol aan meerdere klanten.
Werk stap voor stap. Valideer elke stap voor je verdergaat. Breek niets in de bestaande Eissink-functionaliteit.

---

## STATUS (bijgewerkt 2026-05-13)

### Afgerond ✅
- **Stap 1** — Nieuw Supabase project aangemaakt + 001_initial_schema.sql uitgevoerd
- **Stap 2** — 002_rls_policies.sql uitgevoerd
- **Stap 3** — seed.sql uitgevoerd (demo tenant + Eissink tenant)
- **Stap 4** — migrate_eissink.sql klaargemaakt (nog niet uitgevoerd — wacht op data-export)
- **Stap 5** — TenantContext.jsx aangemaakt
- **Stap 6** — Services bijgewerkt: tenant_id in alle inserts
- **Stap 7** — App.jsx: TenantProvider + tenantnaam uit database in header
- **Stap 8** — Hardcoded "Eissink" verwijderd: Login, monteur type 'Eissink'→'Intern'
- **Stap 9** — kolomZichtbaar() + veldLabel() in Projecten + Monteurs; aanneemsom verwijderd; opmerkingen + adres toegevoegd; expertises per tenant uit DB
- **Stap 10** — Voorbereiding klaar; SQL template beschikbaar; 2 Eissink-gebruikers worden bij stap 12 handmatig aangemaakt
- **Stap 11** — Lokaal getest en gevalideerd ✅

### Extra wijzigingen doorgevoerd (buiten originele prompt)
- Rollen hernoemd: `beheerder`→`admin`, `projectleider`→`gebruiker`, `monteur` toegevoegd (005_rename_roles.sql)
- Aanneemsom volledig verwijderd (geen financiële data in planningsapp)
- `tenant_expertises` tabel: expertises per tenant configureerbaar
- `veld_labels` JSONB in tenant_instellingen: kolomlabels per tenant aanpasbaar
- Naam gebruiker in header komt uit `app_metadata.naam` (niet meer hardcoded)

### Nog te doen ⬜
- **Stap 12** — Eissink data migreren (zie hieronder)
- **Stap 13** — Vercel omgevingsvariabelen bijwerken
- **Stap 14** — CONTEXT.md bijwerken

### Openstaande SQL (testproject — nog uitvoeren indien niet gedaan)
- `005_rename_roles.sql` uitvoeren in Supabase SQL editor

---

## Supabase projecten

| Omgeving | Project ID | Status |
|---|---|---|
| **Productie (Eissink live)** | `qrnsjldoeobipqclpdxu` | Ongewijzigd, Eissink werkt hier nog op |
| **Nieuw testproject** | `ypzdytntsgmnjcbbyrsd` | Actief in `.env.local` |

`.env.local` wijzigen? Zie onderaan dit bestand.

---

## Context
- Stack: React + Tailwind CSS, Supabase (PostgreSQL), Vercel
- Huidig Supabase project: qrnsjldoeobipqclpdxu (Eissink productie)
- We maken een NIEUW Supabase project aan voor de multi-tenant opzet
- Lokaal testen eerst via .env.local — pas daarna Vercel omgevingsvariabelen aanpassen
- CONTEXT.md in de projectroot is de leidraad — update deze aan het einde

---

## Stap 1 — Nieuw Supabase project voorbereiden

Maak een bestand `supabase/migrations/001_initial_schema.sql` aan met het volledige nieuwe schema.

### Nieuwe tabellen

```sql
-- Tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text not null unique,
  logo_url text,
  primaire_kleur text default '#2563eb',
  label_project text default 'project',
  label_monteur text default 'monteur',
  actief boolean default true,
  created_at timestamptz default now()
);

-- Tenant instellingen (JSONB voor maximale flexibiliteit)
create table tenant_instellingen (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  kolommen_config jsonb default '{
    "projecten": {
      "werknummer": true,
      "omschrijving": true,
      "opdrachtgever": true,
      "plaats": true,
      "aanneemsom": true,
      "projectleider_initialen": true,
      "aantal_personen": true,
      "mandagen": true
    },
    "monteurs": {
      "naam": true,
      "bedrijfsnaam": true,
      "type": true,
      "expertises": true,
      "telefoon": true,
      "woonplaats": true
    }
  }',
  modules_config jsonb default '{
    "planning": true,
    "projecten": true,
    "monteurs": true,
    "overzicht": true
  }',
  updated_at timestamptz default now()
);

-- Audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  actie text not null,
  tabel text not null,
  record_id uuid,
  oude_waarde jsonb,
  nieuwe_waarde jsonb,
  created_at timestamptz default now()
);
```

### Bestaande tabellen uitbreiden met tenant_id

```sql
-- Projecten
alter table projecten add column tenant_id uuid references tenants(id) on delete cascade;
alter table projecten add column extern_id text; -- al aanwezig, check eerst

-- Monteurs (extern_id toevoegen)
alter table monteurs add column tenant_id uuid references tenants(id) on delete cascade;
alter table monteurs add column extern_id text;

-- Groepen
alter table groepen add column tenant_id uuid references tenants(id) on delete cascade;

-- Groep_leden (geen directe tenant_id nodig — loopt via groepen)

-- Toewijzingen
alter table toewijzingen add column tenant_id uuid references tenants(id) on delete cascade;

-- Periodes (bouwvak, feestdagen — per tenant configureerbaar)
alter table periodes add column tenant_id uuid references tenants(id) on delete cascade;
```

### Indexen voor performance

```sql
create index idx_projecten_tenant_id on projecten(tenant_id);
create index idx_projecten_datum on toewijzingen(datum);
create index idx_monteurs_tenant_id on monteurs(tenant_id);
create index idx_groepen_tenant_id on groepen(tenant_id);
create index idx_toewijzingen_tenant_id on toewijzingen(tenant_id);
create index idx_toewijzingen_monteur_datum on toewijzingen(monteur_id, datum_van);
create index idx_toewijzingen_project_datum on toewijzingen(project_id, datum_van);
create index idx_periodes_tenant_id on periodes(tenant_id);
create index idx_audit_log_tenant_id on audit_log(tenant_id);
create index idx_audit_log_created_at on audit_log(created_at);
```

---

## Stap 2 — RLS policies

Maak `supabase/migrations/002_rls_policies.sql` aan.

### Helper functies

```sql
-- Bestaande functie uitbreiden
create or replace function get_user_rol()
returns text as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'rol',
    'geen'
  );
$$ language sql stable security definer;

-- Nieuwe functie voor tenant_id
create or replace function get_user_tenant_id()
returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$ language sql stable security definer;
```

### RLS inschakelen en policies aanmaken

```sql
-- Tenants: alleen eigen tenant zien
alter table tenants enable row level security;
create policy "tenant_select" on tenants
  for select using (id = get_user_tenant_id());

-- Tenant_instellingen
alter table tenant_instellingen enable row level security;
create policy "tenant_instellingen_select" on tenant_instellingen
  for select using (tenant_id = get_user_tenant_id());
create policy "tenant_instellingen_update" on tenant_instellingen
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'beheerder'
  );

-- Projecten
alter table projecten enable row level security;
create policy "projecten_select" on projecten
  for select using (tenant_id = get_user_tenant_id());
create policy "projecten_insert" on projecten
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );
create policy "projecten_update" on projecten
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );
create policy "projecten_delete" on projecten
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Monteurs (zelfde patroon)
alter table monteurs enable row level security;
create policy "monteurs_select" on monteurs
  for select using (tenant_id = get_user_tenant_id());
create policy "monteurs_insert" on monteurs
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );
create policy "monteurs_update" on monteurs
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );
create policy "monteurs_delete" on monteurs
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Groepen
alter table groepen enable row level security;
create policy "groepen_select" on groepen
  for select using (tenant_id = get_user_tenant_id());
create policy "groepen_write" on groepen
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Groep_leden (via groepen join)
alter table groep_leden enable row level security;
create policy "groep_leden_select" on groep_leden
  for select using (
    exists (
      select 1 from groepen g
      where g.id = groep_id
      and g.tenant_id = get_user_tenant_id()
    )
  );
create policy "groep_leden_write" on groep_leden
  for all using (
    exists (
      select 1 from groepen g
      where g.id = groep_id
      and g.tenant_id = get_user_tenant_id()
    )
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Toewijzingen
alter table toewijzingen enable row level security;
create policy "toewijzingen_select" on toewijzingen
  for select using (tenant_id = get_user_tenant_id());
create policy "toewijzingen_insert" on toewijzingen
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );
create policy "toewijzingen_delete" on toewijzingen
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Periodes (bouwvak, feestdagen)
alter table periodes enable row level security;
create policy "periodes_select" on periodes
  for select using (tenant_id = get_user_tenant_id());
create policy "periodes_write" on periodes
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- Audit log: alleen lezen voor beheerder
alter table audit_log enable row level security;
create policy "audit_log_select" on audit_log
  for select using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'beheerder'
  );
create policy "audit_log_insert" on audit_log
  for insert with check (tenant_id = get_user_tenant_id());
```

---

## Stap 3 — Seed data

Maak `supabase/seed.sql` aan met twee tenants.

```sql
-- Tenant 1: Eissink (leeg, klaar voor data migratie)
insert into tenants (id, naam, slug, primaire_kleur, label_project, label_monteur)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Eissink Plafond en Wand systemen',
  'eissink',
  '#2563eb',
  'project',
  'monteur'
);

insert into tenant_instellingen (tenant_id)
values ('a0000000-0000-0000-0000-000000000001');

-- Tenant 2: Demo Afbouw BV (fictieve data)
insert into tenants (id, naam, slug, primaire_kleur, label_project, label_monteur)
values (
  'b0000000-0000-0000-0000-000000000002',
  'Demo Afbouw BV',
  'demo',
  '#059669',
  'project',
  'monteur'
);

insert into tenant_instellingen (tenant_id)
values ('b0000000-0000-0000-0000-000000000002');

-- Demo monteurs
insert into monteurs (id, voornaam, achternaam, bedrijfsnaam, type, expertises, telefoon, woonplaats, tenant_id)
values
  (gen_random_uuid(), 'Jan', 'de Vries', 'Demo Afbouw BV', 'Eissink', array['Plafond', 'Wand'], '0612345678', 'Amsterdam', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Peter', 'Bakker', 'Demo Afbouw BV', 'Eissink', array['Plafond'], '0623456789', 'Utrecht', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Mohammed', 'Hassan', 'ZZP Hassan', 'Onderaannemer', array['Wand', 'Stucwerk'], '0634567890', 'Rotterdam', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Erik', 'Smit', 'Demo Afbouw BV', 'Eissink', array['Plafond', 'Stucwerk'], '0645678901', 'Den Haag', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Sven', 'Jansen', 'ZZP Jansen', 'Onderaannemer', array['Wand'], '0656789012', 'Eindhoven', 'b0000000-0000-0000-0000-000000000002');

-- Demo projecten
insert into projecten (id, werknummer, omschrijving, opdrachtgever, plaats, aanneemsom, projectleider_initialen, kleur, tenant_id)
values
  (gen_random_uuid(), '2024-001', 'Renovatie kantoor Zuidas', 'ING Bank', 'Amsterdam', 125000, 'JV', '#dbeafe', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-002', 'Nieuwbouw appartementen', 'Bouwfonds', 'Utrecht', 280000, 'PB', '#dcfce7', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-003', 'Plafond winkelcentrum', 'Vastgoed Noord', 'Rotterdam', 95000, 'JV', '#fef3c7', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-004', 'Wanden ziekenhuis vleugel B', 'UMCG', 'Groningen', 340000, 'ES', '#fce7f3', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-005', 'Interieur hotel centrum', 'NH Hotels', 'Amsterdam', 175000, 'PB', '#ede9fe', 'b0000000-0000-0000-0000-000000000002');

-- Demo groepen
insert into groepen (id, naam, tenant_id)
values
  ('c0000000-0000-0000-0000-000000000001', 'Team Noord', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'Team Zuid', 'b0000000-0000-0000-0000-000000000002');
```

---

## Stap 4 — Data migratie script (Eissink)

Maak `supabase/migrate_eissink.sql` aan. Dit script draai je EENMALIG nadat je de Eissink-data handmatig hebt geëxporteerd vanuit het oude project.

```sql
-- Voer dit uit NA het importeren van de Eissink data
-- Zet tenant_id op alle bestaande Eissink records

update projecten 
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update monteurs 
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update groepen 
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update toewijzingen 
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update periodes
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

-- Controleer of er geen records zonder tenant_id zijn
select 'projecten zonder tenant_id' as check, count(*) from projecten where tenant_id is null
union all
select 'monteurs zonder tenant_id', count(*) from monteurs where tenant_id is null
union all
select 'groepen zonder tenant_id', count(*) from groepen where tenant_id is null
union all
select 'toewijzingen zonder tenant_id', count(*) from toewijzingen where tenant_id is null
union all
select 'periodes zonder tenant_id', count(*) from periodes where tenant_id is null;
```

---

## Stap 5 — Frontend: TenantContext

Maak `src/context/TenantContext.jsx` aan.

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const { user } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [instellingen, setInstellingen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTenant(null)
      setInstellingen(null)
      setLoading(false)
      return
    }

    async function laadTenant() {
      try {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .single()

        if (tenantError) throw tenantError
        setTenant(tenantData)

        const { data: instellingenData, error: instellingenError } = await supabase
          .from('tenant_instellingen')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .single()

        if (instellingenError) throw instellingenError
        setInstellingen(instellingenData)
      } catch (error) {
        console.error('Fout bij laden tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    laadTenant()
  }, [user])

  // Helper: is een kolom zichtbaar voor deze tenant?
  function kolomZichtbaar(tabel, kolom) {
    if (!instellingen?.kolommen_config) return true
    return instellingen.kolommen_config[tabel]?.[kolom] ?? true
  }

  // Helper: is een module zichtbaar voor deze tenant?
  function moduleZichtbaar(module) {
    if (!instellingen?.modules_config) return true
    return instellingen.modules_config[module] ?? true
  }

  return (
    <TenantContext.Provider value={{
      tenant,
      instellingen,
      loading,
      kolomZichtbaar,
      moduleZichtbaar,
      // Labels per tenant
      labelProject: tenant?.label_project ?? 'project',
      labelMonteur: tenant?.label_monteur ?? 'monteur',
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant moet binnen TenantProvider gebruikt worden')
  return context
}
```

---

## Stap 6 — Frontend: Services bijwerken

Werk alle services bij zodat tenant_id automatisch wordt meegestuurd.
De tenant_id komt uit het JWT token — Supabase RLS filtert automatisch.
De services hoeven tenant_id NIET expliciet mee te sturen bij SELECT queries.
Bij INSERT queries moet tenant_id WEL expliciet worden meegegeven.

### src/services/projectenService.js

Voeg tenant_id toe aan alle insert/update operaties:

```js
// Haal tenant_id op uit de huidige sessie
async function getTenantId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.app_metadata?.tenant_id
}

// Gebruik in create:
export async function createProject(projectData) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('projecten')
    .insert({ ...projectData, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}
```

Pas hetzelfde patroon toe op:
- monteursService.js (insert monteur → tenant_id meegeven)
- groepenService.js (insert groep → tenant_id meegeven)
- toewijzingenService.js (insert toewijzing → tenant_id meegeven)

### src/lib/utils.js (nieuw — deduplicatie)

Maak een gedeeld utility bestand aan voor datum en kleur hulpfuncties die nu verspreid door de codebase staan:

```js
// Datum utilities
export function isWeekend(datum) { ... }
export function getDagenInRange(van, tot, skipWeekend = true) { ... }
export function formatDatum(datum) { ... }

// Kleur utilities  
export function getProjectKleur(projectId) { ... }
```

Vervang alle duplicaten in de codebase door imports uit dit bestand.

---

## Stap 7 — Frontend: App.jsx bijwerken

Wikkel de app in TenantProvider:

```jsx
import { TenantProvider } from './context/TenantContext'

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        {/* bestaande routing */}
      </TenantProvider>
    </AuthProvider>
  )
}
```

---

## Stap 8 — Frontend: Hardcoded bedrijfsnaam vervangen

Zoek in de gehele codebase naar hardcoded "Eissink" verwijzingen en vervang ze door:

```jsx
import { useTenant } from '../context/TenantContext'

const { tenant } = useTenant()
// Gebruik: tenant?.naam ?? 'Planning'
```

Doe hetzelfde voor de paginatitel in index.html en App.jsx.

---

## Stap 9 — Frontend: Kolommen conditioneel tonen

Voorbeeld voor de Projecten tabel:

```jsx
import { useTenant } from '../context/TenantContext'

const { kolomZichtbaar } = useTenant()

// In de tabel header:
{kolomZichtbaar('projecten', 'aanneemsom') && <th>Aanneemsom</th>}

// In de tabel rijen:
{kolomZichtbaar('projecten', 'aanneemsom') && <td>{project.aanneemsom}</td>}
```

Pas dit patroon toe op alle kolommen in Projecten.jsx en Monteurs.jsx.

---

## Stap 10 — Auth: tenant_id toevoegen aan gebruikers

### SQL template voor nieuwe gebruikers (update CONTEXT.md)

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(raw_app_meta_data,
        '{rol}', '"planner"'),
        '{initialen}', '"XX"'),
        '{naam}', '"Naam"'),
        '{tenant_id}', '"a0000000-0000-0000-0000-000000000001"')
where email = 'email@domein.nl';
```

Stel tenant_id in voor alle bestaande Eissink gebruikers:

```sql
-- Eissink tenant_id instellen voor alle huidige gebruikers
update auth.users
set raw_app_meta_data = jsonb_set(
  raw_app_meta_data,
  '{tenant_id}',
  '"a0000000-0000-0000-0000-000000000001"'
)
where raw_app_meta_data->>'tenant_id' is null;
-- Controleer daarna handmatig: select email, raw_app_meta_data->>'tenant_id' from auth.users;
```

---

## Stap 11 — Lokaal testen

1. Maak een nieuw Supabase project aan via supabase.com
2. Noteer de nieuwe project URL en anon key
3. Voer de migrations uit in de Supabase SQL editor (001, 002)
4. Voer seed.sql uit
5. Maak een testgebruiker aan voor de demo tenant
6. Pas `.env.local` aan:

```
VITE_SUPABASE_URL=https://[nieuw-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[nieuwe-anon-key]
```

7. Start de app lokaal: `npm run dev`
8. Valideer:
   - [ ] Login werkt
   - [ ] Demo tenant data zichtbaar
   - [ ] Andere tenant data NIET zichtbaar
   - [ ] Inplannen werkt (tenant_id wordt meegestuurd)
   - [ ] Bedrijfsnaam komt uit database, niet hardcoded
   - [ ] Kolommen conditioneel zichtbaar

---

## Stap 12 — Eissink data migreren

Pas dit pas toe NADAT lokaal testen geslaagd is.

1. Exporteer data uit het oude Supabase project (qrnsjldoeobipqclpdxu):
   - Ga naar Supabase dashboard → Table Editor
   - Exporteer: projecten, monteurs, groepen, groep_leden, toewijzingen als CSV

2. Importeer in het nieuwe project via Table Editor

3. Voer `migrate_eissink.sql` uit om tenant_id toe te kennen

4. Stel tenant_id in voor alle Eissink gebruikers in auth.users

5. Valideer de migratiecheck query (alle counts moeten 0 zijn)

---

## Stap 13 — Vercel omgevingsvariabelen bijwerken

Pas pas aan NADAT Eissink migratie gevalideerd is:

1. Ga naar Vercel dashboard → project → Settings → Environment Variables
2. Pas aan:
   - `VITE_SUPABASE_URL` → nieuwe project URL
   - `VITE_SUPABASE_ANON_KEY` → nieuwe anon key
3. Trigger een nieuwe deployment
4. Test op live URL

---

## Stap 14 — CONTEXT.md bijwerken

Werk CONTEXT.md bij met:
- Nieuwe architectuur (multi-tenant)
- Nieuwe tabellen (tenants, tenant_instellingen, audit_log)
- Bijgewerkte SQL template voor gebruikersbeheer (met tenant_id)
- Bijgewerkte mappenstructuur (TenantContext, utils)
- Verwijder "TODO multi-tenancy" notities — dit is nu geïmplementeerd
- Voeg toe aan roadmap: gebruikersbeheerpagina, drag-and-drop, realtime

---

## Wat bewust BUITEN scope blijft in deze migratie

- Drag-and-drop (dnd-kit) — aparte taak na migratie
- Gebruikersbeheerpagina — aparte taak, vereist Edge Functions
- Audit log vullen — structuur is er, triggers toevoegen is volgende stap
- Realtime samenwerking — later
- PWA/offline support — later
- ERP webhook implementatie — later, extern_id staat wel in datamodel

---

## Validatiechecklist voor oplevering

- [ ] Nieuw Supabase schema opgezet met alle tabellen en indexen
- [ ] RLS policies actief en getest (tenant A ziet data van tenant B NIET)
- [ ] Seed data aanwezig voor Demo Afbouw BV
- [ ] TenantContext beschikbaar in de hele app
- [ ] Geen hardcoded "Eissink" meer in de codebase
- [ ] Kolommen conditioneel op basis van tenant_instellingen
- [ ] Services sturen tenant_id mee bij inserts
- [ ] Datum en kleur utilities gededupliceerd in utils.js
- [ ] Lokaal getest en gevalideerd
- [ ] Eissink data gemigreerd en gevalideerd
- [ ] Vercel omgevingsvariabelen bijgewerkt
- [ ] CONTEXT.md bijgewerkt
