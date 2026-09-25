-- Permisos por rol: que cada rol pueda guardar lo que el menu le muestra.
-- admin: todo. gerente_sede / administrativo: solo residentes de su sede.
-- El medico no elimina nada.
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

-- ---------- Interconsultas ----------
-- Crear: admin, medico y gerente (de su sede)
drop policy if exists "interconsultas_crear" on public.interconsultas;
create policy "interconsultas_crear" on public.interconsultas
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Cargar resultado / marcar resuelta: se suma el medico
drop policy if exists "interconsultas_editar" on public.interconsultas;
create policy "interconsultas_editar" on public.interconsultas
  for update to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Eliminar (no existia): admin y gerente (de su sede)
drop policy if exists "interconsultas_borrar" on public.interconsultas;
create policy "interconsultas_borrar" on public.interconsultas
  for delete to authenticated
  using (
    mi_rol() = 'admin'
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- ---------- Vacunacion ----------
-- Agregar: se suman gerente y administrativo (de su sede). Eliminar queda igual (sin medico).
drop policy if exists "vacunacion_escribir" on public.vacunaciones_residente;
create policy "vacunacion_escribir" on public.vacunaciones_residente
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'medico', 'enfermero')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = vacunaciones_residente.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- ---------- Menu semanal ----------
-- Crear y editar: admin, nutricionista, medico, gerente y administrativo (de su sede)
drop policy if exists "menu_semanal_escribir" on public.menu_semanal;
create policy "menu_semanal_escribir" on public.menu_semanal
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'nutricionista', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

drop policy if exists "menu_semanal_editar" on public.menu_semanal;
create policy "menu_semanal_editar" on public.menu_semanal
  for update to authenticated
  using (
    mi_rol() in ('admin', 'nutricionista', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

-- Eliminar (no existia): admin, nutricionista, gerente y administrativo (de su sede); sin medico
drop policy if exists "menu_semanal_borrar" on public.menu_semanal;
create policy "menu_semanal_borrar" on public.menu_semanal
  for delete to authenticated
  using (
    mi_rol() in ('admin', 'nutricionista')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

-- ---------- Ficha medica: solo admin y gerentes de sede ----------
drop policy if exists "ficha_medica_escribir" on public.ficha_medica;
create policy "ficha_medica_escribir" on public.ficha_medica
  for insert to authenticated
  with check (
    mi_rol() = 'admin'
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = ficha_medica.residente_id and r.sucursal_id = mi_sucursal()))
  );

drop policy if exists "ficha_medica_editar" on public.ficha_medica;
create policy "ficha_medica_editar" on public.ficha_medica
  for update to authenticated
  using (
    mi_rol() = 'admin'
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = ficha_medica.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- ---------- Alta de residentes: solo admin y gerentes de sede ----------
drop policy if exists "residentes_escribir" on public.residentes;
create policy "residentes_escribir" on public.residentes
  for insert to authenticated
  with check (mi_rol() = 'admin' or (mi_rol() = 'gerente_sede' and sucursal_id = mi_sucursal()));

-- ---------- El medico no elimina medicamentos ni recetas ----------
drop policy if exists "medicamentos_residente_borrar" on public.medicamentos_residente;
create policy "medicamentos_residente_borrar" on public.medicamentos_residente
  for delete to authenticated
  using (
    mi_rol() = 'admin'
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = medicamentos_residente.residente_id and r.sucursal_id = mi_sucursal()))
  );

drop policy if exists "recetas_medicamento_borrar" on public.recetas_medicamento;
create policy "recetas_medicamento_borrar" on public.recetas_medicamento
  for delete to authenticated
  using (
    mi_rol() = 'admin'
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = recetas_medicamento.residente_id and r.sucursal_id = mi_sucursal()))
  );
