-- Kinesiologia: programa mensual de actividades (planilla "Evoluciones Kinesiologia":
-- objetivos del periodo, actividades por semana, observaciones y firma).
-- Aplicado en Supabase el 26/10.

create table if not exists public.kinesiologia_programas (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  periodo text not null,
  objetivos text,
  semana_1 text,
  semana_2 text,
  semana_3 text,
  semana_4 text,
  observaciones text,
  profesional_id uuid references public.perfiles(id) on delete set null,
  matricula text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kinesio_programas_residente
  on public.kinesiologia_programas(residente_id, created_at desc);

alter table public.kinesiologia_programas enable row level security;

-- Ver: admin, médico y kinesiólogo todas las sedes; el resto del personal solo su sede.
create policy kinesio_programas_ver on public.kinesiologia_programas for select to authenticated using (
  mi_rol() = any (array['admin','medico','kinesiologo']::rol_usuario[])
  or (mi_rol() = any (array['gerente_sede','administrativo','enfermero','cuidador','nutricionista']::rol_usuario[])
      and exists (select 1 from residentes r where r.id = kinesiologia_programas.residente_id and r.sucursal_id = mi_sucursal())));

-- Cargar/borrar: admin, médico y kinesiólogo; el gerente solo en su sede.
create policy kinesio_programas_escribir on public.kinesiologia_programas for all to authenticated using (
  mi_rol() = any (array['admin','medico','kinesiologo']::rol_usuario[])
  or (mi_rol() = 'gerente_sede' and exists (select 1 from residentes r where r.id = kinesiologia_programas.residente_id and r.sucursal_id = mi_sucursal())))
with check (
  mi_rol() = any (array['admin','medico','kinesiologo']::rol_usuario[])
  or (mi_rol() = 'gerente_sede' and exists (select 1 from residentes r where r.id = kinesiologia_programas.residente_id and r.sucursal_id = mi_sucursal())));

create trigger zz_auditar after insert or delete or update on public.kinesiologia_programas
  for each row execute function fn_auditar();
