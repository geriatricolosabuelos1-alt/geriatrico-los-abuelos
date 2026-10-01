-- Enfermería: control diario de signos vitales por residente (una fila por residente y día)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.signos_vitales (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha date not null,
  tension_arterial text,
  frecuencia_cardiaca smallint check (frecuencia_cardiaca between 20 and 250),
  frecuencia_respiratoria smallint check (frecuencia_respiratoria between 4 and 80),
  saturacion_o2 smallint check (saturacion_o2 between 40 and 100),
  temperatura numeric(4,1) check (temperatura between 30 and 45),
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residente_id, fecha)
);

create index if not exists idx_signos_vitales_residente_fecha on public.signos_vitales(residente_id, fecha);

alter table public.signos_vitales enable row level security;

-- Ver y cargar: admin y médico en todas las sedes; gerente, administrativo, enfermero y
-- cuidador solo en los residentes de su sede.
drop policy if exists signos_vitales_ver on public.signos_vitales;
create policy signos_vitales_ver on public.signos_vitales
  for select to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (
      mi_rol() in ('gerente_sede', 'administrativo', 'enfermero', 'cuidador')
      and exists (
        select 1 from residentes r
        where r.id = signos_vitales.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  );

drop policy if exists signos_vitales_escribir on public.signos_vitales;
create policy signos_vitales_escribir on public.signos_vitales
  for all to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (
      mi_rol() in ('gerente_sede', 'enfermero', 'cuidador')
      and exists (
        select 1 from residentes r
        where r.id = signos_vitales.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  )
  with check (
    mi_rol() in ('admin', 'medico')
    or (
      mi_rol() in ('gerente_sede', 'enfermero', 'cuidador')
      and exists (
        select 1 from residentes r
        where r.id = signos_vitales.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  );

-- Registro de movimientos en Seguridad, como el resto de las tablas.
drop trigger if exists zz_auditar on public.signos_vitales;
create trigger zz_auditar after insert or update or delete on public.signos_vitales
  for each row execute function public.fn_auditar();

-- Observaciones del control (agregado después).
alter table public.signos_vitales add column if not exists observaciones text;
