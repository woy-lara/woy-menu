-- ============================================================
--  WOY · Esquema inicial (Supabase / Postgres)
--  Pegar en:  Supabase → SQL Editor → New query → Run
-- ============================================================

-- ---------- 1. Restaurantes (los clientes de WOY) ----------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,          -- el ?c=slug de la URL
  name        text not null,
  plan        text not null default 'basico',-- basico | pro
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- 2. El menú (el mismo JSON que hoy vive en localStorage) ----------
create table if not exists menus (
  client_id   uuid primary key references clients(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- 3. Quién administra qué restaurante ----------
--  Liga las cuentas reales de Supabase Auth con cada cliente.
create table if not exists client_users (
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  role        text not null default 'admin', -- admin (restaurante) | owner (WOY)
  primary key (user_id, client_id)
);

-- ---------- 4. Accesos al menú (la analítica que pediste) ----------
create table if not exists menu_views (
  id          bigserial primary key,
  client_id   uuid not null references clients(id) on delete cascade,
  table_no    text,                          -- de qué mesa escanearon
  viewed_at   timestamptz not null default now(),
  visitor     text                           -- hash rotativo; NO identifica a la persona
);
create index if not exists menu_views_client_time
  on menu_views (client_id, viewed_at desc);

-- ---------- 5. Comentarios de los comensales ----------
create table if not exists comments (
  id          bigserial primary key,
  client_id   uuid not null references clients(id) on delete cascade,
  table_no    text,
  rating      smallint check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now()
);
create index if not exists comments_client_time
  on comments (client_id, created_at desc);


-- ============================================================
--  SEGURIDAD (Row Level Security)
--  Sin esto, cualquiera con la llave pública puede leer/escribir todo.
-- ============================================================

alter table clients      enable row level security;
alter table menus        enable row level security;
alter table client_users enable row level security;
alter table menu_views   enable row level security;
alter table comments     enable row level security;

-- Helper: ¿el usuario logueado administra este cliente?
create or replace function administra(c uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from client_users
    where user_id = auth.uid() and client_id = c
  );
$fn$;

-- Helper: ¿es el dueño de la plataforma (WOY)?
create or replace function es_owner()
returns boolean language sql security definer stable set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from client_users
    where user_id = auth.uid() and role = 'owner'
  );
$fn$;

-- --- clients ---
create policy "menu publico lee el cliente"
  on clients for select using (active);
create policy "owner administra clientes"
  on clients for all using (es_owner()) with check (es_owner());

-- --- menus ---
-- Cualquiera puede LEER el menú (los comensales no tienen cuenta).
create policy "menu es publico"
  on menus for select using (true);
-- Solo quien administra ese restaurante puede escribirlo.
create policy "solo su admin edita el menu"
  on menus for all using (administra(client_id)) with check (administra(client_id));

-- --- client_users ---
create policy "ves tus propias ligas"
  on client_users for select using (user_id = auth.uid() or es_owner());
create policy "owner asigna admins"
  on client_users for all using (es_owner()) with check (es_owner());

-- --- menu_views ---
-- El comensal (anónimo) SOLO puede insertar. Nunca leer.
create policy "cualquiera registra una visita"
  on menu_views for insert with check (true);
create policy "solo el admin ve sus reportes"
  on menu_views for select using (administra(client_id) or es_owner());

-- --- comments ---
create policy "cualquiera deja comentario"
  on comments for insert with check (true);
create policy "solo el admin lee comentarios"
  on comments for select using (administra(client_id) or es_owner());


-- ============================================================
--  REPORTE SEMANAL DE ACCESOS
--  Devuelve los últimos 7 días, con los días en cero incluidos.
-- ============================================================
create or replace function reporte_semanal(c uuid)
returns table (dia date, visitas bigint)
language sql stable security definer set search_path = public, pg_temp as $fn$
  select d::date as dia,
         count(v.id) as visitas
  from generate_series(
         (now() at time zone 'America/Panama')::date - 6,
         (now() at time zone 'America/Panama')::date,
         '1 day'
       ) d
  left join menu_views v
    on v.client_id = c
   and (v.viewed_at at time zone 'America/Panama')::date = d::date
  where administra(c) or es_owner()   -- no filtra nada si no tienes permiso
  group by d
  order by d;
$fn$;
