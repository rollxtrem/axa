import type { RequestHandler } from "express";

import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";

import type { AppConfigResponse } from "@shared/api";

const normalizeAppName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const handleGetAppConfig: RequestHandler = (req, res) => {
  const tenant = getTenantContext(req);
  const appName = normalizeAppName(resolveTenantEnv("NOMBRE_APP", tenant));

  const payload: AppConfigResponse = {
    appName,
  };

  res.json(payload);
};
