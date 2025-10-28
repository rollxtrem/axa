import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { TenantContext } from "./tenant-env";
import { resolveTenantEnv } from "./tenant-env";

const ORIGINAL_ENV = { ...process.env };

const mockTenant: TenantContext = {
  id: "SIA8_MIDOMINIO_COM",
  host: "sia8.midominio.com",
};

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SIA_USERNAME__SIA8_MIDOMINIO_COM;
  delete process.env.SIA_USERNAME;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("resolveTenantEnv", () => {
  it("returns tenant-specific values when configured", () => {
    process.env.SIA_USERNAME__SIA8_MIDOMINIO_COM = "tenant-user";
    process.env.SIA_USERNAME = "default-user";

    expect(resolveTenantEnv("SIA_USERNAME", mockTenant)).toBe("tenant-user");
  });

  it("falls back to default values when tenant-specific variable is missing", () => {
    process.env.SIA_USERNAME = "default-user";

    expect(resolveTenantEnv("SIA_USERNAME", mockTenant)).toBe("default-user");
  });

  it("falls back to default values when tenant-specific variable is empty", () => {
    process.env.SIA_USERNAME__SIA8_MIDOMINIO_COM = "   \t\n  ";
    process.env.SIA_USERNAME = "default-user";

    expect(resolveTenantEnv("SIA_USERNAME", mockTenant)).toBe("default-user");
  });

  it("returns undefined when neither tenant-specific nor default variables are set", () => {
    expect(resolveTenantEnv("SIA_USERNAME", mockTenant)).toBeUndefined();
  });
});
