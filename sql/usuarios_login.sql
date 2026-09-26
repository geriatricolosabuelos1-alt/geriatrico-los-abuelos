-- Ingreso con nombre de usuario (en lugar de mail)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.perfiles add column if not exists usuario text;

-- Solo minusculas, numeros, punto, guion y guion bajo (3 a 30 caracteres)
alter table public.perfiles drop constraint if exists perfiles_usuario_formato;
alter table public.perfiles add constraint perfiles_usuario_formato
  check (usuario is null or usuario ~ '^[a-z0-9._-]{3,30}$');

create unique index if not exists perfiles_usuario_unico on public.perfiles (usuario);
