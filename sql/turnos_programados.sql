-- Turnos semanales recurrentes (reemplaza el registro manual de "turnos cubiertos")
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.turnos_programados (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7), -- 1=Lunes ... 7=Domingo
  hora_inicio time not null,
  hora_fin time not null,
  vigente_desde date not null,
  vigente_hasta date not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_turnos_programados_empleado on public.turnos_programados(empleado_id);
create index if not exists idx_turnos_programados_sucursal on public.turnos_programados(sucursal_id);

alter table public.turnos_programados enable row level security;

drop policy if exists "turnos_programados_all_autenticados" on public.turnos_programados;
create policy "turnos_programados_all_autenticados" on public.turnos_programados
  for all
  to authenticated
  using (true)
  with check (true);
