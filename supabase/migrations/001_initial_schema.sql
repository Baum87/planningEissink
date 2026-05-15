-- ============================================================
-- 001_initial_schema.sql
-- Volledig schema voor het multi-tenant Supabase project.
-- Uitvoeren in: nieuw Supabase project → SQL Editor
-- ============================================================

-- ─── Tenants ────────────────────────────────────────────────

create table tenants (
  id             uuid primary key default gen_random_uuid(),
  naam           text not null,
  slug           text not null unique,
  logo_url       text,
  primaire_kleur text default '#2563eb',
  label_project  text default 'project',
  label_monteur  text default 'monteur',
  actief         boolean default true,
  created_at     timestamptz default now()
);

create table tenant_instellingen (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  veld_labels     jsonb default '{}',
  kolommen_config jsonb default '{
    "projecten": {
      "werknummer": true,
      "omschrijving": true,
      "opdrachtgever": true,
      "plaats": true,
      "opmerkingen": true,
      "projectleider_initialen": true,
      "aantal_personen": true,
      "mandagen": true,
      "created_at": true
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
  modules_config  jsonb default '{
    "planning": true,
    "projecten": true,
    "monteurs": true,
    "overzicht": true
  }',
  updated_at      timestamptz default now()
);

create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  actie        text not null,
  tabel        text not null,
  record_id    uuid,
  oude_waarde  jsonb,
  nieuwe_waarde jsonb,
  created_at   timestamptz default now()
);

-- ─── Projecten ──────────────────────────────────────────────

create table projecten (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  werknummer               text not null,
  omschrijving             text not null,
  plaats                   text,
  adres                    text,
  opdrachtgever            text,
  opmerkingen              text,
  extern_id                text,
  projectleider_initialen  text,
  kleur                    varchar(7),
  created_at               timestamptz default now()
);

-- ─── Monteurs ───────────────────────────────────────────────

create table monteurs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  voornaam      text,
  achternaam    text,
  bedrijfsnaam  text,
  type          text not null check (type in ('Intern', 'Onderaannemer')),
  expertises    text[] default '{}',
  telefoon      text,
  woonplaats    text,
  extern_id     text,
  created_at    timestamptz default now()
);

-- ─── Groepen ────────────────────────────────────────────────

create table groepen (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  naam       text not null,
  created_at timestamptz default now()
);

create table groep_leden (
  groep_id   uuid not null references groepen(id) on delete cascade,
  monteur_id uuid not null references monteurs(id) on delete cascade,
  primary key (groep_id, monteur_id)
);

-- ─── Toewijzingen ───────────────────────────────────────────

create table toewijzingen (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  monteur_id  uuid not null references monteurs(id) on delete cascade,
  project_id  uuid not null references projecten(id) on delete cascade,
  datum_van   date not null,
  datum_tot   date not null,
  created_at  timestamptz default now()
);

-- ─── Tenant expertises ──────────────────────────────────────

create table tenant_expertises (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  naam       text not null,
  volgorde   int default 0,
  created_at timestamptz default now()
);

-- ─── Periodes (bouwvak, feestdagen) ─────────────────────────

create table periodes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  naam       text,
  datum_van  date not null,
  datum_tot  date not null,
  type       text,
  created_at timestamptz default now()
);

-- ─── Indexen ────────────────────────────────────────────────

create index idx_projecten_tenant_id         on projecten(tenant_id);
create index idx_monteurs_tenant_id          on monteurs(tenant_id);
create index idx_groepen_tenant_id           on groepen(tenant_id);
create index idx_toewijzingen_tenant_id      on toewijzingen(tenant_id);
create index idx_toewijzingen_monteur_datum  on toewijzingen(monteur_id, datum_van);
create index idx_toewijzingen_project_datum  on toewijzingen(project_id, datum_van);
create index idx_toewijzingen_datum_range    on toewijzingen(datum_van, datum_tot);
create index idx_tenant_expertises_tenant_id on tenant_expertises(tenant_id);
create index idx_periodes_tenant_id          on periodes(tenant_id);
create index idx_periodes_datum              on periodes(datum_van);
create index idx_groep_leden_monteur         on groep_leden(monteur_id);
create index idx_audit_log_tenant_id         on audit_log(tenant_id);
create index idx_audit_log_created_at        on audit_log(created_at);
