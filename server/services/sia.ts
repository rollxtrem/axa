import type { SiaTokenResponse } from "@shared/api";

const SIA_TOKEN_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/token";

type SiaTokenApiResponse = {
  sia_token?: unknown;
  sia_dz?: unknown;
  sia_consumer_key?: unknown;
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

  const { sia_token, sia_dz, sia_consumer_key } = body as SiaTokenApiResponse;

  if (
    typeof sia_token !== "string" ||
    typeof sia_dz !== "string" ||
    typeof sia_consumer_key !== "string"
  ) {
    throw new SiaServiceError("La respuesta de SIA no contiene los datos esperados.", 500, body);
  }

  return {
    sia_token,
    sia_dz,
    sia_consumer_key,
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

