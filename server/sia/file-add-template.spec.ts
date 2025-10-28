import { beforeEach, describe, expect, it } from "vitest";

import type { TenantContext } from "../utils/tenant-env";
import {
  __resetSiaFileAddTemplateCacheForTesting,
  buildSiaFileAddPayloadFromTemplate,
} from "./file-add-template";

const baseReplacements = {
  sia_dz: "DZ_VALUE",
  sia_consumer_key: "CONSUMER_KEY",
  user_identification: "123456789",
  form_code_service: "SERVICE_CODE",
  user_name: "John Doe",
  user_email: "john.doe@example.com",
  user_mobile: "+571234567890",
  form_date: "2025-01-02",
  form_hora: "14:45",
};

const buildTenant = (host: string): TenantContext => ({
  host,
  id: host.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
});

const expectCommonTemplateValues = (payload: Awaited<ReturnType<typeof buildSiaFileAddPayloadFromTemplate>>) => {
  expect(payload.dz).toBe(baseReplacements.sia_dz);
  expect(payload.consumerKey).toBe(baseReplacements.sia_consumer_key);
  expect(payload.policy).toBe(baseReplacements.user_identification);
  expect(payload.idCatalogServices).toBe(baseReplacements.form_code_service);
  expect(payload.name).toBe(baseReplacements.user_name);
  expect(payload.email).toBe(baseReplacements.user_email);
  expect(payload.mobile).toBe(baseReplacements.user_mobile);
  expect(payload.scheduleDate).toBe(baseReplacements.form_date);
  expect(payload.scheduleHour).toBe(baseReplacements.form_hora);
};

describe("buildSiaFileAddPayloadFromTemplate", () => {
  beforeEach(() => {
    __resetSiaFileAddTemplateCacheForTesting();
  });

  it("uses the tenant-specific template when it exists", async () => {
    const tenant = buildTenant("demo.wdt.com");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      replacements: baseReplacements,
    });

    expectCommonTemplateValues(payload);
    expect(payload.reasonCalled).toBe("reasonCalled");
    expect(payload.comment).toBe("comment");
  });

  it("falls back to the default template when no tenant is provided", async () => {
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant: null,
      replacements: baseReplacements,
    });

    expectCommonTemplateValues(payload);
    expect(payload.reasonCalled).toBe("TELEFONICA reasonCalled");
    expect(payload.comment).toBe("TELEFONICA comment");
  });

  it("falls back to the default template when a tenant template is missing", async () => {
    const tenant = buildTenant("unknown.example.com");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      replacements: baseReplacements,
    });

    expectCommonTemplateValues(payload);
    expect(payload.reasonCalled).toBe("TELEFONICA reasonCalled");
    expect(payload.comment).toBe("TELEFONICA comment");
  });
});
