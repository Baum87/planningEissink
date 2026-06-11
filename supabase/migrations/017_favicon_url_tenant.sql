-- favicon_url was onnodig -- logo_url bestond al in het schema.
-- Data overnemen naar logo_url als die nog leeg is, dan favicon_url verwijderen.
update tenants set logo_url = favicon_url where logo_url is null and favicon_url is not null;
alter table tenants drop column if exists favicon_url;
