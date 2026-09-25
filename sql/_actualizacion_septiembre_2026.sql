-- TODOS LOS CAMBIOS DE BASE DE DATOS DE ESTA TANDA (se puede correr de una sola vez)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn). Es seguro correrlo mas de una vez.

-- ===== libretas_sanitarias.sql =====
-- Libretas sanitarias de empleados (Legales)

create table if not exists public.libretas_sanitarias (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  numero text,
  fecha_emision date,
  fecha_vencimiento date not null,
  emisor text,
  archivo_path text,
  nombre_archivo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_libretas_sanitarias_empleado on public.libretas_sanitarias(empleado_id);
create index if not exists idx_libretas_sanitarias_sucursal on public.libretas_sanitarias(sucursal_id);

alter table public.libretas_sanitarias enable row level security;

drop policy if exists "libretas_sanitarias_all_autenticados" on public.libretas_sanitarias;
create policy "libretas_sanitarias_all_autenticados" on public.libretas_sanitarias
  for all
  to authenticated
  using (true)
  with check (true);

-- Bucket privado para las fotos/PDF de las libretas
insert into storage.buckets (id, name, public)
values ('empleados-documentos', 'empleados-documentos', false)
on conflict (id) do nothing;

drop policy if exists "empleados_documentos_autenticados" on storage.objects;
create policy "empleados_documentos_autenticados" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'empleados-documentos')
  with check (bucket_id = 'empleados-documentos');

-- ===== contratos_editados.sql =====
-- Contrato editado por residente (texto modificado por administracion antes de imprimir)

create table if not exists public.contratos_editados (
  residente_id uuid primary key references public.residentes(id) on delete cascade,
  parrafos jsonb not null,
  editado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.contratos_editados enable row level security;

drop policy if exists "contratos_editados_all_autenticados" on public.contratos_editados;
create policy "contratos_editados_all_autenticados" on public.contratos_editados
  for all
  to authenticated
  using (true)
  with check (true);

-- ===== fichado_alternado.sql =====
-- Fichado alternado: despues de un ingreso, lo proximo es la salida (y viceversa)

-- Devuelve que le toca marcar al empleado: 'egreso' si su ultima fichada fue un
-- ingreso de las ultimas 20 horas (cubre turnos noche), si no 'ingreso'.
create or replace function public.proximo_tipo_fichada(p_empleado_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when f.tipo = 'ingreso'
      and (f.fecha + f.hora) > (now() at time zone 'America/Argentina/Buenos_Aires') - interval '20 hours'
    then 'egreso'
    else 'ingreso'
  end
  from (select 1) x
  left join lateral (
    select tipo, fecha, hora
    from fichadas
    where empleado_id = p_empleado_id
    order by fecha desc, hora desc
    limit 1
  ) f on true;
$$;

revoke all on function public.proximo_tipo_fichada(uuid) from public;
grant execute on function public.proximo_tipo_fichada(uuid) to anon, authenticated;

-- ===== interconsultas_resultado.sql =====
-- Interconsultas: pedido (fecha, motivo) y resultado (fecha, informe, archivo)

alter table public.interconsultas
  add column if not exists fecha_pedido date,
  add column if not exists motivo text,
  add column if not exists profesional text,
  add column if not exists fecha_resultado date,
  add column if not exists resultado text,
  add column if not exists archivo_path text,
  add column if not exists nombre_archivo text;

-- Las interconsultas viejas toman como fecha de pedido la de creacion
update public.interconsultas
set fecha_pedido = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
where fecha_pedido is null;

-- Las nuevas toman la fecha de hoy si no se indica
alter table public.interconsultas
  alter column fecha_pedido set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);

-- ===== emergencias.sql =====
-- Registro de llamadas a emergencias (Area Protegida / prestador)

create table if not exists public.emergencias (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  residente_id uuid references public.residentes(id) on delete set null,
  fecha date not null,
  hora time,
  prestador text not null,
  motivo text,
  demora_minutos integer,
  traslado boolean not null default false,
  satisfactoria boolean,
  observaciones text,
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_emergencias_sucursal_fecha on public.emergencias(sucursal_id, fecha);

alter table public.emergencias enable row level security;

drop policy if exists "emergencias_all_autenticados" on public.emergencias;
create policy "emergencias_all_autenticados" on public.emergencias
  for all
  to authenticated
  using (true)
  with check (true);

-- ===== kinesiologia.sql =====
-- Kinesiologia: evaluacion inicial y sesiones por residente

create table if not exists public.kinesiologia_evaluaciones (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha date not null,
  motivo text,
  diagnostico text,
  dolor_eva smallint check (dolor_eva between 0 and 10),
  dolor_localizacion text,
  movilidad text,
  transferencias text,
  marcha text,
  equilibrio text,
  riesgo_caida text,
  caidas_ultimo_anio smallint,
  ayudas_tecnicas text[] not null default '{}',
  fuerza_muscular text,
  rango_articular text,
  objetivos text,
  plan text,
  sesiones_semanales smallint,
  profesional_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_kinesio_eval_residente on public.kinesiologia_evaluaciones(residente_id, fecha);

create table if not exists public.kinesiologia_sesiones (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha date not null,
  duracion_minutos smallint,
  trabajo_realizado text not null,
  tolerancia text,
  evolucion text,
  profesional_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_kinesio_sesiones_residente on public.kinesiologia_sesiones(residente_id, fecha);

alter table public.kinesiologia_evaluaciones enable row level security;
alter table public.kinesiologia_sesiones enable row level security;

drop policy if exists "kinesio_eval_all_autenticados" on public.kinesiologia_evaluaciones;
create policy "kinesio_eval_all_autenticados" on public.kinesiologia_evaluaciones
  for all to authenticated using (true) with check (true);

drop policy if exists "kinesio_sesiones_all_autenticados" on public.kinesiologia_sesiones;
create policy "kinesio_sesiones_all_autenticados" on public.kinesiologia_sesiones
  for all to authenticated using (true) with check (true);

-- ===== recibos_sueldo.sql =====
-- Recibos de sueldo generados (uno por empleado y periodo)

create table if not exists public.recibos_sueldo (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  periodo text not null check (periodo ~ '^\d{4}-\d{2}$'),
  fecha_pago date,
  items jsonb not null,
  total_haberes numeric(14,2) not null,
  total_descuentos numeric(14,2) not null,
  neto numeric(14,2) not null,
  generado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (empleado_id, periodo)
);

alter table public.recibos_sueldo enable row level security;

drop policy if exists "recibos_sueldo_all_autenticados" on public.recibos_sueldo;
create policy "recibos_sueldo_all_autenticados" on public.recibos_sueldo
  for all to authenticated using (true) with check (true);
