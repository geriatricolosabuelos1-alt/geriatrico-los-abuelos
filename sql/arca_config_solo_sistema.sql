-- La configuracion de ARCA (certificado y clave privada) ya no se puede leer desde la sesion
-- de gerentes/administrativos: la lee el servidor con la llave de servicio.
-- Queda solo la politica de admin (para administrar) y la llave de servicio (que no usa RLS).
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

drop policy if exists "arca_config_leer_propia_sede" on public.arca_config;
