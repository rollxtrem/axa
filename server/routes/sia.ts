import type { RequestHandler } from "express";

import type {
  SiaFileGetRequestBody,
  SiaFileGetResponse,
  SiaTokenResponse,
} from "@shared/api";
import { FileGet, requestSiaToken, SiaServiceError } from "../services/sia";

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

export const handleRequestSiaToken: RequestHandler = async (_req, res) => {
  try {
    const response: SiaTokenResponse = await requestSiaToken();
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

  try {
    const response: SiaFileGetResponse = await FileGet(body);
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

