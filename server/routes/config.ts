import type { Request, RequestHandler } from "express";

import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";

import type { AppConfigResponse, Auth0ClientConfigResponse } from "@shared/api";

const normalizeAppName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAuth0Domain = (value?: string | null): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^https?:\/\//i, "").replace(/\/$/, "");
};

const normalizeRedirectUri = (value?: string | null): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    const sanitizedPath = url.pathname.replace(/\/+$/, "");
    const sanitizedSearch = url.search?.trim() ?? "";
    return `${url.origin}${sanitizedPath}${sanitizedSearch}`;
  } catch (_error) {
    return null;
  }
};

const readHeaderValue = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    const candidate = value.find((item) => item && item.trim().length > 0);
    return candidate ? candidate.split(",")[0]?.trim() ?? null : null;
  }

  if (typeof value === "string") {
    const [first] = value.split(",");
    const trimmed = first?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  return null;
};

const inferRedirectUriFromRequest = (req: Request): string | null => {
  const forwardedProto = readHeaderValue(req.headers["x-forwarded-proto"]);
  const forwardedHost = readHeaderValue(req.headers["x-forwarded-host"]);
  const headerHost = readHeaderValue(req.headers.host);

  const host = forwardedHost ?? headerHost ?? req.hostname ?? null;
  if (!host) {
    return null;
  }

  const protocolCandidate = forwardedProto ?? req.protocol ?? "";
  const protocol = protocolCandidate.replace(/:.*/, "").trim().toLowerCase() || "http";

  try {
    const url = new URL(`${protocol}://${host.replace(/\/+$/, "")}/callback`);
    const sanitizedPath = url.pathname.replace(/\/+$/, "");
    const sanitizedSearch = url.search?.trim() ?? "";
    return `${url.origin}${sanitizedPath}${sanitizedSearch}`;
  } catch (_error) {
    return null;
  }
};

export const handleGetAppConfig: RequestHandler = (req, res) => {
  const tenant = getTenantContext(req);
  const appName = normalizeAppName(resolveTenantEnv("NOMBRE_APP", tenant));

  const payload: AppConfigResponse = {
    appName,
  };

  res.json(payload);
};

export const handleGetAuth0ClientConfig: RequestHandler = (req, res) => {
  const tenant = getTenantContext(req);
  const domain = normalizeAuth0Domain(resolveTenantEnv("AUTH0_DOMAIN", tenant));
  const clientId = normalizeOptionalString(resolveTenantEnv("AUTH0_CLIENT_ID", tenant));
  const audience = normalizeOptionalString(resolveTenantEnv("AUTH0_AUDIENCE", tenant));
  const configuredRedirect = normalizeRedirectUri(
    resolveTenantEnv("AUTH0_REDIRECT_URI", tenant)
  );

  let redirectUri = configuredRedirect;
  let redirectSource: "configured" | "inferred" | "missing" = "missing";

  if (redirectUri) {
    redirectSource = "configured";
  } else {
    const inferredRedirect = inferRedirectUriFromRequest(req);
    redirectUri = normalizeRedirectUri(inferredRedirect) ?? null;
    redirectSource = redirectUri ? "inferred" : "missing";
  }

  const payload: Auth0ClientConfigResponse = {
    domain,
    clientId,
    audience: audience ?? (domain ? `https://${domain}/api/v2/` : null),
    redirectUri,
  };

  const tenantLabel = tenant
    ? `${tenant.id} (${tenant.host})`
    : "predeterminado";

  console.info(
    `[Auth0] Configuración de cliente resuelta para el tenant ${tenantLabel}:`,
    {
      domain: payload.domain ?? "No configurado",
      clientId: payload.clientId ?? "No configurado",
      audience: payload.audience ?? "No configurada",
      redirectUri:
        payload.redirectUri ??
        (redirectSource === "inferred"
          ? "Inferida automáticamente"
          : "No configurada"),
    },
  );

  res.json(payload);
};
