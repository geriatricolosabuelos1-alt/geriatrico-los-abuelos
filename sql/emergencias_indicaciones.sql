-- Emergencias: receta / indicación que deja la ambulancia, guardada como documento del
-- residente y vinculada a la llamada.
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.documentos_residente
  add column if not exists emergencia_id uuid references public.emergencias(id) on delete set null;

create index if not exists idx_documentos_residente_emergencia on public.documentos_residente(emergencia_id);
