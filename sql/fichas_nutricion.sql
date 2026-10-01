-- Nutrición: ficha nutricional por residente (formulario de la nutricionista).
-- Cada vez que se guarda queda una ficha nueva con fecha; la última es la vigente.

create table if not exists public.fichas_nutricion (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha date not null default current_date,
  diagnostico_principal text,
  patologias_asociadas text,
  consistencia text[] not null default '{}',
  segun_patologia text[] not null default '{}',
  patologia_otra text,
  via_administracion text[] not null default '{}',
  asistencia text,
  ingesta text,
  protesis_dental boolean,
  disfagia text,
  suplementacion text[] not null default '{}',
  suplementacion_cantidad text,
  peso_actual numeric(5,1),
  peso_ideal numeric(5,1),
  perdida_peso boolean,
  perdida_peso_pct numeric(5,1),
  talla numeric(4,2),
  imc numeric(4,1),
  evaluacion_nutricional text,
  evaluacion_funcional text[] not null default '{}',
  observaciones text,
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fichas_nutricion_residente on public.fichas_nutricion(residente_id, fecha desc, created_at desc);

alter table public.fichas_nutricion enable row level security;

-- Ver: admin, médico y nutricionista en todas las sedes; gerente, administrativo,
-- enfermero y cuidador solo los residentes de su sede.
drop policy if exists fichas_nutricion_ver on public.fichas_nutricion;
create policy fichas_nutricion_ver on public.fichas_nutricion
  for select to authenticated
  using (
    mi_rol() in ('admin', 'medico', 'nutricionista')
    or (
      mi_rol() in ('gerente_sede', 'administrativo', 'enfermero', 'cuidador')
      and exists (
        select 1 from residentes r
        where r.id = fichas_nutricion.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  );

-- Cargar y corregir: nutricionista, médico y admin; gerente solo en su sede.
drop policy if exists fichas_nutricion_escribir on public.fichas_nutricion;
create policy fichas_nutricion_escribir on public.fichas_nutricion
  for all to authenticated
  using (
    mi_rol() in ('admin', 'medico', 'nutricionista')
    or (
      mi_rol() = 'gerente_sede'
      and exists (
        select 1 from residentes r
        where r.id = fichas_nutricion.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  )
  with check (
    mi_rol() in ('admin', 'medico', 'nutricionista')
    or (
      mi_rol() = 'gerente_sede'
      and exists (
        select 1 from residentes r
        where r.id = fichas_nutricion.residente_id and r.sucursal_id = mi_sucursal()
      )
    )
  );

drop trigger if exists zz_auditar on public.fichas_nutricion;
create trigger zz_auditar after insert or update or delete on public.fichas_nutricion
  for each row execute function public.fn_auditar();

-- La ficha es mensual: una por residente y por mes (AAAA-MM).
alter table public.fichas_nutricion add column if not exists periodo text not null
  default to_char((now() at time zone 'America/Argentina/Mendoza'), 'YYYY-MM') check (periodo ~ '^\d{4}-\d{2}$');
create unique index if not exists fichas_nutricion_residente_periodo on public.fichas_nutricion(residente_id, periodo);
