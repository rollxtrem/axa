import type { TenantContext } from "../utils/tenant-env";

declare module "express-serve-static-core" {
  interface Request {
    tenantContext?: TenantContext | null;
  }
}

