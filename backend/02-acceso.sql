-- ============================================================
--  WOY · Acceso real e invitaciones de restaurantes
--  Pegar en: Supabase → SQL Editor → New query → Run
--  (Se puede correr varias veces sin dañar nada.)
-- ============================================================

-- ---------- 1. Quién es dueño de la plataforma ----------
-- Antes es_owner() miraba client_users, pero eso creaba el problema del
-- huevo y la gallina: sin clientes no había dueño, y sin dueño no se podían
-- crear clientes. Ahora el dueño se define por correo, en esta lista.
create table if not exists platform_owners (
  email      text primary key,
  added_at   timestamptz not null default now()
);

insert into platform_owners (email) values ('lara.woy@icloud.com')
  on conflict (email) do nothing;

alter table platform_owners enable row level security;
-- Nadie lee ni escribe esta tabla desde el navegador. Solo la usan las
-- funciones internas (que corren como dueñas de la base).
drop policy if exists "nadie toca platform_owners" on platform_owners;

-- es_owner(): ¿el usuario con sesión iniciada es dueño de WOY?
create or replace function es_owner()
returns boolean language sql security definer stable set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from platform_owners p
    where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$fn$;

-- administra(c): ¿este usuario puede administrar ESE restaurante?
-- El dueño de la plataforma puede con todos; el restaurante, solo con el suyo.
create or replace function administra(c uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $fn$
  select es_owner() or exists (
    select 1 from client_users
    where user_id = auth.uid() and client_id = c
  );
$fn$;


-- ---------- 2. Invitaciones ----------
-- Carlos crea el restaurante y genera un enlace de un solo uso.
-- El restaurante lo abre y crea SU PROPIA contraseña. Carlos nunca ve
-- ni escribe la contraseña de su cliente.
create table if not exists client_invites (
  code        text primary key,
  client_id   uuid not null references clients(id) on delete cascade,
  email       text,                       -- a quién se la mandó (referencia)
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days'),
  used_at     timestamptz,
  used_by     uuid references auth.users(id)
);
create index if not exists client_invites_client on client_invites (client_id);

alter table client_invites enable row level security;
drop policy if exists "owner gestiona invitaciones" on client_invites;
create policy "owner gestiona invitaciones" on client_invites for all
  using (es_owner()) with check (es_owner());
-- Nadie más las lee: el que recibe el enlace ya trae el código en la mano,
-- y lo canjea con una función, no leyendo la tabla.

-- Crear invitación: devuelve el código. Solo el dueño de la plataforma.
create or replace function crear_invitacion(p_client uuid, p_email text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $fn$
declare v_code text;
begin
  if not es_owner() then
    raise exception 'Solo el dueño de la plataforma puede invitar.';
  end if;
  v_code := replace(gen_random_uuid()::text, '-', '');
  insert into client_invites (code, client_id, email) values (v_code, p_client, p_email);
  return v_code;
end;
$fn$;

-- Canjear invitación: liga la cuenta recién creada con su restaurante.
-- Corre como dueña de la base (security definer) para poder escribir en
-- client_users, pero SOLO actúa sobre el usuario que tiene la sesión.
create or replace function canjear_invitacion(p_code text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $fn$
declare v_client uuid;
begin
  if auth.uid() is null then
    raise exception 'Primero debes crear tu acceso.';
  end if;
  select client_id into v_client from client_invites
    where code = p_code and used_at is null and expires_at > now();
  if v_client is null then
    raise exception 'Esta invitación no es válida, ya se usó o venció.';
  end if;
  insert into client_users (user_id, client_id, role)
    values (auth.uid(), v_client, 'admin')
    on conflict (user_id, client_id) do nothing;
  update client_invites
    set used_at = now(), used_by = auth.uid()
    where code = p_code;
  return v_client;
end;
$fn$;


-- ---------- 3. Ajuste de políticas ----------
-- El menú lo escribe quien administra ese restaurante (o el dueño WOY).
drop policy if exists "solo su admin edita el menu" on menus;
create policy "solo su admin edita el menu" on menus for all
  using (administra(client_id)) with check (administra(client_id));

-- La ficha del cliente: pública si está activa (el comensal necesita
-- resolver el slug), y el dueño la gestiona.
drop policy if exists "menu publico lee el cliente" on clients;
create policy "menu publico lee el cliente" on clients for select using (active);

drop policy if exists "owner administra clientes" on clients;
create policy "owner administra clientes" on clients for all
  using (es_owner()) with check (es_owner());

-- Cada quien ve sus propias ligas (para saber qué restaurante administra).
drop policy if exists "ves tus propias ligas" on client_users;
create policy "ves tus propias ligas" on client_users for select
  using (user_id = auth.uid() or es_owner());

-- CERRAR LA ESCRITURA DIRECTA de visitas y comentarios.
-- El esquema inicial dejaba que cualquiera insertara filas directamente en
-- menu_views y comments. Con la llave pública, alguien podía inflar (o
-- ensuciar) los números de cualquier restaurante, o llenar la base.
-- Ahora solo se puede a través de registrar_visita() y dejar_comentario(),
-- que validan el restaurante y recortan el contenido.
drop policy if exists "cualquiera registra una visita" on menu_views;
drop policy if exists "cualquiera deja comentario" on comments;


-- ---------- 4. Mis restaurantes ----------
-- Lo que el admin del restaurante llama al entrar: "¿qué administro yo?"
create or replace function mis_restaurantes()
returns table (id uuid, slug text, name text, plan text, rol text)
language sql security definer stable set search_path = public, pg_temp as $fn$
  select c.id, c.slug, c.name, c.plan, cu.role
  from client_users cu
  join clients c on c.id = cu.client_id
  where cu.user_id = auth.uid()
  order by c.name;
$fn$;


-- ---------- 5. Registrar una visita al menú ----------
-- El comensal es anónimo. Esta función limita lo que puede escribir:
-- solo cuenta una visita, no puede inventar fechas ni tocar otra tabla.
create or replace function registrar_visita(p_slug text, p_mesa text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $fn$
declare v_client uuid;
begin
  select id into v_client from clients where slug = p_slug and active;
  if v_client is null then return; end if;   -- silencioso: no filtra si existe
  insert into menu_views (client_id, table_no, viewed_at)
    values (v_client, left(coalesce(p_mesa, ''), 20), now());
end;
$fn$;

-- ---------- 6. Dejar un comentario ----------
create or replace function dejar_comentario(
  p_slug text, p_rating int, p_body text, p_mesa text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $fn$
declare v_client uuid;
begin
  select id into v_client from clients where slug = p_slug and active;
  if v_client is null then
    raise exception 'Restaurante no encontrado.';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'La calificación debe ir de 1 a 5.';
  end if;
  insert into comments (client_id, table_no, rating, body)
    values (v_client, left(coalesce(p_mesa, ''), 20), p_rating,
            left(coalesce(p_body, ''), 1000));
end;
$fn$;

-- ---------- 7. Reporte semanal por slug ----------
-- Igual que reporte_semanal(uuid) pero por slug, que es lo que tiene el admin.
create or replace function reporte_semanal_slug(p_slug text)
returns table (dia date, visitas bigint)
language sql stable security definer set search_path = public, pg_temp as $fn$
  select d::date as dia, count(v.id) as visitas
  from clients c
  cross join generate_series(
        (now() at time zone 'America/Panama')::date - 6,
        (now() at time zone 'America/Panama')::date,
        '1 day') d
  left join menu_views v
    on v.client_id = c.id
   and (v.viewed_at at time zone 'America/Panama')::date = d::date
  where c.slug = p_slug and administra(c.id)
  group by d
  order by d;
$fn$;
