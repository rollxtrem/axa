import { apiFetch, readJsonResponse } from "@/lib/api-client";

import type { Auth0ClientConfigResponse } from "@shared/api";

type Auth0ClientConfig = {
  domain?: string;
  clientId?: string;
  audience?: string;
  redirectUri?: string;
};

const readEnvValue = (key: string): string | undefined => {
  try {
    const rawEnv = import.meta.env as Record<string, string | undefined> | undefined;
    const rawValue = rawEnv?.[key];
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
  } catch (_error) {
    // Ignorado: entornos sin soporte para import.meta
  }

  return undefined;
};

const sanitizeResponseValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeDomain = (domain: string): string =>
  domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");

const sanitizeRedirectUri = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    const sanitizedPath = url.pathname.replace(/\/+$/, "");
    const sanitizedSearch = url.search?.trim() ?? "";
    return `${url.origin}${sanitizedPath}${sanitizedSearch}`;
  } catch (_error) {
    return undefined;
  }
};

const domain = readEnvValue("AUTH0_DOMAIN");
const clientId = readEnvValue("AUTH0_CLIENT_ID");
const audienceFromEnv = readEnvValue("AUTH0_AUDIENCE");
const redirectUriFromEnv =
  readEnvValue("AUTH0_REDIRECT_URI");

const computedAudience = domain ? `https://${normalizeDomain(domain)}/api/v2/` : undefined;

const staticConfig: Auth0ClientConfig = {
  domain: domain ? normalizeDomain(domain) : undefined,
  clientId,
  audience: audienceFromEnv ?? computedAudience,
  redirectUri: sanitizeRedirectUri(redirectUriFromEnv),
};

let runtimeConfig: Auth0ClientConfig | null = null;
let loadPromise: Promise<Auth0ClientConfig> | null = null;

const mergeConfig = (overrides?: Auth0ClientConfig | null): Auth0ClientConfig => ({
  domain: overrides?.domain ?? staticConfig.domain,
  clientId: overrides?.clientId ?? staticConfig.clientId,
  audience: overrides?.audience ?? staticConfig.audience,
  redirectUri: overrides?.redirectUri ?? staticConfig.redirectUri,
});

export const getAuth0ClientConfig = (): Auth0ClientConfig => mergeConfig(runtimeConfig);

export const hasValidAuth0ClientConfig = (
  config: Auth0ClientConfig = getAuth0ClientConfig()
): config is Required<Pick<Auth0ClientConfig, "domain" | "clientId">> & {
  audience?: string;
  redirectUri?: string;
} =>
  typeof config.domain === "string" &&
  config.domain.length > 0 &&
  typeof config.clientId === "string" &&
  config.clientId.length > 0;

export const loadAuth0ClientConfig = async (): Promise<Auth0ClientConfig> => {
  if (runtimeConfig) {
    return getAuth0ClientConfig();
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const response = await apiFetch("/api/auth/config");
        if (!response.ok) {
          throw new Error(
            `No se pudo obtener la configuración de Auth0 (estado ${response.status}).`
          );
        }

        const { data } = await readJsonResponse<Auth0ClientConfigResponse>(response);
        if (!data) {
          throw new Error("La respuesta del servidor no contiene configuración de Auth0.");
        }

        runtimeConfig = {
          domain: sanitizeResponseValue(data.domain),
          clientId: sanitizeResponseValue(data.clientId),
          audience: sanitizeResponseValue(data.audience),
          redirectUri: sanitizeRedirectUri(data.redirectUri),
        };

        return getAuth0ClientConfig();
      } catch (error) {
        console.error(
          "No se pudo cargar la configuración de Auth0 desde el servidor. Se utilizará la configuración por defecto si está disponible.",
          error
        );
        runtimeConfig = null;
        throw error;
      } finally {
        loadPromise = null;
      }
    })();
  }

  return loadPromise;
};

export const clearAuth0ClientConfigCache = () => {
  runtimeConfig = null;
  loadPromise = null;
};

export type { Auth0ClientConfig };
