-- Kinesiologia: evaluacion inicial y sesiones por residente
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

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
