-- Eissink Planning — database schema

create table projecten (
  id           uuid primary key default gen_random_uuid(),
  werknummer   text not null,
  omschrijving text not null,
  plaats       text,
  adres        text,
  aanneemsom   numeric(12, 2),
  opdrachtgever text,
  extern_id    text,
  created_at   timestamptz default now()
);

create table monteurs (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null,
  type        text not null check (type in ('eigen', 'zzp')),
  expertises  text[] default '{}',
  telefoon    text,
  woonplaats  text,
  created_at  timestamptz default now()
);

create table groepen (
  id         uuid primary key default gen_random_uuid(),
  naam       text not null,
  created_at timestamptz default now()
);

create table groep_leden (
  groep_id   uuid references groepen(id) on delete cascade,
  monteur_id uuid references monteurs(id) on delete cascade,
  primary key (groep_id, monteur_id)
);

create table toewijzingen (
  id          uuid primary key default gen_random_uuid(),
  monteur_id  uuid references monteurs(id) on delete cascade,
  project_id  uuid references projecten(id) on delete cascade,
  datum_van   date not null,
  datum_tot   date not null,
  created_at  timestamptz default now()
);

-- Indexes voor veelgebruikte queries
create index on toewijzingen (datum_van, datum_tot);
create index on toewijzingen (monteur_id);
create index on toewijzingen (project_id);
create index on groep_leden (monteur_id);
