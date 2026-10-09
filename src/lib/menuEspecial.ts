// Menús especiales (fichas de la nutricionista): adecuaciones del menú general institucional.

export type TipoMenuEspecial = "diabetes" | "obesidad";

export const TIPOS_MENU_ESPECIAL: TipoMenuEspecial[] = ["diabetes", "obesidad"];

export const DIAS_MENU = [
  { valor: "lunes", label: "Lunes" },
  { valor: "martes", label: "Martes" },
  { valor: "miercoles", label: "Miércoles" },
  { valor: "jueves", label: "Jueves" },
  { valor: "viernes", label: "Viernes" },
  { valor: "sabado", label: "Sábado" },
  { valor: "domingo", label: "Domingo" },
] as const;

export type ReglaMenu = { contiene: string; indicaciones: string[] };

export type ContenidoMenuEspecial = {
  titulo: string;
  descripcion: string;
  nota: string;
  desayunos: Record<string, string>;
  meriendas: Record<string, string>;
  colaciones: string[];
  reglas: ReglaMenu[];
};

export type PacienteMenuEspecial = { residente_id: string; nombre: string; fecha: string };

export type MenuEspecial = {
  tipo: TipoMenuEspecial;
  contenido: ContenidoMenuEspecial;
  pacientes: PacienteMenuEspecial[];
  updated_at: string | null;
};

function semana(a: string, b: string): Record<string, string> {
  return { lunes: a, martes: b, miercoles: a, jueves: b, viernes: a, sabado: b, domingo: a };
}

// Contenido inicial, tal cual las fichas en papel. Cada sede lo puede editar.
export const MENU_ESPECIAL_BASE: Record<TipoMenuEspecial, ContenidoMenuEspecial> = {
  diabetes: {
    titulo: "Planilla de menú para pacientes diabéticos",
    descripcion:
      "El paciente recibe el mismo menú general institucional, realizando adecuaciones en porciones y selección de alimentos fuente de hidratos de carbono según requerimientos individuales y tratamiento indicado.",
    nota: "No se agregará azúcar, miel ni otros azúcares a las preparaciones destinadas al residente.",
    desayunos: semana(
      "Infusión con leche + Tostada con queso",
      "Infusión con leche descremada + Sándwich de queso",
    ),
    meriendas: semana(
      "Infusión + Sándwich de pan integral con queso",
      "Infusión con leche + Porción de bizcochuelo / pastafrola / tortitas",
    ),
    colaciones: ["Gelatina light sin/con trocitos de frutas", "Yogur descremado", "Postre de leche sin azúcar"],
    reglas: [
      {
        contiene: "Pastas",
        indicaciones: [
          "Servir porción controlada.",
          "Acompañarla con verduras y carne/huevo.",
          "Evitar salsas con azúcar agregado.",
        ],
      },
      {
        contiene: "Puré de papas",
        indicaciones: [
          "Siempre agregar ensalada u otras verduras cocidas.",
          "Elaborar el puré con queso, huevo, leche…",
          "En caso de poder reemplazar el puré, elaborar para el paciente papas al horno con cáscara y sumar ensalada.",
        ],
      },
      {
        contiene: "Arroz",
        indicaciones: [
          "Preferir arroz integral.",
          "Servir porción controlada.",
          "Siempre acompañar con verduras y carne/huevo.",
        ],
      },
      {
        contiene: "Papa / Camote",
        indicaciones: [
          "Combinarlos siempre con otros vegetales.",
          "Sumar alguna porción de carne/huevo.",
          "No sumar pan ni otra fuente de hidratos de carbono en la misma comida (arroz, pasta, legumbres…).",
        ],
      },
      {
        contiene: "Tarta / Empanadas",
        indicaciones: ["Priorizar rellenos con verduras y proteínas (pollo, carnes, cerdo, huevo, queso)."],
      },
      {
        contiene: "Pizza",
        indicaciones: ["Porción controlada y acompañar con ensalada/verduras.", "Evitar el jugo o bebidas azucaradas."],
      },
      {
        contiene: "Guisos",
        indicaciones: [
          "Controlar papa, arroz, fideos, legumbres, según preparación.",
          "Priorizar verduras y proteína.",
        ],
      },
      {
        contiene: "Pan",
        indicaciones: [
          "Porción establecida según indicaciones generales.",
          "No agregar pan cuando la comida contiene otra fuente importante de hidratos de carbono.",
        ],
      },
      {
        contiene: "Postres",
        indicaciones: [
          "Los indicados son: fruta entera, gelatina light con/sin frutas, postre de leche/yogur con edulcorantes.",
          "No se indica: jugos de frutas, postres con azúcar.",
        ],
      },
    ],
  },
  obesidad: {
    titulo: "Planilla de menú para pacientes con sobrepeso/obesidad",
    descripcion:
      "El paciente recibe el mismo menú general institucional, planteando una adecuación individual del menú habitual, orientada a moderar el aporte energético y controlar las porciones, manteniendo una alimentación variada, equilibrada y nutricionalmente completa.\nLas modificaciones contemplan principalmente la selección de alimentos, tamaño de las porciones, cantidad de grasas y azúcares agregados, priorizando verduras, frutas, proteínas de buena calidad y preparaciones de menor densidad energética.",
    nota: "",
    desayunos: semana(
      "Infusión con leche descremada + Tostada con queso",
      "Infusión con leche descremada + Sándwich de queso",
    ),
    meriendas: semana(
      "Infusión + Sándwich de pan integral con queso",
      "Yogur descremado + Galletitas integrales con queso",
    ),
    colaciones: ["Gelatina light sin/con trocitos de frutas", "Yogur descremado", "1 fruta"],
    reglas: [
      {
        contiene: "Pastas",
        indicaciones: [
          "Servir porción moderada.",
          "Priorizar salsas con verduras y evitar salsas muy grasas o cremosas.",
        ],
      },
      {
        contiene: "Puré de papas",
        indicaciones: [
          "Porción moderada.",
          "Preferir puré de verduras o mixto, reduciendo la proporción de papa.",
          "Siempre sumar una ensalada.",
        ],
      },
      {
        contiene: "Arroz",
        indicaciones: [
          "Preferir arroz integral.",
          "Controlar la porción.",
          "Acompañar con abundantes verduras y una fuente de proteína.",
        ],
      },
      {
        contiene: "Papa / Camote",
        indicaciones: ["Servir porción moderada.", "Evitar sumar pan u otra fuente de féculas en la misma comida."],
      },
      {
        contiene: "Tarta / Empanadas",
        indicaciones: [
          "Controlar la cantidad de masa.",
          "Evitar agregar pan como acompañamiento.",
          "Priorizar rellenos con verduras y proteínas (pollo, carnes, cerdo, huevo, queso).",
        ],
      },
      {
        contiene: "Pizza",
        indicaciones: [
          "Porción controlada y acompañar con ensalada/verduras.",
          "Evitar acompañar con pan y limitar quesos o fiambres grasos.",
        ],
      },
      {
        contiene: "Guisos",
        indicaciones: [
          "Controlar papa, arroz, fideos, legumbres, según preparación.",
          "Priorizar verduras y proteína.",
        ],
      },
      {
        contiene: "Pan",
        indicaciones: [
          "Porción establecida según indicaciones generales.",
          "No agregar pan cuando la comida contiene pasta, arroz, papa u otra fuente de hidratos.",
        ],
      },
      {
        contiene: "Postres",
        indicaciones: [
          "Priorizar fruta fresca, gelatina, yogur o preparaciones de menor densidad energética.",
          "Controlar porciones.",
        ],
      },
      {
        contiene: "Bizcochuelo / Tortitas / Pastafrola",
        indicaciones: [
          "Porción pequeña y ocasional.",
          "Priorizar preparaciones caseras con menor cantidad de azúcar y grasa.",
          "No eliminarlo por completo, sino agregar una tostada con queso + 1 porción de pastafrola, por ejemplo.",
        ],
      },
    ],
  },
};

export const ETIQUETA_INDICACIONES: Record<TipoMenuEspecial, string> = {
  diabetes: "Indicaciones para paciente con diabetes",
  obesidad: "Indicaciones para paciente con sobrepeso/obesidad",
};
