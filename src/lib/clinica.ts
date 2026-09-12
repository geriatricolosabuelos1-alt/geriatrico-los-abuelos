export const EXAMEN_FISICO_NORMAL =
  "Respiratorio: buena mecánica ventilatoria, murmullo vesicular conservado sin ruidos agregados. " +
  "Cardiovascular: R1-R2 normofonéticos, sin soplos. Abdomen: blando, depresible, indoloro, sin visceromegalias. " +
  "Neurológico: vigil, orientado en tiempo y espacio, sin foco motor.";

const PALABRAS_POR_GRUPO: Record<string, string[]> = {
  benzodiazepina: ["diazepam", "clonazepam", "alprazolam", "lorazepam", "bromazepam", "midazolam"],
  antihipertensivo: [
    "enalapril",
    "losartan",
    "losartán",
    "valsartan",
    "valsartán",
    "amlodipina",
    "atenolol",
    "carvedilol",
    "hidroclorotiazida",
    "furosemida",
  ],
};

export function inferirGrupoTerapeutico(nombre: string): string | null {
  const n = nombre.trim().toLowerCase();
  for (const [grupo, palabras] of Object.entries(PALABRAS_POR_GRUPO)) {
    if (palabras.some((p) => n.includes(p))) return grupo;
  }
  return null;
}
