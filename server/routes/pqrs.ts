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

const buildEmailContent = (data: PqrsFormData) => {
  const html = `
    <h1>Nueva solicitud PQRS</h1>
    <p>Se ha recibido una nueva solicitud PQRS a través del portal.</p>
    <h2>Datos personales</h2>
    <ul>
      <li><strong>Nombre:</strong> ${escapeHtml(data.fullName)}</li>
      <li><strong>Correo:</strong> ${escapeHtml(data.email)}</li>
      <li><strong>Teléfono:</strong> ${escapeHtml(data.phone)}</li>
      <li><strong>Tipo de documento:</strong> ${escapeHtml(data.documentType)}</li>
      <li><strong>Número de documento:</strong> ${escapeHtml(data.documentNumber)}</li>
    </ul>
    <h2>Detalle de la solicitud</h2>
    <ul>
      <li><strong>Tipo:</strong> ${escapeHtml(data.requestType)}</li>
      <li><strong>Asunto:</strong> ${escapeHtml(data.subject)}</li>
    </ul>
    <p><strong>Descripción:</strong></p>
    <p>${escapeHtml(data.description).replace(/\n/g, "<br />")}</p>
  `;

  const text = [
    "Nueva solicitud PQRS",
    "",
    "Datos personales:",
    `Nombre: ${data.fullName}`,
    `Correo: ${data.email}`,
    `Teléfono: ${data.phone}`,
    `Tipo de documento: ${data.documentType}`,
    `Número de documento: ${data.documentNumber}`,
    "",
    "Detalle de la solicitud:",
    `Tipo: ${data.requestType}`,
    `Asunto: ${data.subject}`,
    "",
    "Descripción:",
    data.description,
  ].join("\n");

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
