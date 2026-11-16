import { soapRequest, extractTag, decodeXmlEntities } from "./soap";

const HOST = "aws.afip.gov.ar";
const PATH = "/sr-padron/webservices/personaServiceA13";
const NS = "http://a13.soap.ws.server.puc.sr/";

export type PersonaPadron = { nombre: string; tipoPersona: string | null };

// Padrón A13 de ARCA: nombre o razón social de un CUIT/CUIL.
export async function consultarPadron(
  auth: { token: string; sign: string; cuit: string },
  idPersona: string,
): Promise<PersonaPadron> {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a13="${NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <a13:getPersona>
      <token>${auth.token}</token>
      <sign>${auth.sign}</sign>
      <cuitRepresentada>${auth.cuit}</cuitRepresentada>
      <idPersona>${idPersona}</idPersona>
    </a13:getPersona>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await soapRequest(HOST, PATH, "", soapBody);

  const fault = extractTag(response, "faultstring");
  if (fault) throw new Error(decodeXmlEntities(fault));

  const persona = extractTag(response, "persona");
  if (!persona) throw new Error("ARCA no devolvió datos para ese número.");

  const razonSocial = extractTag(persona, "razonSocial");
  const apellido = extractTag(persona, "apellido");
  const nombre = extractTag(persona, "nombre");
  const completo = razonSocial ?? [apellido, nombre].filter(Boolean).join(" ");
  if (!completo) throw new Error("ARCA no devolvió nombre ni razón social para ese número.");

  return {
    nombre: decodeXmlEntities(completo).trim(),
    tipoPersona: extractTag(persona, "tipoPersona"),
  };
}
