// Ficha nutricional (formulario en papel de la nutricionista): opciones y tipo.

export const OPCIONES_NUTRICION = {
  consistencia: ["Normal", "Blanda", "Picada", "Triturada/Puré", "Licuada", "Espesada"],
  segun_patologia: ["General", "Hiposódica", "Diabética", "Hipocalórica", "Hipercalórica", "Renal", "Sin TACC", "Otra"],
  via_administracion: ["Oral", "SNG", "Gastrostomía", "Yeyunostomía", "Enteral"],
  asistencia: ["No", "Parcial", "Total"],
  ingesta: ["100%", "75%", "50%", "Menor al 50%"],
  disfagia: ["No", "Líquidos", "Sólidos", "Mixta"],
  suplementacion: [
    "No requiere",
    "Normocalórica",
    "Hipercalórica",
    "Hiperproteica",
    "Fórmula para diabético",
    "Sin TACC",
    "Módulo proteico",
    "Espesante",
  ],
  evaluacion_nutricional: [
    "Normonutrido",
    "Riesgo de desnutrición",
    "Desnutrición leve",
    "Desnutrición moderada",
    "Desnutrición severa",
    "Sobrepeso",
    "Obesidad",
  ],
  evaluacion_funcional: [
    "Independiente",
    "Independiente con ayuda técnica (bastón/andador)",
    "Deambula con asistencia",
    "Traslado en silla de ruedas",
    "Postrado",
    "Dependiente para alimentación",
  ],
} as const;

export type FichaNutricion = {
  id: string;
  residente_id: string;
  fecha: string;
  diagnostico_principal: string | null;
  patologias_asociadas: string | null;
  consistencia: string[];
  segun_patologia: string[];
  patologia_otra: string | null;
  via_administracion: string[];
  asistencia: string | null;
  ingesta: string | null;
  protesis_dental: boolean | null;
  disfagia: string | null;
  suplementacion: string[];
  suplementacion_cantidad: string | null;
  peso_actual: number | null;
  peso_ideal: number | null;
  perdida_peso: boolean | null;
  perdida_peso_pct: number | null;
  talla: number | null;
  imc: number | null;
  evaluacion_nutricional: string | null;
  evaluacion_funcional: string[];
  observaciones: string | null;
  created_at: string;
};

export const COLUMNAS_FICHA_NUTRICION =
  "id, residente_id, fecha, diagnostico_principal, patologias_asociadas, consistencia, segun_patologia, patologia_otra, via_administracion, asistencia, ingesta, protesis_dental, disfagia, suplementacion, suplementacion_cantidad, peso_actual, peso_ideal, perdida_peso, perdida_peso_pct, talla, imc, evaluacion_nutricional, evaluacion_funcional, observaciones, created_at";

// Encabezado del formulario impreso.
export const ENCABEZADO_NUTRICIONISTA = {
  nombre: "PAULA CIAFRELLI",
  cargo: "NUTRICIONISTA",
  matricula: "MAT. 1115",
};
