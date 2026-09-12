export type RolUsuario =
  | "admin"
  | "enfermero"
  | "cuidador"
  | "medico"
  | "nutricionista"
  | "kinesiologo"
  | "administrativo";

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  capacidad_camas: number | null;
}

export interface ItemHabilitacion {
  id: string;
  categoria: string;
  orden: number;
  descripcion: string;
}

export interface HabilitacionDocumento {
  id: string;
  sucursal_id: string;
  item_id: string;
  archivo_url: string | null;
  nombre_archivo: string | null;
  fecha_presentacion: string | null;
  notas: string | null;
  updated_at: string;
}

export interface Perfil {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  sucursal_id: string | null;
  activo: boolean;
}

export type NivelCuidado = "autovalido" | "asistido" | "dependiente";

export interface Residente {
  id: string;
  sucursal_id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  dni: string | null;
  nacionalidad: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  habitacion: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  observaciones_medicas: string | null;
  foto_url: string | null;
  activo: boolean;
  nivel_cuidado: NivelCuidado | null;
}

export interface FichaAdministrativa {
  residente_id: string;
  obra_social: string | null;
  numero_afiliado: string | null;
  tipo_cobertura: string | null;
  cuota_mensual: number | null;
  notas_contrato: string | null;
  fecha_vencimiento_cuota: string | null;
  mecanismo_actualizacion: string | null;
  cud_vencimiento: string | null;
  monto_cobertura_obra_social: number | null;
  porcentaje_recargo_mora: number | null;
  contratante_nombre: string | null;
  contratante_dni: string | null;
  contratante_domicilio: string | null;
}

export type TipoDocumentoResidente =
  | "orden_internacion"
  | "cud"
  | "nota_derivacion"
  | "contrato";

export interface DocumentoResidente {
  id: string;
  residente_id: string;
  tipo: TipoDocumentoResidente;
  nombre_archivo: string;
  url: string;
  created_at: string;
}

export interface CatalogoMedicamento {
  id: string;
  nombre: string;
  dosis: string | null;
  grupo_terapeutico: string | null;
}

export type TipoVisitaMedica =
  | "control_rutina"
  | "pase_diario"
  | "evaluacion_post_caida"
  | "descompensacion_aguda";

export interface EvolucionMedica {
  id: string;
  residente_id: string;
  tipo_visita: TipoVisitaMedica;
  subjetivo: string | null;
  objetivo: string | null;
  apreciacion_diagnostico: string | null;
  plan_terapeutico: string | null;
  estable: boolean;
  interconsulta_laboratorio: boolean;
  derivacion_especialidad: string | null;
  indicacion_kinesiologia: string | null;
  indicacion_nutricion: string | null;
  firmado_por: string;
  matricula: string | null;
  firmado_at: string;
  created_at: string;
}

export interface EvolucionMedicaAddenda {
  id: string;
  evolucion_id: string;
  contenido: string;
  autor_id: string | null;
  created_at: string;
}

export type AccionKardex = "nueva" | "mantener" | "suspender" | "modificar_dosis";

export interface CambioMedicacion {
  id: string;
  medicamento_id: string;
  residente_id: string;
  evolucion_id: string | null;
  accion: AccionKardex;
  dosis_anterior: string | null;
  dosis_nueva: string | null;
  motivo: string | null;
  medico_id: string | null;
  fecha: string;
}

export type TipoInterconsulta = "laboratorio" | "derivacion_externa" | "kinesiologia" | "nutricion";

export interface Interconsulta {
  id: string;
  residente_id: string;
  evolucion_id: string | null;
  tipo: TipoInterconsulta;
  detalle: string | null;
  resuelta: boolean;
  creada_por: string | null;
  created_at: string;
}

export type TipoAdministracion = "continua" | "sos";

export interface MedicamentoResidente {
  id: string;
  residente_id: string;
  nombre: string;
  dosis: string | null;
  dosis_diaria: number | null;
  frecuencia: string | null;
  horario: string | null;
  via_administracion: string | null;
  tipo_administracion: TipoAdministracion;
  dosis_maxima_diaria: number | null;
  horarios: string[] | null;
  instrucciones: string | null;
  cantidad_stock: number;
  notas: string | null;
  activo: boolean;
  cambio_reciente_at: string | null;
  updated_at: string;
}

export type EstadoDosis = "administrado" | "omitido" | "rechazado" | "suspendido";

export interface DosisAdministrada {
  id: string;
  medicamento_id: string;
  residente_id: string;
  cantidad: number;
  estado: EstadoDosis;
  motivo: string | null;
  horario_previsto: string | null;
  administrado_por: string | null;
  fecha: string;
}

export type EstadoToma = "pendiente" | EstadoDosis;

export interface TomaMar {
  medicamentoId: string;
  residenteId: string;
  horario: string;
  estado: EstadoToma;
  dosisId: string | null;
  motivo: string | null;
}

export type EstadoReceta = "pendiente_pedir" | "pedida" | "recibida";

export interface RecetaMedicamento {
  id: string;
  residente_id: string;
  medicamento_id: string | null;
  obra_social: string | null;
  estado: EstadoReceta;
  fecha_pedido: string | null;
  fecha_recibido: string | null;
  fecha_vencimiento: string | null;
  notas: string | null;
  creado_por: string | null;
  created_at: string;
}

export type TipoContratoProveedorSalud = "area_protegida" | "otro";

export interface ContratoProveedorSalud {
  id: string;
  sucursal_id: string;
  tipo: TipoContratoProveedorSalud;
  proveedor: string;
  fecha_vencimiento: string | null;
  contacto: string | null;
  notas: string | null;
  created_at: string;
}

export interface RetiroResiduoPatogenico {
  id: string;
  sucursal_id: string;
  fecha: string;
  empresa: string;
  cantidad_kg: number | null;
  numero_manifiesto: string | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

export type TipoVacuna = "antigripal" | "neumococo" | "covid19" | "otra";

export interface VacunacionResidente {
  id: string;
  residente_id: string;
  vacuna: TipoVacuna;
  vacuna_otra: string | null;
  fecha_aplicacion: string;
  dosis_numero: number | null;
  proxima_dosis: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface IngresoMedicamento {
  id: string;
  medicamento_id: string;
  residente_id: string;
  cantidad: number;
  lote: string | null;
  vencimiento: string | null;
  entregado_por: string | null;
  registrado_por: string | null;
  fecha: string;
}

export type NivelAlertaMedicacion = "aviso_7" | "aviso_5" | "sin_stock";

export interface AlertaMedicacion {
  id: string;
  medicamento_id: string;
  residente_id: string;
  dias_restantes: number | null;
  nivel: NivelAlertaMedicacion;
  creada_at: string;
  notificada: boolean;
  resuelta: boolean;
}

export interface FichaMedica {
  residente_id: string;
  medico_cabecera: string | null;
  medico_emergencia: string | null;
  telefono_emergencia_medica: string | null;
  grupo_sanguineo: string | null;
  alergias: string | null;
  diagnosticos: string | null;
}

export type TipoNotaEvolucion = "medica" | "enfermeria" | "nutricion" | "kinesiologia";

export interface NotaEvolucion {
  id: string;
  residente_id: string;
  autor_id: string;
  tipo: TipoNotaEvolucion;
  contenido: string;
  fecha: string;
}

export type MetodoPesaje = "pie" | "silla" | "grua" | "estimacion";

export interface FichaNutricional {
  residente_id: string;
  peso_habitual: number | null;
  peso_actual: number | null;
  metodo_pesaje: MetodoPesaje | null;
  talla_cm: number | null;
  talla_estimada: boolean;
  circunferencia_pantorrilla: number | null;
  circunferencia_braquial: number | null;
  dinamometria_kg: number | null;
  updated_at: string;
}

export interface MedicionAntropometrica {
  id: string;
  residente_id: string;
  fecha: string;
  peso: number | null;
  circunferencia_pantorrilla: number | null;
  circunferencia_braquial: number | null;
  registrado_por: string | null;
  created_at: string;
}

export interface EvaluacionMna {
  id: string;
  residente_id: string;
  fecha: string;
  movilidad: number;
  estres_agudo: number;
  problemas_neuropsicologicos: number;
  imc_o_cp: number;
  ingesta_reciente: number;
  perdida_peso: number;
  puntaje: number;
  proxima_evaluacion: string | null;
  registrado_por: string | null;
  created_at: string;
}

export type TipoAlertaNutricion =
  | "perdida_aguda"
  | "perdida_progresiva"
  | "baja_ingesta"
  | "riesgo_escaras"
  | "mna_bajo";
export type NivelAlertaNutricion = "alta" | "media";

export interface AlertaNutricion {
  id: string;
  residente_id: string;
  tipo: TipoAlertaNutricion;
  nivel: NivelAlertaNutricion;
  detalle: string | null;
  creada_at: string;
  resuelta: boolean;
}

export type TipoDieta =
  | "general"
  | "hiposodica_estricta"
  | "hiposodica_moderada"
  | "diabetica"
  | "astringente"
  | "rica_en_fibra"
  | "renal";
export type NivelIddsi = "7" | "6" | "5" | "4";
export type TipoLiquido = "normal" | "nectar" | "miel" | "pudin";

export interface PrescripcionDietaria {
  id: string;
  residente_id: string;
  tipo_dieta: TipoDieta;
  nivel_iddsi: NivelIddsi;
  tipo_liquido: TipoLiquido;
  activa: boolean;
  vigente_desde: string;
  vigente_hasta: string | null;
  prescripto_por: string | null;
  notas: string | null;
  created_at: string;
}

export type TipoRestriccion = "alergia" | "intolerancia" | "aversion";

export interface RestriccionResidente {
  id: string;
  residente_id: string;
  tipo: TipoRestriccion;
  detalle: string;
  activo: boolean;
  created_at: string;
}

export interface ValoracionDeglucion {
  id: string;
  residente_id: string;
  fecha: string;
  tos_al_comer: boolean;
  voz_humeda: boolean;
  deglucion_fraccionada: boolean;
  carraspeo: boolean;
  retencion_carrillos: boolean;
  indicacion_espesante: string | null;
  medicacion_triturada: boolean;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

export type ViaAlimentacionEnteral = "sng" | "peg";

export interface AlimentacionEnteral {
  id: string;
  residente_id: string;
  via: ViaAlimentacionEnteral;
  formula: string | null;
  volumen_diario_ml: number | null;
  velocidad_ml_h: number | null;
  agua_adicional_ml: number | null;
  activo: boolean;
  created_at: string;
}

export type ComidaIngesta = "desayuno" | "almuerzo" | "merienda" | "cena" | "colacion";
export type PorcentajeIngesta = 0 | 25 | 50 | 75 | 100;

export interface RegistroIngesta {
  id: string;
  residente_id: string;
  fecha: string;
  comida: ComidaIngesta;
  porcentaje: PorcentajeIngesta;
  vasos_agua: number;
  registrado_por: string | null;
  created_at: string;
}

export interface MenuSemanalContenido {
  desayunos: Record<string, string>;
  meriendas: Record<string, string>;
  almuerzos: Record<string, string>;
  colaciones: Record<string, string>;
  cenas: Record<string, string>;
  postres_almuerzo: Record<string, string>;
  postres_cena: Record<string, string>;
}

export interface MenuSemanal {
  id: string;
  sucursal_id: string;
  semana_desde: string;
  semana_hasta: string;
  contenido: MenuSemanalContenido;
  pacientes_sng: number;
  pacientes_vegetarianos: number;
  pacientes_celiacos: number;
  pacientes_diabeticos: number;
  observaciones: string | null;
  nutricionista_id: string | null;
  matricula: string | null;
  firmado_at: string | null;
  created_at: string;
}

export interface ControlHeladera {
  id: string;
  sucursal_id: string;
  equipo: string;
  fecha: string;
  temperatura: number;
  responsable_id: string | null;
  created_at: string;
}

export type TipoContratacion = "monotributo" | "relacion_dependencia";
export type FormaPago = "efectivo" | "transferencia";

export interface Empleado {
  id: string;
  sucursal_id: string;
  perfil_id: string | null;
  nombre_completo: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_contratacion: TipoContratacion | null;
  forma_pago: FormaPago | null;
  turno: string | null;
  sueldo: number | null;
  activo: boolean;
}

export type TipoGasto = "fijo" | "variable";

export interface Gasto {
  id: string;
  sucursal_id: string;
  categoria: string;
  monto: number;
  mes: number;
  anio: number;
  descripcion: string | null;
  tipo: TipoGasto;
  fecha: string;
  gasto_fijo_id: string | null;
}

export interface GastoFijoCatalogo {
  id: string;
  nombre: string;
  monto_estimado: number | null;
  activo: boolean;
}

export type CategoriaInsumo = "medicos" | "varios";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stock_minimo: number;
  precio_referencia: number | null;
  activo: boolean;
}

export interface CargoExtraResidente {
  id: string;
  residente_id: string;
  sucursal_id: string;
  movimiento_inventario_id: string | null;
  concepto: string;
  monto: number;
  fecha: string;
  pagado: boolean;
  fecha_pago: string | null;
  registrado_por: string | null;
  created_at: string;
}

export type TipoMovimiento = "entrada" | "salida";

export interface MovimientoInventario {
  id: string;
  sucursal_id: string;
  insumo_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  precio: number | null;
  importe_total: number | null;
  es_inicial: boolean;
  residente_id: string | null;
  fecha: string;
}

export type EstadoPago = "pendiente" | "parcial" | "pagado";
export type MetodoPago = "efectivo" | "transferencia" | "mercado_pago";

export interface Rendicion {
  id: string;
  sucursal_id: string;
  monto: number | null;
  descripcion: string | null;
  fecha: string;
  imagen_path: string;
  created_at: string;
}

export interface Pago {
  id: string;
  residente_id: string;
  sucursal_id: string;
  monto: number;
  monto_pagado: number;
  mes: number;
  anio: number;
  estado: EstadoPago;
  fecha_pago: string | null;
}
