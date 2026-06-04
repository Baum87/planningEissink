-- Voorkomt dat twee gebruikers van dezelfde tenant dezelfde afkorting krijgen.
-- NULL-waarden zijn toegestaan (meerdere gebruikers zonder afkorting is OK).
alter table profielen
add constraint afkorting_unique_per_tenant
unique(tenant_id, afkorting);
