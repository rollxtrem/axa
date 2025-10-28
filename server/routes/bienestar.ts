import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  SiaFileAddPayload,
  SiaFileAddRequestBody,
  SiaFileAddResponse,
  SiaFileGetResponseItem,
} from "@shared/api";
import { FileAdd, FileGet, requestSiaToken, SiaServiceError } from "../services/sia";
import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";
import { buildSiaFileAddPayloadFromTemplate } from "../sia/file-add-template";

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

const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(moduleDirname, "../plantillas");

const loadTemplate = (filename: string) => {
  const templatePath = path.resolve(templatesDir, filename);
  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`Failed to load email template at ${templatePath}`, error);
    throw new Error("Unable to load Bienestar email template");
  }
};

const bienestarHtmlTemplate = loadTemplate("bienestar.html");

const bienestarTextTemplate = `Nueva solicitud de bienestar

Se ha recibido una nueva solicitud de agendamiento a través del portal de bienestar.

Datos de contacto
Nombre: {{fullName}}
Identificación: {{identification}}
Correo: {{email}}
Teléfono: {{phone}}

Detalles de la cita
Servicio: {{service}}
Catálogo del servicio: {{serviceCatalog}}
Fecha preferida: {{preferredDate}}
Hora preferida: {{preferredTime}}

----------------------------------------
Advertencia legal: El contenido de este mensaje, incluidos los ficheros adjuntos, es confidencial. Si usted ha recibido o accedido a este mensaje por error, le rogamos que nos comunique esta incidencia por la misma vía y proceda a destruir el mensaje de forma inmediata. Cualquier opinión contenida en este mensaje es responsabilidad de su autor y no representa necesariamente la opinión de AXA PARTNERS COLOMBIA. Su dirección de correo y demás datos de contacto se encuentran recogidos en nuestros ficheros con la finalidad de gestionar la relación contractual y/o mantenerlo informado. Entendemos que usted consiente el tratamiento de los citados datos con dicha finalidad, y estos serán tratados conforme a nuestra Política de Privacidad (https://www.axapartners.co/es/pagina/politica-de-privacidad). Puede ejercer sus derechos en materia de protección de datos de acuerdo con la Ley 1581 de 2012, dirigiéndose por escrito al correo electrónico: dataprivacy@axa-assistance.com.co. Tenga presente que cualquier uso de datos que no esté circunscrito a las finalidades descritas en las políticas, o que se realice sin el consentimiento previo de los titulares, está sujeto a las sanciones previstas en la normativa colombiana.`;

const renderTemplate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template,
  );

const buildEmailContent = (data: BienestarFormData) => {
  const serviceCatalogValue = data.serviceCatalog.trim()
    ? data.serviceCatalog
    : "No especificado";

  const htmlValues = {
    fullName: escapeHtml(data.fullName),
    identification: escapeHtml(data.identification),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone),
    service: escapeHtml(data.service),
    serviceCatalog: escapeHtml(serviceCatalogValue),
    preferredDate: escapeHtml(data.preferredDate),
    preferredTime: escapeHtml(data.preferredTime),
  };

  const textValues = {
    fullName: data.fullName,
    identification: data.identification,
    email: data.email,
    phone: data.phone,
    service: data.service,
    serviceCatalog: serviceCatalogValue,
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
  };

  const html = renderTemplate(bienestarHtmlTemplate, htmlValues);
  const text = renderTemplate(bienestarTextTemplate, textValues);

  return { html, text };
};

const buildUserConfirmationContent = (message: string) => {
  const sanitizedMessage = escapeHtml(message);
  const html = `<p>${sanitizedMessage}</p>`;
  const text = message;

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

const CONTACT_OFFICE_MESSAGE =
  "Señor usuario, por favor póngase en contacto con la oficina donde adquirió su producto.";
const SERVICE_REQUEST_ERROR_MESSAGE = "Error al solicitar el servicio";

type SiaErrorOverride = {
  test: (error: SiaServiceError) => boolean;
  message: string;
};

const handleSiaErrorResponse = (
  res: Response,
  error: unknown,
  fallback: string,
  overrides: SiaErrorOverride[] = []
) => {
  if (error instanceof SiaServiceError) {
    if (error.status >= 500) {
      console.error(fallback, error);
    }

    const override = overrides.find(({ test }) => {
      try {
        return test(error);
      } catch (overrideError) {
        console.warn("Error evaluating SIA override", overrideError);
        return false;
      }
    });

    const message = override?.message ?? error.message;

    res.status(error.status).json({ error: message });
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

  const tenant = getTenantContext(req);
  const recipients = formatRecipients(resolveTenantEnv("BIENESTAR_EMAIL_TO", tenant));
  if (recipients.length === 0) {
    return res.status(500).json({ error: "BIENESTAR_EMAIL_TO is not configured" });
  }

  const fromAddress = resolveTenantEnv("BIENESTAR_EMAIL_FROM", tenant) ?? undefined;
  const { html, text } = buildEmailContent(formData);

  const parsedPreferredDate = parsePreferredDateTime(formData.preferredDate, formData.preferredTime);
  const formDate = parsedPreferredDate?.formDate ?? formData.preferredDate;
  const formTime = parsedPreferredDate?.formTime ?? formData.preferredTime;

  let siaToken: { access_token: string; consumerKey: string; dz: string } | null = null;
  try {
    const tokenResponse = await requestSiaToken({ tenant });
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
    handleSiaErrorResponse(res, error, "Ocurrió un error al obtener el token de SIA.", [
      {
        test: (err) => err.message === "La respuesta de SIA tiene un formato inesperado.",
        message: SERVICE_REQUEST_ERROR_MESSAGE,
      },
    ]);
    return;
  }

  if (!siaToken) {
    return;
  }

  let fileGetItems: SiaFileGetResponseItem[];
  try {
    fileGetItems = await FileGet(
      {
        sia_token: siaToken.access_token,
        sia_dz: siaToken.dz,
        sia_consumer_key: siaToken.consumerKey,
        user_identification: formData.identification,
      },
      { tenant }
    );

    logJson("SIA FileGet response", fileGetItems);

    if (!fileGetItems || fileGetItems.length === 0) {
      throw new SiaServiceError(CONTACT_OFFICE_MESSAGE, 400, {
        reason: "NO_CONTRACTED_BENEFITS",
        fileGetItems,
      });
    }
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al consultar FileGet de SIA.", [
      {
        test: (err) =>
          err.message === "La respuesta de SIA FileGet tiene un formato inesperado." ||
          err.message.startsWith("Elemento") ||
          err.message === "La respuesta de SIA tiene un formato inesperado.",
        message: CONTACT_OFFICE_MESSAGE,
      },
      {
        test: (err) => err.message === "El servicio FileGet de SIA respondió con un error.",
        message: CONTACT_OFFICE_MESSAGE,
      },
      {
        test: (err) => err.message === CONTACT_OFFICE_MESSAGE,
        message: CONTACT_OFFICE_MESSAGE,
      },
    ]);
    return;
  }

  const normalizedServiceCatalog = formData.serviceCatalog.trim().toUpperCase();
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

  logJson("serviceCatalog", serviceCatalog);
  const matchingService = fileGetItems.find(
    (item) => item.TipoServicio?.trim().toUpperCase() === serviceCatalog,
  );

  logJson("SIA matchingService ==>", serviceCatalog);
  if (!matchingService) {
    const error = new SiaServiceError(CONTACT_OFFICE_MESSAGE, 403, {
      reason: "NO_MATCHING_SERVICE",
      service: formData.service,
      serviceCatalog: normalizedServiceCatalog,
      fileGetItems,
    });
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
    const error = new SiaServiceError(CONTACT_OFFICE_MESSAGE, 403, {
      reason: "NO_AVAILABLE_SERVICES",
      matchingService,
    });
    handleSiaErrorResponse(res, error, "Ocurrió un error al validar los beneficios en SIA.");
    return;
  }


  try {
    const tokenResponse = await requestSiaToken({ tenant });
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
    handleSiaErrorResponse(res, error, "Ocurrió un error al obtener el token de SIA.", [
      {
        test: (err) => err.message === "La respuesta de SIA tiene un formato inesperado.",
        message: SERVICE_REQUEST_ERROR_MESSAGE,
      },
    ]);
    return;
  }

  if (!siaToken) {
    return;
  }
  
  const userFullName = formData.fullName.trim() || formData.fullName;
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // +1 porque los meses van de 0 a 11
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const now_datetime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;


  let templatePayload: SiaFileAddPayload;
  try {
    templatePayload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      replacements: {
        sia_dz: siaToken.dz,
        sia_consumer_key: siaToken.consumerKey,
        user_identification: formData.identification,
        form_code_service: serviceCatalog,
        user_name: userFullName,
        user_email: formData.email,
        user_mobile: formData.phone,
        form_date: formDate,
        form_hora: formTime,
      },
    });
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al preparar la solicitud de SIA.");
    return;
  }

  const fileAddPayload: SiaFileAddRequestBody = {
    ...templatePayload,
    sia_token: siaToken.access_token,
    sia_dz: siaToken.dz,
    sia_consumer_key: siaToken.consumerKey,
    user_identification: formData.identification,
    form_code_service: serviceCatalog,
    user_name: userFullName,
    user_email: formData.email,
    user_mobile: formData.phone,
    form_date: formDate,
    form_hora: formTime,
    dz: siaToken.dz,
    consumerKey: siaToken.consumerKey,
    policy: formData.identification,
    idCatalogServices: serviceCatalog,
    idCatalogClassification: serviceCatalog,
    idCatalogRequiredService: serviceCatalog,
    name: userFullName,
    lastname: userFullName,
    beneficiaryName: userFullName,
    beneficiaryLastname: userFullName,
    email: formData.email,
    mobile: formData.phone,
    carPlates: formData.identification,
    scheduleDate: formDate,
    scheduleHour: formTime,
    startDatePolicy: now_datetime,
    endDatePolicy: now_datetime,
  };

  let fileAddResponse: SiaFileAddResponse;
  try {
    logJson("SIA FileAdd request", fileAddPayload);
    fileAddResponse = await FileAdd(fileAddPayload, { tenant });
    logJson("SIA FileAdd response", fileAddResponse);
  } catch (error) {
    handleSiaErrorResponse(res, error, "Ocurrió un error al registrar la solicitud en SIA.");
    return;
  }

  const expedienteRaw = fileAddResponse.File;
  const expediente = expedienteRaw.trim() || expedienteRaw;
  const confirmationMessage = `Estimado cliente, su solicitud ha sido radicada bajo el expediente ${expediente}. Por favor, esté atento a su línea telefónica donde le estaremos informando sobre la prestación de su servicio.`;
  const { html: userHtml, text: userText } = buildUserConfirmationContent(confirmationMessage);

  try {
    await sendEmail({
      to: recipients,
      subject: `Nueva solicitud bienestar - ${formData.service}`,
      text,
      html,
      from: fromAddress,
    }, { tenant });

    await sendEmail({
      to: [formData.email],
      subject: `Solicitud recibida - ${formData.service}`,
      text: userText,
      html: userHtml,
      from: fromAddress,
    }, { tenant });
  } catch (error) {
    console.error("Failed to send bienestar email", error);
    return res.status(502).json({ error: "Failed to send bienestar notification" });
  }

  const response: BienestarSubmissionResponse = {
    status: "ok",
    message: confirmationMessage,
    file: expediente,
  };
  res.json(response);
};

