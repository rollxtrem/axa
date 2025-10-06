import { RequestHandler } from "express";
import { z } from "zod";

import {
  decryptPayload,
  encryptedRequestSchema,
  escapeHtml,
  formatRecipients,
  normalizePem,
} from "./utils/encrypted-request";
import { sendEmail } from "../services/email";
import type {
  BienestarFormData,
  BienestarPublicKeyResponse,
  BienestarSubmissionRequest,
  BienestarSubmissionResponse,
  EncryptedSubmissionRequest,
} from "@shared/api";

const bienestarFormSchema = z.object({
  fullName: z.string().min(1),
  identification: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  service: z.string().min(1),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
});

type _EncryptedRequestMatchesSchema = BienestarSubmissionRequest extends z.infer<typeof encryptedRequestSchema>
  ? true
  : never;

const buildEmailContent = (data: BienestarFormData) => {
  const html = `
    <h1>Nueva solicitud de bienestar</h1>
    <p>Se ha recibido una nueva solicitud de agendamiento a través del portal de bienestar.</p>
    <h2>Datos de contacto</h2>
    <ul>
      <li><strong>Nombre:</strong> ${escapeHtml(data.fullName)}</li>
      <li><strong>Identificación:</strong> ${escapeHtml(data.identification)}</li>
      <li><strong>Correo:</strong> ${escapeHtml(data.email)}</li>
      <li><strong>Teléfono:</strong> ${escapeHtml(data.phone)}</li>
    </ul>
    <h2>Detalles de la cita</h2>
    <ul>
      <li><strong>Servicio:</strong> ${escapeHtml(data.service)}</li>
      <li><strong>Fecha preferida:</strong> ${escapeHtml(data.preferredDate)}</li>
      <li><strong>Hora preferida:</strong> ${escapeHtml(data.preferredTime)}</li>
    </ul>
  `;

  const text = [
    "Nueva solicitud de bienestar",
    "",
    "Datos de contacto:",
    `Nombre: ${data.fullName}`,
    `Identificación: ${data.identification}`,
    `Correo: ${data.email}`,
    `Teléfono: ${data.phone}`,
    "",
    "Detalles de la cita:",
    `Servicio: ${data.service}`,
    `Fecha preferida: ${data.preferredDate}`,
    `Hora preferida: ${data.preferredTime}`,
  ].join("\n");

  return { html, text };
};

const buildUserConfirmationContent = (data: BienestarFormData) => {
  const html = `
    <h1>Confirmación de solicitud</h1>
    <p>Hola ${escapeHtml(data.fullName)},</p>
    <p>Hemos recibido tu solicitud para el servicio de ${escapeHtml(data.service)}.</p>
    <p>Estos son los datos que registraste:</p>
    <ul>
      <li><strong>Fecha preferida:</strong> ${escapeHtml(data.preferredDate)}</li>
      <li><strong>Hora preferida:</strong> ${escapeHtml(data.preferredTime)}</li>
    </ul>
    <p>Muy pronto uno de nuestros especialistas se pondrá en contacto contigo para confirmar los detalles.</p>
    <p>Gracias por confiar en AXA.</p>
  `;

  const text = [
    "Confirmación de solicitud",
    "",
    `Hola ${data.fullName},`,
    `Hemos recibido tu solicitud para el servicio de ${data.service}.`,
    "Muy pronto uno de nuestros especialistas se pondrá en contacto contigo para confirmar los detalles.",
    "",
    "Datos registrados:",
    `Fecha preferida: ${data.preferredDate}`,
    `Hora preferida: ${data.preferredTime}`,
    "",
    "Gracias por confiar en AXA.",
  ].join("\n");

  return { html, text };
};

export const handleGetBienestarPublicKey: RequestHandler = (_req, res) => {
  const publicKey = process.env.BIENESTAR_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "BIENESTAR public key is not configured" });
  }

  const response: BienestarPublicKeyResponse = {
    publicKey: normalizePem(publicKey),
  };

  res.json(response);
};

export const handleSubmitBienestar: RequestHandler = async (req, res) => {
  const privateKey = process.env.BIENESTAR_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "BIENESTAR private key is not configured" });
  }

  const parseEncrypted = encryptedRequestSchema.safeParse(req.body);
  if (!parseEncrypted.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parseEncrypted.error.flatten() });
  }

  let formData: BienestarFormData;
  try {
    const decrypted = decryptPayload(parseEncrypted.data as EncryptedSubmissionRequest, privateKey);
    const parsed = bienestarFormSchema.safeParse(JSON.parse(decrypted));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form payload", details: parsed.error.flatten() });
    }
    formData = parsed.data as BienestarFormData;
  } catch (error) {
    console.error("Failed to decrypt bienestar payload", error);
    return res.status(400).json({ error: "Unable to decrypt form payload" });
  }

  const recipients = formatRecipients(process.env.BIENESTAR_EMAIL_TO);
  if (recipients.length === 0) {
    return res.status(500).json({ error: "BIENESTAR_EMAIL_TO is not configured" });
  }

  const fromAddress = process.env.BIENESTAR_EMAIL_FROM ?? undefined;
  const { html, text } = buildEmailContent(formData);
  const { html: userHtml, text: userText } = buildUserConfirmationContent(formData);

  try {
    await sendEmail({
      to: recipients,
      subject: `Nueva solicitud bienestar - ${formData.service}`,
      text,
      html,
      from: fromAddress,
    });

    await sendEmail({
      to: [formData.email],
      subject: `Solicitud recibida - ${formData.service}`,
      text: userText,
      html: userHtml,
      from: fromAddress,
    });
  } catch (error) {
    console.error("Failed to send bienestar email", error);
    return res.status(502).json({ error: "Failed to send bienestar notification" });
  }

  const response: BienestarSubmissionResponse = { status: "ok" };
  res.json(response);
};

