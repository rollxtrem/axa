import type { RequestHandler } from "express";

import type {
  SiaFileAddRequestBody,
  SiaFileAddResponse,
  SiaFileGetRequestBody,
  SiaFileGetResponse,
  SiaFileAddPayload,
  SiaProcessRequestBody,
  SiaProcessResponseBody,
  SiaProcessStepResult,
  SiaTokenResponse,
  TenantSummary,
} from "@shared/api";
import {
  FileAdd,
  FileGet,
  getSiaEndpoints,
  prepareSiaFileAddRequest,
  requestSiaToken,
  SiaServiceError,
} from "../services/sia";
import { buildSiaFileAddPayloadWithMetadata } from "../sia/file-add-template";
import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";

const sanitizeSiaFileGetBody = (body: unknown): SiaFileGetRequestBody => {
  if (typeof body !== "object" || body === null) {
    throw new SiaServiceError("El cuerpo de la solicitud es inválido.", 400);
  }

  const requiredFields: (keyof SiaFileGetRequestBody)[] = [
    "sia_token",
    "sia_dz",
    "sia_consumer_key",
    "user_identification",
  ];

  const parsed = Object.create(null) as SiaFileGetRequestBody;

  for (const field of requiredFields) {
    const value = (body as Record<string, unknown>)[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new SiaServiceError(`El campo "${field}" es obligatorio.`, 400);
    }

    parsed[field] = value.trim();
  }

  return parsed;
};

type SiaFileAddRequiredField =
  | "sia_token"
  | "sia_dz"
  | "sia_consumer_key"
  | "user_identification"
  | "form_code_service"
  | "user_name"
  | "user_email"
  | "user_mobile"
  | "form_date"
  | "form_hora";

const sanitizeSiaFileAddBody = (body: unknown): SiaFileAddRequestBody => {
  if (typeof body !== "object" || body === null) {
    throw new SiaServiceError("El cuerpo de la solicitud es inválido.", 400);
  }

  const requiredFields: SiaFileAddRequiredField[] = [
    "sia_token",
    "sia_dz",
    "sia_consumer_key",
    "user_identification",
    "form_code_service",
    "user_name",
    "user_email",
    "user_mobile",
    "form_date",
    "form_hora",
  ];

  const parsed = Object.create(null) as SiaFileAddRequestBody;

  for (const field of requiredFields) {
    const value = (body as Record<string, unknown>)[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new SiaServiceError(`El campo "${field}" es obligatorio.`, 400);
    }

    parsed[field] = value.trim();
  }

  const optionalStringFields: (keyof SiaFileAddPayload)[] = [
    "dz",
    "consumerKey",
    "idCatalogCountry",
    "contract",
    "policy",
    "statusPolicy",
    "startDatePolicy",
    "endDatePolicy",
    "idCatalogTypeAssistance",
    "idCatalogFile",
    "idCatalogDiagnostic",
    "idCatalogServices",
    "idCatalogClassification",
    "idCatalogRequiredService",
    "idCatalogSinisterCode",
    "idCatalogServiceCode",
    "idCatalogProblem",
    "idCatalogSecondCall",
    "idCatalogTransfer",
    "idCatalogAssignmentType",
    "idCatalogServiceCondition",
    "name",
    "lastname",
    "beneficiaryName",
    "beneficiaryLastname",
    "gender",
    "email",
    "mobile",
    "addressOrigin",
    "idCityCallOrigin",
    "cityCallOrigin",
    "stateCallOrigin",
    "addressDestiny",
    "idCityCallDestiny",
    "stateCallDestiny",
    "idStateCallDestiny",
    "carPlates",
    "carBrand",
    "carModel",
    "carYear",
    "carColor",
    "scheduleService",
    "scheduleDate",
    "scheduleHour",
    "reasonCalled",
    "comment",
  ];

  const optionalBooleanFields: (keyof SiaFileAddPayload)[] = ["vip"];

  const optionalNumberFields: (keyof SiaFileAddPayload)[] = [
    "age",
    "latitudeOrigin",
    "lengthOrigin",
    "latitudeDestiny",
    "lengthDestiny",
  ];

  for (const field of optionalStringFields) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined) {
      continue;
    }

    if (typeof value !== "string") {
      throw new SiaServiceError(`El campo "${field}" debe ser un texto válido.`, 400);
    }

    const trimmed = value.trim();
    if (trimmed) {
      (parsed as unknown as Record<string, unknown>)[field] = trimmed;
    }
  }

  for (const field of optionalBooleanFields) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined) {
      continue;
    }

    if (typeof value !== "boolean") {
      throw new SiaServiceError(`El campo "${field}" debe ser un valor booleano.`, 400);
    }

    (parsed as unknown as Record<string, unknown>)[field] = value;
  }

  for (const field of optionalNumberFields) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined) {
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new SiaServiceError(`El campo "${field}" debe ser un número válido.`, 400);
    }

    (parsed as unknown as Record<string, unknown>)[field] = value;
  }

  return parsed;
};

const sanitizeSiaProcessBody = (body: unknown): SiaProcessRequestBody => {
  if (typeof body !== "object" || body === null) {
    throw new SiaServiceError("El cuerpo de la solicitud es inválido.", 400);
  }

  const requiredFields: (keyof SiaProcessRequestBody)[] = [
    "identification",
    "name",
    "phone",
    "email",
    "serviceDate",
    "serviceTime",
    "serviceCode",
  ];

  const parsed = Object.create(null) as SiaProcessRequestBody;

  for (const field of requiredFields) {
    const value = (body as Record<string, unknown>)[field];
    if (typeof value !== "string") {
      throw new SiaServiceError(`El campo "${field}" es obligatorio.`, 400);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new SiaServiceError(`El campo "${field}" es obligatorio.`, 400);
    }

    parsed[field] = trimmed;
  }

  return parsed;
};

const buildTenantSummary = (tenant: ReturnType<typeof getTenantContext>): TenantSummary | null => {
  if (!tenant) {
    return null;
  }

  return { id: tenant.id, host: tenant.host };
};

const buildFallbackEmail = (identification: string): string => {
  const normalized = identification
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  const localPart = (normalized || "usuario.sia").slice(0, 64);
  return `${localPart}@example.com`;
};

const buildFallbackMobile = (identification: string): string => {
  const digits = identification.replace(/\D+/g, "");
  if (digits.length >= 10) {
    return digits.slice(0, 15);
  }

  return "3000000000";
};

const requireTokenField = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new SiaServiceError(
      `La respuesta de SIA no contiene el campo "${field}" esperado.`,
      500,
      value,
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new SiaServiceError(
      `La respuesta de SIA no contiene un valor válido para "${field}".`,
      500,
      value,
    );
  }

  return trimmed;
};

export const handleRequestSiaToken: RequestHandler = async (req, res) => {
  try {
    const tenant = getTenantContext(req);
    const response: SiaTokenResponse = await requestSiaToken({ tenant });
    res.json(response);
  } catch (error) {
    if (error instanceof SiaServiceError) {
      if (error.status >= 500) {
        console.error("SIA service error", error);
      }
      return res.status(error.status).json({ error: error.message, details: error.details });
    }

    console.error("Unexpected error fetching SIA token", error);
    res.status(500).json({ error: "Ocurrió un error al obtener el token de SIA." });
  }
};

export const handleSiaFileGet: RequestHandler = async (req, res) => {
  let body: SiaFileGetRequestBody;

  try {
    body = sanitizeSiaFileGetBody(req.body);
  } catch (error) {
    if (error instanceof SiaServiceError && error.status === 400) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("Invalid SIA FileGet request body", error);
    return res.status(400).json({ error: "El cuerpo de la solicitud es inválido." });
  }

  const tenant = getTenantContext(req);

  try {
    const response: SiaFileGetResponse = await FileGet(body, { tenant });
    res.json(response);
  } catch (error) {
    if (error instanceof SiaServiceError) {
      if (error.status >= 500) {
        console.error("SIA FileGet service error", error);
      }
      return res.status(error.status).json({ error: error.message, details: error.details });
    }

    console.error("Unexpected error calling SIA FileGet", error);
    res.status(500).json({ error: "Ocurrió un error al consultar FileGet de SIA." });
  }
};

export const handleSiaFileAdd: RequestHandler = async (req, res) => {
  let body: SiaFileAddRequestBody;

  try {
    body = sanitizeSiaFileAddBody(req.body);
  } catch (error) {
    if (error instanceof SiaServiceError && error.status === 400) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("Invalid SIA FileAdd request body", error);
    return res.status(400).json({ error: "El cuerpo de la solicitud es inválido." });
  }

  const tenant = getTenantContext(req);

  try {
    const response: SiaFileAddResponse = await FileAdd(body, { tenant });
    res.json(response);
  } catch (error) {
    if (error instanceof SiaServiceError) {
      if (error.status >= 500) {
        console.error("SIA FileAdd service error", error);
      }
      return res.status(error.status).json({ error: error.message, details: error.details });
    }

    console.error("Unexpected error calling SIA FileAdd", error);
    res.status(500).json({ error: "Ocurrió un error al invocar FileAdd de SIA." });
  }
};

export const handleSiaProcess: RequestHandler = async (req, res) => {
  let body: SiaProcessRequestBody;

  try {
    body = sanitizeSiaProcessBody(req.body);
  } catch (error) {
    if (error instanceof SiaServiceError && error.status === 400) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Invalid SIA process request body", error);
    return res.status(400).json({ error: "El cuerpo de la solicitud es inválido." });
  }

  const tenant = getTenantContext(req);
  const tenantSummary = buildTenantSummary(tenant);
  const endpoints = getSiaEndpoints(tenant);
  const steps: SiaProcessStepResult[] = [];
  let templateFilename: string | null = null;

  const identification = body.identification;
  const providedName = body.name;
  const providedEmail = body.email;
  const providedPhone = body.phone;
  const serviceDate = body.serviceDate;
  const serviceTime = body.serviceTime;
  const serviceCode = body.serviceCode.toUpperCase();

  const userName = providedName || identification;
  const userEmail = providedEmail || buildFallbackEmail(identification);
  const userMobile = providedPhone || buildFallbackMobile(identification);

  const replacements = {
    sia_dz: "",
    sia_consumer_key: "",
    user_identification: identification,
    form_code_service: serviceCode,
    user_name: userName,
    user_email: userEmail,
    user_mobile: userMobile,
    form_date: serviceDate,
    form_hora: serviceTime,
  };

  const grantType = resolveTenantEnv("SIA_GRANT_TYPE", tenant) ?? "password";

  const buildTokenStepRequest = (context: string) => ({
    method: "POST",
    url: endpoints.tokenUrl,
    body: {
      grant_type: grantType,
      username: "[PROTEGIDO]",
      password: "[PROTEGIDO]",
      DZ: "[PROTEGIDO]",
    },
    context,
  });

  const requestAndRecordToken = async (context: string) => {
    const token = await requestSiaToken({ tenant });

    steps.push({
      name: "token",
      request: buildTokenStepRequest(context),
      response: token,
    });

    return token;
  };

  try {
    const tokenForFileGet = await requestAndRecordToken("Token inicial para FileGet");

    const accessTokenForFileGet = requireTokenField(
      tokenForFileGet.access_token,
      "access_token",
    );
    const dzForFileGet = requireTokenField(tokenForFileGet.dz, "dz");
    const consumerKeyForFileGet = requireTokenField(
      tokenForFileGet.consumerKey,
      "consumerKey",
    );

    replacements.sia_dz = dzForFileGet;
    replacements.sia_consumer_key = consumerKeyForFileGet;

    const fileGetRequest: SiaFileGetRequestBody = {
      sia_token: accessTokenForFileGet,
      sia_dz: dzForFileGet,
      sia_consumer_key: consumerKeyForFileGet,
      user_identification: identification,
    };

    const fileGetResponse = await FileGet(fileGetRequest, { tenant });

    steps.push({
      name: "fileGet",
      request: {
        method: "POST",
        url: endpoints.fileGetUrl,
        body: fileGetRequest,
      },
      response: fileGetResponse,
    });

    const tokenForFileAdd = await requestAndRecordToken(
      "Token actualizado para FileAdd",
    );

    const accessTokenForFileAdd = requireTokenField(
      tokenForFileAdd.access_token,
      "access_token",
    );
    const dzForFileAdd = requireTokenField(tokenForFileAdd.dz, "dz");
    const consumerKeyForFileAdd = requireTokenField(
      tokenForFileAdd.consumerKey,
      "consumerKey",
    );

    replacements.sia_dz = dzForFileAdd;
    replacements.sia_consumer_key = consumerKeyForFileAdd;

    const template = await buildSiaFileAddPayloadWithMetadata({
      tenant,
      formCodeService: serviceCode,
      replacements,
    });

    templateFilename = template.templateFilename;

    const fileAddRequest: SiaFileAddRequestBody = {
      ...template.payload,
      sia_token: accessTokenForFileAdd,
      sia_dz: dzForFileAdd,
      sia_consumer_key: consumerKeyForFileAdd,
      user_identification: identification,
      form_code_service: serviceCode,
      user_name: userName,
      user_email: userEmail,
      user_mobile: userMobile,
      form_date: serviceDate,
      form_hora: serviceTime,
    };

    const preparedFileAdd = prepareSiaFileAddRequest(fileAddRequest, { tenant });
    const fileAddResponse = await FileAdd(fileAddRequest, { tenant }, preparedFileAdd);

    steps.push({
      name: "fileAdd",
      request: {
        method: "POST",
        url: endpoints.fileAddUrl,
        body: preparedFileAdd.payload,
      },
      response: fileAddResponse,
    });

    const responseBody: SiaProcessResponseBody = {
      tenant: tenantSummary,
      template: { filename: templateFilename },
      steps,
    };

    res.json(responseBody);
  } catch (error) {
    if (error instanceof SiaServiceError) {
      if (error.status >= 500) {
        console.error("SIA process service error", error);
      }
      return res.status(error.status).json({
        error: error.message,
        details: error.details,
        tenant: tenantSummary,
        template: { filename: templateFilename },
        steps,
      });
    }

    console.error("Unexpected error executing SIA process", error);
    res.status(500).json({
      error: "Ocurrió un error al procesar la solicitud de SIA.",
      tenant: tenantSummary,
      template: { filename: templateFilename },
      steps,
    });
  }
};

