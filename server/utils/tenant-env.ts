import type { Request } from "express";

export type TenantContext = {
  id: string;
  host: string;
};

const TENANT_CONTEXT_SYMBOL = Symbol.for("axa.tenantContext");

const sanitizeTenantId = (value: string): string | null => {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || null;
};

const extractHost = (req: Request): string | null => {
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader;

  const rawHost = forwardedHost || req.headers.host || req.hostname;
  if (!rawHost) {
    return null;
  }

  const host = rawHost.split(",")[0]?.trim();
  if (!host) {
    return null;
  }

  return host.replace(/:\d+$/, "").toLowerCase();
};

const storeTenantContext = (req: Request, context: TenantContext | null) => {
  (req as typeof req & {
    [TENANT_CONTEXT_SYMBOL]?: TenantContext | null;
    tenantContext?: TenantContext | null;
  })[TENANT_CONTEXT_SYMBOL] = context;

  (req as typeof req & { tenantContext?: TenantContext | null }).tenantContext = context;
};

const readTenantContext = (req: Request): TenantContext | null | undefined =>
  (req as typeof req & { [TENANT_CONTEXT_SYMBOL]?: TenantContext | null })[
    TENANT_CONTEXT_SYMBOL
  ];

export const getTenantContext = (req: Request): TenantContext | null => {
  const cached = readTenantContext(req);
  if (cached !== undefined) {
    return cached;
  }

  const host = extractHost(req);
  if (!host) {
    storeTenantContext(req, null);
    return null;
  }

  const id = sanitizeTenantId(host);
  if (!id) {
    storeTenantContext(req, null);
    return null;
  }

  const context: TenantContext = { host, id };
  storeTenantContext(req, context);
  return context;
};

const resolveTenantId = (tenant?: TenantContext | null): string | null =>
  tenant?.id ?? null;

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveTenantEnv = (
  key: string,
  tenant?: TenantContext | null,
): string | undefined => {
  const tenantId = resolveTenantId(tenant);
  if (tenantId) {
    const tenantKey = `${key}__${tenantId}`;
    const tenantValue = normalizeEnvValue(process.env[tenantKey]);
    if (tenantValue !== undefined) {
      return tenantValue;
    }
  }

  return normalizeEnvValue(process.env[key]);
};

