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
  FormacionFormData,
  FormacionPublicKeyResponse,
  FormacionSubmissionRequest,
  FormacionSubmissionResponse,
} from "@shared/api";

const formacionFormSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  course: z.string().min(1),
});

type _EncryptedRequestMatchesSchema = FormacionSubmissionRequest extends z.infer<typeof encryptedRequestSchema>
  ? true
  : never;

const buildEmailContent = (data: FormacionFormData) => {
  const html = `
    <h1>Nueva inscripción a curso</h1>
    <p>Se ha recibido una nueva inscripción a través del portal de formación.</p>
    <ul>
      <li><strong>Nombre:</strong> ${escapeHtml(data.fullName)}</li>
      <li><strong>Correo:</strong> ${escapeHtml(data.email)}</li>
      <li><strong>Curso seleccionado:</strong> ${escapeHtml(data.course)}</li>
    </ul>
  `;

  const text = [
    "Nueva inscripción a curso",
    "",
    `Nombre: ${data.fullName}`,
    `Correo: ${data.email}`,
    `Curso seleccionado: ${data.course}`,
  ].join("\n");

  return { html, text };
};

export const handleGetFormacionPublicKey: RequestHandler = (_req, res) => {
  const publicKey = process.env.FORMACION_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "FORMACION public key is not configured" });
  }

  const response: FormacionPublicKeyResponse = {
    publicKey: normalizePem(publicKey),
  };

  res.json(response);
};

export const handleSubmitFormacion: RequestHandler = async (req, res) => {
  const privateKey = process.env.FORMACION_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "FORMACION private key is not configured" });
  }

  const parseEncrypted = encryptedRequestSchema.safeParse(req.body);
  if (!parseEncrypted.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parseEncrypted.error.flatten() });
  }

  let formData: FormacionFormData;
  try {
    const decrypted = decryptPayload(parseEncrypted.data, privateKey);
    const parsed = formacionFormSchema.safeParse(JSON.parse(decrypted));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form payload", details: parsed.error.flatten() });
    }
    formData = parsed.data;
  } catch (error) {
    console.error("Failed to decrypt formación payload", error);
    return res.status(400).json({ error: "Unable to decrypt form payload" });
  }

  const recipients = formatRecipients(process.env.FORMACION_EMAIL_TO);
  if (recipients.length === 0) {
    return res.status(500).json({ error: "FORMACION_EMAIL_TO is not configured" });
  }

  const { html, text } = buildEmailContent(formData);

  try {
    await sendEmail({
      to: recipients,
      subject: `Nueva inscripción curso - ${formData.course}`,
      text,
      html,
      from: process.env.FORMACION_EMAIL_FROM ?? process.env.PQRS_EMAIL_FROM ?? undefined,
    });
  } catch (error) {
    console.error("Failed to send formación email", error);
    return res.status(502).json({ error: "Failed to send formación notification" });
  }

  const response: FormacionSubmissionResponse = { status: "ok" };
  res.json(response);
};
