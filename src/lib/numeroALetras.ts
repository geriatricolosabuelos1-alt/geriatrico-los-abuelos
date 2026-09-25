const UNIDADES = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos",
  "ochocientos", "novecientos",
];

function menorDeMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto > 0) {
    let dec: string;
    if (resto < 30) dec = UNIDADES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      dec = DECENAS[d] + (u ? ` y ${UNIDADES[u]}` : "");
    }
    texto = texto ? `${texto} ${dec}` : dec;
  }
  return texto;
}

function entero(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) partes.push(millones === 1 ? "un millón" : `${entero(millones)} millones`);
  if (miles > 0) partes.push(miles === 1 ? "mil" : `${menorDeMil(miles)} mil`);
  if (resto > 0) partes.push(menorDeMil(resto));
  // "uno" al final de un número que precede a "mil"/"millones" se apocopa a "un"
  return partes
    .join(" ")
    .replace(/veintiuno (mil\b|millones)/g, "veintiún $1")
    .replace(/uno (mil\b|millones)/g, "un $1");
}

// Ej: 1234.5 -> "Pesos mil doscientos treinta y cuatro con 50/100"
export function montoEnLetras(monto: number): string {
  const redondeado = Math.round(Math.abs(monto) * 100);
  const pesos = Math.floor(redondeado / 100);
  const centavos = redondeado % 100;
  return `Pesos ${entero(pesos)} con ${String(centavos).padStart(2, "0")}/100`;
}
