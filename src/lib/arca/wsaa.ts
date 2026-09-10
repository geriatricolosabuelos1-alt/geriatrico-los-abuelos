import forge from "node-forge";
import { createClient } from "@/lib/supabase/server";
import { soapRequest, extractTag, decodeXmlEntities } from "./soap";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatArgDate(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const offH = pad(Math.floor(Math.abs(off) / 60));
  const offM = pad(Math.abs(off) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${offH}:${offM}`
  );
}

function signTRA(tra: string, cert: string, key: string): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: false });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function loginWSAA(
  cert: string,
  key: string,
): Promise<{ token: string; sign: string; expiration: Date }> {
  const now = new Date();
  const gen = new Date(now.getTime() - 10 * 60 * 1000);
  const exp = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatArgDate(gen)}</generationTime>
    <expirationTime>${formatArgDate(exp)}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  const cms = signTRA(tra, cert, key);

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await soapRequest("wsaa.afip.gov.ar", "/ws/services/LoginCms", "", soapBody);

  const faultString = extractTag(response, "faultstring");
  if (faultString) {
    throw new Error(`WSAA rechazó la autenticación: ${decodeXmlEntities(faultString)}`);
  }

  const returnRaw = extractTag(response, "loginCmsReturn");
  if (!returnRaw) {
    throw new Error("WSAA no devolvió loginCmsReturn. Respuesta: " + response.slice(0, 500));
  }
  const decoded = decodeXmlEntities(returnRaw);

  const token = extractTag(decoded, "token");
  const sign = extractTag(decoded, "sign");
  const expirationTime = extractTag(decoded, "expirationTime");

  if (!token || !sign || !expirationTime) {
    throw new Error("WSAA no devolvió credenciales completas.");
  }

  return { token, sign, expiration: new Date(expirationTime) };
}

export async function obtenerCredencialesArca(
  sucursalId: string,
  cert: string,
  key: string,
): Promise<{ token: string; sign: string }> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("arca_tokens")
    .select("token, sign, expiration")
    .eq("sucursal_id", sucursalId)
    .maybeSingle<{ token: string; sign: string; expiration: string }>();

  const margenSegundos = 5 * 60;
  if (cached && new Date(cached.expiration).getTime() - margenSegundos * 1000 > Date.now()) {
    return { token: cached.token, sign: cached.sign };
  }

  const { token, sign, expiration } = await loginWSAA(cert, key);

  await supabase.from("arca_tokens").upsert(
    {
      sucursal_id: sucursalId,
      token,
      sign,
      expiration: expiration.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sucursal_id" },
  );

  return { token, sign };
}
