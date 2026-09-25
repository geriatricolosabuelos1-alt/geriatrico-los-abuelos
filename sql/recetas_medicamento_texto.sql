-- Recetario: medicamento escrito a mano (cuando no es uno de la medicacion del residente)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.recetas_medicamento
  add column if not exists medicamento_texto text;
