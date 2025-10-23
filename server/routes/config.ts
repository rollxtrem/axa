import type { RequestHandler } from "express";

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

  const payload: Auth0ClientConfigResponse = {
    domain,
    clientId,
    audience: audience ?? (domain ? `https://${domain}/api/v2/` : null),
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
    },
  );

  res.json(payload);
};
