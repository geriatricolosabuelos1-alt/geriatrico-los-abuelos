import { soapRequest, extractTag, extractAllTags, decodeXmlEntities } from "./soap";

const HOST = "servicios1.afip.gov.ar";
const PATH = "/wsfev1/service.asmx";
const NS = "http://ar.gov.afip.dif.FEV1/";

export type FacturaCInput = {
  cuit: string;
  ptoVta: number;
  importe: number;
  docTipo: number;
  docNro: string;
  condicionIVAReceptorId: number;
  concepto?: number;
};

export type FacturaCResultado = {
  cbteNro: number;
  cae: string;
  caeVencimiento: string;
  fechaEmision: string;
};

function todayArca(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function parseErrors(xml: string): string | null {
  const codes = extractAllTags(xml, "Code");
  const msgs = extractAllTags(xml, "Msg");
  if (codes.length === 0) return null;
  return codes.map((c, i) => `[${c}] ${decodeXmlEntities(msgs[i] ?? "")}`).join("; ");
}

export async function obtenerUltimoAutorizado(
  auth: { token: string; sign: string; cuit: string },
  ptoVta: number,
  cbteTipo: number,
): Promise<number> {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${auth.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${ptoVta}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await soapRequest(
    HOST,
    PATH,
    `${NS}FECompUltimoAutorizado`,
    soapBody,
  );

  const resultBlock = extractTag(response, "FECompUltimoAutorizadoResult") ?? response;
  const errors = parseErrors(resultBlock);
  if (errors) {
    throw new Error(`ARCA rechazó la consulta de último comprobante: ${errors}`);
  }

  const cbteNro = extractTag(resultBlock, "CbteNro");
  return cbteNro ? Number(cbteNro) : 0;
}

export async function solicitarCAE(
  auth: { token: string; sign: string; cuit: string },
  input: FacturaCInput,
): Promise<FacturaCResultado> {
  const cbteTipo = 11; // Factura C
  const ultimo = await obtenerUltimoAutorizado(auth, input.ptoVta, cbteTipo);
  const nuevoNro = ultimo + 1;
  const fecha = todayArca();
  const concepto = input.concepto ?? 2; // 2 = Servicios
  const importeRedondeado = Math.round(input.importe * 100) / 100;

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${auth.cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${input.ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${concepto}</ar:Concepto>
            <ar:DocTipo>${input.docTipo}</ar:DocTipo>
            <ar:DocNro>${input.docNro}</ar:DocNro>
            <ar:CbteDesde>${nuevoNro}</ar:CbteDesde>
            <ar:CbteHasta>${nuevoNro}</ar:CbteHasta>
            <ar:CbteFch>${fecha}</ar:CbteFch>
            ${concepto !== 1 ? `<ar:FchServDesde>${fecha}</ar:FchServDesde><ar:FchServHasta>${fecha}</ar:FchServHasta><ar:FchVtoPago>${fecha}</ar:FchVtoPago>` : ""}
            <ar:ImpTotal>${importeRedondeado}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${importeRedondeado}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:ImpIVA>0</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${input.condicionIVAReceptorId}</ar:CondicionIVAReceptorId>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await soapRequest(HOST, PATH, `${NS}FECAESolicitar`, soapBody);

  const resultBlock = extractTag(response, "FECAESolicitarResult") ?? response;

  const resultado = extractTag(resultBlock, "Resultado");
  const detErrors = parseErrors(extractTag(resultBlock, "FeDetResp") ?? resultBlock);
  const cabErrors = parseErrors(extractTag(resultBlock, "FeCabResp") ?? "");
  const topErrors = parseErrors(extractTag(resultBlock, "Errors") ?? "");

  if (resultado !== "A" || detErrors || topErrors || cabErrors) {
    throw new Error(
      `ARCA rechazó la factura: ${detErrors ?? topErrors ?? cabErrors ?? `resultado=${resultado}`}`,
    );
  }

  const cae = extractTag(resultBlock, "CAE");
  const caeFchVto = extractTag(resultBlock, "CAEFchVto");

  if (!cae || !caeFchVto) {
    throw new Error("ARCA aprobó la factura pero no devolvió CAE.");
  }

  return {
    cbteNro: nuevoNro,
    cae,
    caeVencimiento: `${caeFchVto.slice(0, 4)}-${caeFchVto.slice(4, 6)}-${caeFchVto.slice(6, 8)}`,
    fechaEmision: `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}`,
  };
}
