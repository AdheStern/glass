-- Glass — búsqueda del catálogo (§7.3): FTS en español + trigramas para tolerar
-- errores de tipeo. Idempotente; lo aplica `pnpm db:sql`.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent(text) es STABLE; este envoltorio con search_path fijo es efectivamente
-- IMMUTABLE y puede usarse en índices (patrón estándar para este caso).
create or replace function glass_immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = extensions, public, pg_catalog
as $$ select unaccent($1) $$;

alter table product add column if not exists search_tsv tsvector;

create or replace function glass_product_search_tsv()
returns trigger
language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('spanish', glass_immutable_unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('spanish', glass_immutable_unaccent(coalesce(new.description, ''))), 'B');
  return new;
end $$;

drop trigger if exists trg_product_search_tsv on product;
create trigger trg_product_search_tsv
before insert or update of name, description on product
for each row execute function glass_product_search_tsv();

create index if not exists idx_product_search_tsv on product using gin (search_tsv);
create index if not exists idx_product_name_trgm
  on product using gin (glass_immutable_unaccent(lower(name)) gin_trgm_ops);

-- Rellena lo ya sembrado (el trigger solo cubre inserciones/updates posteriores).
create or replace function glass_rebuild_search()
returns void
language sql as $$
  update product set search_tsv =
    setweight(to_tsvector('spanish', glass_immutable_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('spanish', glass_immutable_unaccent(coalesce(description, ''))), 'B');
$$;
