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

const normalizeDomain = (domain: string) => domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

const domain = readEnvValue("AUTH0_DOMAIN");
const clientId = readEnvValue("AUTH0_CLIENT_ID");
const audienceFromEnv = readEnvValue("AUTH0_AUDIENCE");

const computedAudience = domain
  ? `https://${normalizeDomain(domain)}/api/v2/`
  : undefined;

export const auth0ClientConfig = {
  domain: domain ? normalizeDomain(domain) : undefined,
  clientId,
  audience: audienceFromEnv ?? computedAudience,
} as const;

export const isAuth0ClientConfigValid =
  typeof auth0ClientConfig.domain === "string" &&
  typeof auth0ClientConfig.clientId === "string";
