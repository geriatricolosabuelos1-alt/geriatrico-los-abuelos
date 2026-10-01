import "server-only";
import nodemailer from "nodemailer";

export type AdjuntoMail = { nombreArchivo: string; contenido: Buffer; contentType: string };

function transporte() {
  const usuario = process.env.GMAIL_USER;
  const clave = process.env.GMAIL_APP_PASSWORD;
  if (!usuario || !clave) {
    throw new Error("El envío de mail no está configurado (faltan GMAIL_USER / GMAIL_APP_PASSWORD).");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: clave },
  });
}

export async function enviarMailConAdjunto(datos: {
  destinatario: string;
  asunto: string;
  texto: string;
  adjunto: AdjuntoMail;
}): Promise<void> {
  await enviarMailConAdjuntos({ ...datos, adjuntos: [datos.adjunto] });
}

export async function enviarMailConAdjuntos(datos: {
  destinatario: string;
  asunto: string;
  texto: string;
  adjuntos: AdjuntoMail[];
}): Promise<void> {
  const remitente = process.env.GMAIL_USER;
  await transporte().sendMail({
    from: `"Los Abuelos" <${remitente}>`,
    to: datos.destinatario,
    subject: datos.asunto,
    text: datos.texto,
    attachments: datos.adjuntos.map((a) => ({
      filename: a.nombreArchivo,
      content: a.contenido,
      contentType: a.contentType,
    })),
  });
}
