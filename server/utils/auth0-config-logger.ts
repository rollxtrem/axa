import type { TenantContext } from "./tenant-env";

type ConfigValue = {
  value: string | null;
  source: string | null;
  normalized?: string | null;
};

type Auth0ConfigSummary = {
  tenantId: string;
  isDefault: boolean;
  domain: ConfigValue;
  audience: ConfigValue;
  clientId: ConfigValue;
  clientSecret: ConfigValue;
  dbConnection: ConfigValue;
  missingKeys: string[];
};

const AUTH0_ENV_PREFIX = "AUTH0_";
const AUTH0_ENV_KEYS = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_AUDIENCE",
  "AUTH0_DB_CONNECTION",
] as const;

const formatEnvKey = (baseKey: string, tenant: TenantContext | null): string =>
  tenant ? `${baseKey}__${tenant.id}` : baseKey;

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeDomain = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
};

const extractTenantIdsFromEnv = (): string[] => {
  const tenantIds = new Set<string>();

  for (const key of Object.keys(process.env)) {
    if (!key.startsWith(AUTH0_ENV_PREFIX)) {
      continue;
    }

    const match = /__(?<tenant>[A-Z0-9_]+)$/.exec(key);
    if (match?.groups?.tenant) {
      tenantIds.add(match.groups.tenant);
    }
  }

  return Array.from(tenantIds).sort((a, b) => a.localeCompare(b));
};

const createTenantContext = (tenantId: string): TenantContext => ({
  id: tenantId,
  host: tenantId.toLowerCase(),
});

const resolveConfigValue = (
  key: (typeof AUTH0_ENV_KEYS)[number],
  tenant: TenantContext | null,
): ConfigValue => {
  if (tenant) {
    const tenantKey = formatEnvKey(key, tenant);
    const tenantValue = normalizeEnvValue(process.env[tenantKey]);

    if (tenantValue !== undefined) {
      return {
        value: tenantValue,
        source: tenantKey,
      };
    }
  }

  const value = normalizeEnvValue(process.env[key]);

  return {
    value: value ?? null,
    source: value !== undefined ? key : null,
  };
};

const maskSecret = (value: string | null): string => {
  if (!value) {
    return "No configurado";
  }

  if (value.length <= 4) {
    return `${value[0]}…${value[value.length - 1]} (${value.length} caracteres)`;
  }

  return `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} caracteres)`;
};

const hasAnyValue = (summary: Auth0ConfigSummary): boolean =>
  Boolean(
    summary.domain.value ||
      summary.audience.value ||
      summary.clientId.value ||
      summary.clientSecret.value ||
      summary.dbConnection.value,
  );

const buildSummary = (tenant: TenantContext | null): Auth0ConfigSummary => {
  const domain = resolveConfigValue("AUTH0_DOMAIN", tenant);
  domain.normalized = normalizeDomain(domain.value);

  const audience = resolveConfigValue("AUTH0_AUDIENCE", tenant);
  const clientId = resolveConfigValue("AUTH0_CLIENT_ID", tenant);
  const clientSecret = resolveConfigValue("AUTH0_CLIENT_SECRET", tenant);
  const dbConnection = resolveConfigValue("AUTH0_DB_CONNECTION", tenant);

  const missingKeys: string[] = [];

  if (!domain.normalized) {
    missingKeys.push(formatEnvKey("AUTH0_DOMAIN", tenant));
  }
  if (!clientId.value) {
    missingKeys.push(formatEnvKey("AUTH0_CLIENT_ID", tenant));
  }
  if (!clientSecret.value) {
    missingKeys.push(formatEnvKey("AUTH0_CLIENT_SECRET", tenant));
  }
  if (!dbConnection.value) {
    missingKeys.push(formatEnvKey("AUTH0_DB_CONNECTION", tenant));
  }

  return {
    tenantId: tenant ? tenant.id : "DEFAULT",
    isDefault: tenant === null,
    domain,
    audience,
    clientId,
    clientSecret,
    dbConnection,
    missingKeys,
  };
};

export const collectAuth0ConfigSummaries = (): Auth0ConfigSummary[] => {
  const tenantIds = extractTenantIdsFromEnv();
  const contexts: (TenantContext | null)[] = [null, ...tenantIds.map(createTenantContext)];

  return contexts
    .map((context) => buildSummary(context))
    .filter((summary, index) => summary.isDefault || hasAnyValue(summary) || index === 0);
};

export const logAuth0ConfigSummary = (): Auth0ConfigSummary[] => {
  const summaries = collectAuth0ConfigSummaries();

  if (summaries.length === 0) {
    console.info("🔐 No se encontraron variables de entorno relacionadas con Auth0.");
    return summaries;
  }

  console.info("🔐 Configuración de Auth0 detectada:");

  for (const summary of summaries) {
    const header = summary.isDefault
      ? "• Tenant predeterminado (sin sufijo)"
      : `• Tenant ${summary.tenantId}`;

    console.info(header);

    const formatLine = (label: string, value: ConfigValue, formatter?: (input: string | null) => string) => {
      const formattedValue = formatter ? formatter(value.value) : value.value ?? "No configurado";
      const source = value.source ? ` [${value.source}]` : "";
      console.info(`    - ${label}: ${formattedValue}${source}`);
    };

    formatLine("Dominio", summary.domain, () => summary.domain.normalized ?? "No configurado");
    formatLine("Audiencia", summary.audience);
    formatLine("Client ID", summary.clientId);
    formatLine("Client Secret", summary.clientSecret, maskSecret);
    formatLine("DB Connection", summary.dbConnection);

    if (summary.missingKeys.length > 0) {
      console.warn(
        `    ⚠️  Faltan variables obligatorias: ${summary.missingKeys.join(", ")}`,
      );
    }
  }

  return summaries;
};

export type { Auth0ConfigSummary };
