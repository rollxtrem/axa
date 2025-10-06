import type { SiaTokenResponse } from "@shared/api";

const SIA_TOKEN_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/token";

type SiaTokenApiResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  uid?: unknown;
  ulogin?: unknown;
  consumerKey?: unknown;
  dz?: unknown;
  ".issued"?: unknown;
  ".expires"?: unknown;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class SiaServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "SiaServiceError";
    this.status = status;
    this.details = details;
  }
}

type SiaConfig = {
  username: string;
  password: string;
  dz: string;
};

const getSiaConfig = (): SiaConfig => {
  const username = process.env.SIA_USERNAME?.trim();
  const password = process.env.SIA_PASSWORD?.trim();
  const dz = process.env.SIA_DZ?.toString().trim() || "";

  if (!username || !password || !dz) {
    throw new SiaServiceError(
      "Configuración de SIA incompleta. Verifica las variables SIA_USERNAME, SIA_PASSWORD y SIA_DZ.",
      500
    );
  }

  return { username, password, dz };
};

const parseSiaResponse = (body: unknown): SiaTokenResponse => {
  if (!isRecord(body)) {
    throw new SiaServiceError("La respuesta de SIA tiene un formato inesperado.", 500, body);
  }

  const {
    access_token,
    token_type,
    expires_in,
    uid,
    ulogin,
    consumerKey,
    dz,
    ".issued": issued,
    ".expires": expires,
  } = body as SiaTokenApiResponse;

  if (typeof access_token !== "string" || typeof token_type !== "string") {
    throw new SiaServiceError("La respuesta de SIA no contiene los datos esperados.", 500, body);
  }

  const parsedExpiresIn = (() => {
    if (typeof expires_in === "number" && Number.isFinite(expires_in)) {
      return expires_in;
    }

    if (typeof expires_in === "string") {
      const value = Number.parseInt(expires_in, 10);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  })();

  if (parsedExpiresIn === null) {
    throw new SiaServiceError("La respuesta de SIA tiene un tiempo de expiración inválido.", 500, body);
  }

  return {
    access_token,
    token_type,
    expires_in: parsedExpiresIn,
    uid: typeof uid === "string" ? uid : undefined,
    ulogin: typeof ulogin === "string" ? ulogin : undefined,
    consumerKey: typeof consumerKey === "string" ? consumerKey : undefined,
    dz: typeof dz === "string" ? dz : undefined,
    ".issued": typeof issued === "string" ? issued : undefined,
    ".expires": typeof expires === "string" ? expires : undefined,
  };
};

export const requestSiaToken = async (): Promise<SiaTokenResponse> => {
  const { username, password, dz } = getSiaConfig();

  let response: Response;
  try {
    response = await fetch(SIA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username,
        password,
        DZ: dz,
      }).toString(),
    });
  } catch (error) {
    throw new SiaServiceError("No se pudo conectar con el servicio de SIA.", 502, error);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new SiaServiceError("La respuesta de SIA no es un JSON válido.", response.status || 500, error);
  }

  if (!response.ok) {
    const message =
      (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) ||
      "No se pudo obtener el token de SIA.";
    throw new SiaServiceError(message, response.status || 500, payload);
  }

  return parseSiaResponse(payload);
};

