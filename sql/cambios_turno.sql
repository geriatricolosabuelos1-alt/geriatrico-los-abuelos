-- Cambios de turno y guardias puntuales (un día concreto), sobre los turnos semanales.
-- tipo 'cambio': la empleada original no hace su turno ese día y lo cubre otra.
-- tipo 'guardia': guardia o turno extra de una empleada ese día (original opcional).
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.cambios_turno (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('cambio', 'guardia')),
  empleado_original_id uuid references public.empleados(id) on delete set null,
  empleado_reemplazo_id uuid not null references public.empleados(id) on delete cascade,
  hora_inicio time not null,
  hora_fin time not null,
  motivo text,
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cambios_turno_sucursal_fecha on public.cambios_turno(sucursal_id, fecha);

alter table public.cambios_turno enable row level security;

-- Mismo criterio que turnos_programados.
drop policy if exists cambios_turno_all_autenticados on public.cambios_turno;
create policy cambios_turno_all_autenticados on public.cambios_turno
  for all to authenticated using (true) with check (true);

drop trigger if exists zz_auditar on public.cambios_turno;
create trigger zz_auditar after insert or update or delete on public.cambios_turno
  for each row execute function public.fn_auditar();
