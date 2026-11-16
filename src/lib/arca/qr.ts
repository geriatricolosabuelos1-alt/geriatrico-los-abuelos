import QRCode from "qrcode";

// QR obligatorio de ARCA para comprobantes electrónicos (RG 4892).
export async function qrFacturaArca(datos: {
  fecha: string;
  cuit: string;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  tipoDocRec: number;
  nroDocRec: string;
  cae: string;
}): Promise<string> {
  const payload = {
    ver: 1,
    fecha: datos.fecha,
    cuit: Number(datos.cuit),
    ptoVta: datos.ptoVta,
    tipoCmp: datos.tipoCmp,
    nroCmp: datos.nroCmp,
    importe: datos.importe,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: datos.tipoDocRec,
    nroDocRec: Number(datos.nroDocRec),
    tipoCodAut: "E",
    codAut: Number(datos.cae),
  };
  const url = "https://www.afip.gob.ar/fe/qr/?p=" + Buffer.from(JSON.stringify(payload)).toString("base64");
  return QRCode.toDataURL(url, { margin: 1, width: 160 });
}
