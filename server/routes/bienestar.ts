import type { RequestHandler, Response } from "express";
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
  SiaFileAddRequestBody,
  SiaFileGetResponseItem,
} from "@shared/api";
import { FileAdd, FileGet, requestSiaToken, SiaServiceError } from "../services/sia";

const bienestarFormSchema = z.object({
  fullName: z.string().min(1),
  identification: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  service: z.string().min(1),
  serviceCatalog: z.string().min(1),
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

const SPANISH_MONTHS = new Map<string, number>([
  ["enero", 0],
  ["febrero", 1],
  ["marzo", 2],
  ["abril", 3],
  ["mayo", 4],
  ["junio", 5],
  ["julio", 6],
  ["agosto", 7],
  ["septiembre", 8],
  ["setiembre", 8],
  ["octubre", 9],
  ["noviembre", 10],
  ["diciembre", 11],
]);

const normalizeSpanishWord = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parsePreferredDateTime = (dateText: string, timeText: string) => {
  const dateMatch = dateText.match(/^(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+de\s+(\d{4})$/);
  if (!dateMatch) {
    return null;
  }

  const [, dayText, monthText, yearText] = dateMatch;
  const day = Number.parseInt(dayText, 10);
  const year = Number.parseInt(yearText, 10);
  const monthName = normalizeSpanishWord(monthText);
  const monthIndex = SPANISH_MONTHS.get(monthName);

  if (!Number.isFinite(day) || !Number.isFinite(year) || monthIndex === undefined) {
    return null;
  }

  const [hoursText, minutesText] = timeText.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const date = new Date(Date.UTC(year, monthIndex, day, hours, minutes));
  const isoString = date.toISOString();
  const [isoDate] = isoString.split("T");
  const normalizedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return {
    formDate: isoDate,
    formTime: normalizedTime,
    formDateTime: isoString,
  };
};

const splitFullName = (fullName: string) => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const buildServiceCode = (service: string) => {
  const normalized = service
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.replace(/\s+/g, "_").toUpperCase();
};

const SERVICE_CATALOG_MAP: Record<string, string> = {
  INFORMATICA: "IF",
  FINANCIERA: "FI",
};

const getServiceCatalogCode = (service: string): string | null => {
  const serviceCode = buildServiceCode(service);

  if (!serviceCode) {
    return null;
  }

  return SERVICE_CATALOG_MAP[serviceCode] ?? null;
};

const logJson = (label: string, payload: unknown) => {
  try {
    console.log(`[Bienestar] ${label}:`, JSON.stringify(payload));
  } catch (error) {
    console.log(`[Bienestar] ${label}:`, payload);
  }
};

const handleSiaErrorResponse = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof SiaServiceError) {
    if (error.status >= 500) {
      console.error(fallback, error);
    }

    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error(fallback, error);
  res.status(500).json({ error: fallback });
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
    formData = {
      fullName: parsed.data.fullName.trim(),
      identification: parsed.data.identification.trim(),
      email: parsed.data.email.trim(),
      phone: parsed.data.phone.trim(),
      service: parsed.data.service.trim(),
      serviceCatalog: parsed.data.serviceCatalog.trim().toUpperCase(),
      preferredDate: parsed.data.preferredDate.trim(),
      preferredTime: parsed.data.preferredTime.trim(),
    };
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

  const parsedPreferredDate = parsePreferredDateTime(formData.preferredDate, formData.preferredTime);
  const formDateTime = parsedPreferredDate?.formDateTime ?? new Date().toISOString();
  const formDate = parsedPreferredDate?.formDate ?? formData.preferredDate;
  const formTime = parsedPreferredDate?.formTime ?? formData.preferredTime;

  let siaToken: { access_token: string; consumerKey: string; dz: string } | null = null;
  try {
    const tokenResponse = await requestSiaToken();
    const consumerKey = tokenResponse.consumerKey?.trim();
    const dz = tokenResponse.dz?.trim();

    if (!consumerKey || !dz) {
      throw new SiaServiceError(
        "La respuesta del servicio de SIA no contiene los datos requeridos.",
        502,
        tokenResponse,
      );
    }

    logJson("SIA token response", tokenResponse);

    siaToken = {
      access_token: tokenResponse.access_token,
      consumerKey,
      dz,
    };
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al obtener el token de SIA.");
    return;
  }

  if (!siaToken) {
    return;
  }

  let fileGetItems: SiaFileGetResponseItem[];
  try {
    fileGetItems = await FileGet({
      sia_token: siaToken.access_token,
      sia_dz: siaToken.dz,
      sia_consumer_key: siaToken.consumerKey,
      user_identification: formData.identification,
    });

    logJson("SIA FileGet response", fileGetItems);

    if (!fileGetItems || fileGetItems.length === 0) {
      throw new SiaServiceError("El usuario no tiene beneficio contratados", 400, fileGetItems);
    }
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al consultar FileGet de SIA.");
    return;
  }

  const normalizedServiceCatalog = formData.serviceCatalog;
  const serviceCatalog = normalizedServiceCatalog || getServiceCatalogCode(formData.service);
  if (!serviceCatalog) {
    const error = new SiaServiceError(
      "No se pudo determinar el catálogo del servicio seleccionado.",
      500,
      { service: formData.service, serviceCatalog: formData.serviceCatalog },
    );
    handleSiaErrorResponse(res, error, "Ocurrió un error al validar los beneficios en SIA.");
    return;
  }

  const matchingService = fileGetItems.find(
    (item) => item.TipoServicio?.trim().toUpperCase() === serviceCatalog,
  );

  if (!matchingService) {
    const error = new SiaServiceError(
      "El usuario no tiene acceso a este beneficio",
      403,
      { service: formData.service, serviceCatalog: normalizedServiceCatalog, fileGetItems },
    );
    handleSiaErrorResponse(res, error, "Ocurrió un error al validar los beneficios en SIA.");
    return;
  }

  logJson("SIA FileGet matching service", matchingService);

  const availableServicesRaw = matchingService.ServiciosDisponibles?.trim() ?? "";
  const isUnlimited = availableServicesRaw.toUpperCase() === "ILIMITADO";
  const availableServicesCount = Number.parseInt(availableServicesRaw, 10);
  const hasAvailableServices =
    isUnlimited || (!Number.isNaN(availableServicesCount) && availableServicesCount > 0);

  console.log(`[Bienestar] Servicios disponibles para el catálogo ${serviceCatalog}:`, availableServicesRaw);

  if (!hasAvailableServices) {
    const error = new SiaServiceError(
      "El usuario no tiene servicios disponibles para este beneficio",
      403,
      matchingService,
    );
    handleSiaErrorResponse(res, error, "Ocurrió un error al validar los beneficios en SIA.");
    return;
  }

  const { firstName, lastName } = splitFullName(formData.fullName);
  const formCodeService = buildServiceCode(formData.service) || formData.service;

  const fileAddPayload: SiaFileAddRequestBody = {
    sia_token: siaToken.access_token,
    sia_dz: siaToken.dz,
    sia_consumer_key: siaToken.consumerKey,
    user_identification: formData.identification,
    form_datetime: formDateTime,
    form_code_service: formCodeService,
    user_name: firstName || formData.fullName,
    user_last_name: lastName || formData.fullName,
    user_email: formData.email,
    user_mobile: formData.phone,
    form_date: formDate,
    form_hora: formTime,
  };

  try {
    logJson("SIA FileAdd request", fileAddPayload);
    const fileAddResponse = await FileAdd(fileAddPayload);
    logJson("SIA FileAdd response", fileAddResponse);
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al registrar la solicitud en SIA.");
    return;
  }

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

