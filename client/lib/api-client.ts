const normalizePath = (path: string) => {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const sanitizeUrlValue = (value: string) => value.replace(/\s+/g, "").replace(/\/+$/, "");

const KNOWN_ERROR_TRANSLATIONS = new Map<string, string>([
  ["PQRS public key is not configured", "El servidor no tiene configurada la llave pública de PQRS (PQRS_PUBLIC_KEY)."],
  ["PQRS private key is not configured", "El servidor no tiene configurada la llave privada de PQRS (PQRS_PRIVATE_KEY)."],
  ["PQRS_EMAIL_TO is not configured", "Debes definir PQRS_EMAIL_TO con los destinatarios del correo de notificación de PQRS."],
  [
    "FORMACION public key is not configured",
    "El servidor no tiene configurada la llave pública de Formación (FORMACION_PUBLIC_KEY).",
  ],
  [
    "FORMACION private key is not configured",
    "El servidor no tiene configurada la llave privada de Formación (FORMACION_PRIVATE_KEY).",
  ],
  [
    "FORMACION_EMAIL_TO is not configured",
    "Debes definir FORMACION_EMAIL_TO con los destinatarios del correo de formación.",
  ],
  [
    "BIENESTAR public key is not configured",
    "El servidor no tiene configurada la llave pública de Bienestar (BIENESTAR_PUBLIC_KEY).",
  ],
  [
    "BIENESTAR private key is not configured",
    "El servidor no tiene configurada la llave privada de Bienestar (BIENESTAR_PRIVATE_KEY).",
  ],
  [
    "BIENESTAR_EMAIL_TO is not configured",
    "Debes definir BIENESTAR_EMAIL_TO con los destinatarios del correo de bienestar.",
  ],
  [
    "Failed to send PQRS notification",
    "No fue posible enviar la notificación de PQRS. Verifica la configuración del servicio de correo.",
  ],
  [
    "Failed to send formación notification",
    "No fue posible enviar la notificación de Formación. Verifica la configuración del servicio de correo.",
  ],
  [
    "Failed to send bienestar notification",
    "No fue posible enviar la notificación de Bienestar. Verifica la configuración del servicio de correo.",
  ],
]);

const extractErrorMessageFromBody = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return null;
  }

  if ("error" in body && typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error.trim();
  }

  if ("message" in body && typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message.trim();
  }

  if ("errors" in body) {
    const errors = body.errors;
    if (Array.isArray(errors)) {
      const messages = errors.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    } else if (errors && typeof errors === "object") {
      const messages = Object.values(errors)
        .flat()
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
  }

  return null;
};

export const translateApiErrorMessage = (message: unknown, fallback: string): string => {
  if (typeof message !== "string") {
    return fallback;
  }

  const normalized = message.trim();

  if (!normalized) {
    return fallback;
  }

  const directTranslation = KNOWN_ERROR_TRANSLATIONS.get(normalized);
  if (directTranslation) {
    return directTranslation;
  }

  if (/ is not configured\.?$/i.test(normalized)) {
    const missingValue = normalized.replace(/ is not configured\.?$/i, "").trim();
    if (missingValue.length > 0) {
      return `${fallback} (Falta configurar ${missingValue} en el servidor.)`;
    }
  }

  return `${fallback} (Detalle: ${normalized})`;
};

export const formatApiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const normalized = error.message.trim();

  if (!normalized) {
    return fallback;
  }

  if (KNOWN_ERROR_TRANSLATIONS.has(normalized) || / is not configured\.?$/i.test(normalized)) {
    return translateApiErrorMessage(normalized, fallback);
  }

  return normalized;
};

export const readJsonResponse = async <T,>(
  response: Response
): Promise<{ data: T | null; errorMessage: string | null }> => {
  let parsed: unknown = null;

  try {
    parsed = await response.json();
  } catch (error) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      console.warn("No se pudo interpretar la respuesta JSON del API.", error);
    }
    return { data: null, errorMessage: null };
  }

  return {
    data: (parsed as T) ?? null,
    errorMessage: extractErrorMessageFromBody(parsed),
  };
};

const readApiBaseUrl = () => {
  let rawValue: string | undefined;

  try {
    rawValue = import.meta.env?.VITE_API_BASE_URL;
  } catch (_error) {
    rawValue = undefined;
  }

  if (!rawValue) {
    return "";
  }

  const trimmedValue = sanitizeUrlValue(rawValue);

  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(trimmedValue);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    console.warn(
      "El valor de VITE_API_BASE_URL no es una URL válida. Se utilizará el mismo host de la aplicación.",
      error
    );
    return "";
  }
};

const API_BASE_URL = readApiBaseUrl();

export const createApiUrl = (path: string) => {
  const normalizedPath = normalizePath(path);

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  try {
    return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
  } catch (error) {
    console.warn(
      `No se pudo construir la URL final para la ruta ${normalizedPath}. Se usará la ruta relativa.`,
      error
    );
    return normalizedPath;
  }
};

export const apiFetch: typeof fetch = (input, init) => {
  if (typeof input === "string") {
    return fetch(createApiUrl(input), init);
  }

  return fetch(input, init);
};

export type ParsedApiError = ReturnType<typeof extractErrorMessageFromBody>;
