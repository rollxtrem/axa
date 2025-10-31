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
  user_name: "John Doe",
  user_email: "john.doe@example.com",
  user_mobile: "+571234567890",
  form_date: "2025-01-02",
  form_hora: "14:45",
} as const;

const buildReplacements = (formCodeService: string) => ({
  ...baseReplacements,
  form_code_service: formCodeService,
});

const buildTenant = (host: string): TenantContext => ({
  host,
  id: host.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
});

const expectCommonTemplateValues = (
  payload: Awaited<ReturnType<typeof buildSiaFileAddPayloadFromTemplate>>,
  replacements: ReturnType<typeof buildReplacements>,
) => {
  expect(payload.dz).toBe(replacements.sia_dz);
  expect(payload.consumerKey).toBe(replacements.sia_consumer_key);
  expect(payload.policy).toBe(replacements.user_identification);
  expect(payload.name).toBe(replacements.user_name);
  expect(payload.email).toBe(replacements.user_email);
  expect(payload.mobile).toBe(replacements.user_mobile);
  expect(payload.scheduleDate).toBe(replacements.form_date);
  expect(payload.scheduleHour).toBe(replacements.form_hora);
};

describe("buildSiaFileAddPayloadFromTemplate", () => {
  beforeEach(() => {
    __resetSiaFileAddTemplateCacheForTesting();
  });

  it("uses the tenant-specific template when it exists", async () => {
    const tenant = buildTenant("demo.wdt.com");
    const replacements = buildReplacements("TF");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expectCommonTemplateValues(payload, replacements);
    expect(payload.idCatalogServices).toBe("TF");
    expect(payload.idCatalogClassification).toBe("ASF");
    expect(payload.idCatalogRequiredService).toBe("TF");
    expect(payload.reasonCalled).toBe("reasonCalled");
    expect(payload.comment).toBe("comment");
  });

  it("falls back to the default template when no tenant is provided", async () => {
    const replacements = buildReplacements("FT");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant: null,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expectCommonTemplateValues(payload, replacements);
    expect(payload.idCatalogServices).toBe("FT");
    expect(payload.idCatalogClassification).toBe("FT");
    expect(payload.idCatalogRequiredService).toBe("FT");
    expect(payload.reasonCalled).toBe("TELEFONICA reasonCalled");
    expect(payload.comment).toBe("TELEFONICA comment");
  });

  it("falls back to the default template when a tenant template is missing", async () => {
    const tenant = buildTenant("unknown.example.com");
    const replacements = buildReplacements("TF");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expectCommonTemplateValues(payload, replacements);
    expect(payload.idCatalogServices).toBe("TF");
    expect(payload.idCatalogClassification).toBe("ASF");
    expect(payload.idCatalogRequiredService).toBe("TF");
    expect(payload.reasonCalled).toBe("TELEFONICA reasonCalled");
    expect(payload.comment).toBe("TELEFONICA comment");
  });

  it("uses the global default template when the service-specific template is unavailable", async () => {
    const tenant = buildTenant("demo.wdt.com");
    const replacements = buildReplacements("UNKNOWN");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expectCommonTemplateValues(payload, replacements);
    expect(payload.idCatalogServices).toBe("{{form_code_service}}");
    expect(payload.idCatalogClassification).toBe("{{form_code_service}}");
    expect(payload.idCatalogRequiredService).toBe("{{form_code_service}}");
    expect(payload.reasonCalled).toBe("TELEFONICA reasonCalled");
    expect(payload.comment).toBe("TELEFONICA comment");
  });
});
