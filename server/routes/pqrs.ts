import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RequestHandler } from "express";
import { z } from "zod";
import { sendEmail } from "../services/email";
import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";
import type {
  EncryptedSubmissionRequest,
  PqrsFormData,
  PqrsPublicKeyResponse,
  PqrsSubmissionRequest,
  PqrsSubmissionResponse,
} from "@shared/api";
import {
  decryptPayload,
  encryptedRequestSchema,
  escapeHtml,
  formatRecipients,
  normalizePem,
  type ParsedEncryptedRequest,
} from "./utils/encrypted-request";

type EncryptedPqrsRequest = ParsedEncryptedRequest;
type _EncryptedRequestMatchesShared = EncryptedPqrsRequest extends PqrsSubmissionRequest
  ? PqrsSubmissionRequest extends EncryptedPqrsRequest
    ? true
    : never
  : never;

const pqrsFormSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  documentType: z.string().min(1),
  documentNumber: z.string().min(1),
  requestType: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().min(1),
});

const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(moduleDirname, "../plantillas");

const loadTemplate = (filename: string) => {
  const templatePath = path.resolve(templatesDir, filename);
  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`Failed to load email template at ${templatePath}`, error);
    throw new Error("Unable to load PQRS email template");
  }
};

const pqrsHtmlTemplate = loadTemplate("pqrs.html");

const pqrsTextTemplate = `Nueva solicitud PQRS

Se ha recibido una nueva solicitud PQRS a través del portal.

Datos personales
Nombre: {{fullName}}
Correo: {{email}}
Teléfono: {{phone}}
Tipo de documento: {{documentType}}
Número de documento: {{documentNumber}}

Detalle de la solicitud
Tipo: {{requestType}}
Asunto: {{subject}}

Descripción
{{descriptionText}}

----------------------------------------
Advertencia legal: El contenido de este mensaje, incluidos los ficheros adjuntos, es confidencial. Si usted ha recibido o accedido a este mensaje por error, le rogamos que nos comunique esta incidencia por la misma vía y proceda a destruir el mensaje de forma inmediata. Cualquier opinión contenida en este mensaje es responsabilidad de su autor y no representa necesariamente la opinión de AXA PARTNERS COLOMBIA. Su dirección de correo y demás datos de contacto se encuentran recogidos en nuestros ficheros con la finalidad de gestionar la relación contractual y/o mantenerlo informado. Entendemos que usted consiente el tratamiento de los citados datos con dicha finalidad, y estos serán tratados conforme a nuestra Política de Privacidad (https://www.axapartners.co/es/pagina/politica-de-privacidad). Puede ejercer sus derechos en materia de protección de datos de acuerdo con la Ley 1581 de 2012, dirigiéndose por escrito al correo electrónico: dataprivacy@axa-assistance.com.co. Tenga presente que cualquier uso de datos que no esté circunscrito a las finalidades descritas en las políticas, o que se realice sin el consentimiento previo de los titulares, está sujeto a las sanciones previstas en la normativa colombiana.`;

const renderTemplate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template,
  );

const buildEmailContent = (data: PqrsFormData) => {
  const htmlValues = {
    fullName: escapeHtml(data.fullName),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone),
    documentType: escapeHtml(data.documentType),
    documentNumber: escapeHtml(data.documentNumber),
    requestType: escapeHtml(data.requestType),
    subject: escapeHtml(data.subject),
    descriptionHtml: escapeHtml(data.description).replace(/\n/g, "<br />"),
  };

  const textValues = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    requestType: data.requestType,
    subject: data.subject,
    descriptionText: data.description,
  };

  const html = renderTemplate(pqrsHtmlTemplate, htmlValues);
  const text = renderTemplate(pqrsTextTemplate, {
    ...textValues,
  });

  return { html, text };
};

export const handleGetPqrsPublicKey: RequestHandler = (_req, res) => {
  const publicKey = process.env.PQRS_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "PQRS public key is not configured" });
  }

  const response: PqrsPublicKeyResponse = {
    publicKey: normalizePem(publicKey),
  };

  res.json(response);
};

export const handleSubmitPqrs: RequestHandler = async (req, res) => {
  const privateKey = process.env.PQRS_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "PQRS private key is not configured" });
  }

  const parseEncrypted = encryptedRequestSchema.safeParse(req.body);
  if (!parseEncrypted.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parseEncrypted.error.flatten() });
  }

  let pqrsData: PqrsFormData;
  try {
    const decrypted = decryptPayload(parseEncrypted.data as EncryptedSubmissionRequest, privateKey);
    const parsed = pqrsFormSchema.safeParse(JSON.parse(decrypted));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid PQRS payload", details: parsed.error.flatten() });
    }
    pqrsData = parsed.data as PqrsFormData;
  } catch (error) {
    console.error("Failed to decrypt PQRS payload", error);
    return res.status(400).json({ error: "Unable to decrypt PQRS payload" });
  }

  const tenant = getTenantContext(req);
  const recipients = formatRecipients(resolveTenantEnv("PQRS_EMAIL_TO", tenant));
  if (recipients.length === 0) {
    return res.status(500).json({ error: "PQRS_EMAIL_TO is not configured" });
  }

  const { html, text } = buildEmailContent(pqrsData);

  try {
    await sendEmail({
      to: recipients,
      subject: `Nueva solicitud PQRS - ${pqrsData.subject}`,
      text,
      html,
      from: resolveTenantEnv("PQRS_EMAIL_FROM", tenant) ?? undefined,
    }, { tenant });
  } catch (error) {
    console.error("Failed to send PQRS email", error);
    return res.status(502).json({ error: "Failed to send PQRS notification" });
  }

  const response: PqrsSubmissionResponse = { status: "ok" };
  res.json(response);
};
