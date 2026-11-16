-- Facturación de servicios externos: Factura C emitida ante ARCA con el CUIT de la sede
-- a terceros (no residentes). Igual que facturas_arca, no se modifican ni se borran.
-- Aplicado en Supabase (proyecto ltgvplcrmmhgyfstrwpn).

create table if not exists public.facturas_externas (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales(id),
  receptor_nombre text not null,
  doc_tipo integer not null,
  doc_nro text not null,
  condicion_iva_receptor_id integer not null,
  tipo_cbte integer not null,
  pto_vta integer not null,
  cbte_nro bigint not null,
  cae text not null,
  cae_vencimiento date not null,
  importe numeric not null,
  fecha_emision date not null,
  periodo_desde date not null,
  periodo_hasta date not null,
  detalle jsonb not null,
  condicion_venta text,
  medio_pago text,
  emitido_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_facturas_externas_sucursal
  on public.facturas_externas(sucursal_id, fecha_emision desc);

alter table public.facturas_externas enable row level security;

create policy facturas_externas_ver on public.facturas_externas for select to authenticated using (
  mi_rol() = 'admin'
  or (mi_rol() = any (array['administrativo','gerente_sede']::rol_usuario[]) and sucursal_id = mi_sucursal()));

create policy facturas_externas_escribir on public.facturas_externas for insert to authenticated with check (
  mi_rol() = 'admin'
  or (mi_rol() = any (array['administrativo','gerente_sede']::rol_usuario[]) and sucursal_id = mi_sucursal()));

create trigger zz_auditar after insert or delete or update on public.facturas_externas
  for each row execute function fn_auditar();
