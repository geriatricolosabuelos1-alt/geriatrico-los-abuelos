-- Evaluacion medica (checklist de examen) e Indicaciones medicas (cuadro de
-- medicacion por horario, recurrente mes a mes hasta que se modifique).
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.evaluaciones_medicas (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha date not null,
  antecedentes text,
  estado_conciencia text,
  orientacion text[] not null default '{}',
  obs_orientacion text,
  alimentacion text,
  consistencia text,
  obs_alimentacion text,
  marcha_movilidad text,
  control_urinario text,
  control_fecal text,
  obs_esfinteres text,
  conducta text,
  firmado_por uuid references public.perfiles(id),
  matricula text,
  firmado_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_evaluaciones_medicas_residente on public.evaluaciones_medicas(residente_id, fecha desc);

alter table public.evaluaciones_medicas enable row level security;

drop policy if exists "evaluaciones_medicas_all_autenticados" on public.evaluaciones_medicas;
create policy "evaluaciones_medicas_all_autenticados" on public.evaluaciones_medicas
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.indicaciones_medicas (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  periodo_desde date not null,
  periodo_hasta date not null,
  items jsonb not null default '[]',
  observaciones text,
  firmado_por uuid references public.perfiles(id),
  matricula text,
  firmado_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_indicaciones_medicas_residente on public.indicaciones_medicas(residente_id, periodo_desde desc);

alter table public.indicaciones_medicas enable row level security;

drop policy if exists "indicaciones_medicas_all_autenticados" on public.indicaciones_medicas;
create policy "indicaciones_medicas_all_autenticados" on public.indicaciones_medicas
  for all
  to authenticated
  using (true)
  with check (true);
