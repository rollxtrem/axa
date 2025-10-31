import { beforeEach, describe, expect, it } from "vitest";

import type { SiaFileAddPayload } from "@shared/api";

import type { TenantContext } from "../utils/tenant-env";
import {
  __resetSiaFileAddTemplateCacheForTesting,
  buildSiaFileAddPayloadFromTemplate,
  buildSiaFileAddPayloadWithMetadata,
} from "./file-add-template";
import tenantDemoTemplate from "./file-add.TF.DEMO_WDT_COM.json" with { type: "json" };
import tenantFallbackTemplate from "./file-add.TF.default.json" with { type: "json" };
import serviceFallbackTemplate from "./file-add.FT.default.json" with { type: "json" };
import globalFallbackTemplate from "./file-add.default.json" with { type: "json" };

const TENANT_SPECIFIC_TEMPLATE = tenantDemoTemplate as SiaFileAddPayload;
const TENANT_FALLBACK_TEMPLATE = tenantFallbackTemplate as SiaFileAddPayload;
const SERVICE_FALLBACK_TEMPLATE = serviceFallbackTemplate as SiaFileAddPayload;
const GLOBAL_FALLBACK_TEMPLATE = globalFallbackTemplate as SiaFileAddPayload;

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

const resolveTemplateValue = (
  template: SiaFileAddPayload,
  key: keyof Pick<
    SiaFileAddPayload,
    | "idCatalogServices"
    | "idCatalogClassification"
    | "idCatalogRequiredService"
    | "reasonCalled"
    | "comment"
  >,
  replacements: ReturnType<typeof buildReplacements>,
) => {
  const rawValue = template[key];

  if (typeof rawValue !== "string") {
    return rawValue;
  }

  const skipReplacementKeys = new Set([
    "idCatalogServices",
    "idCatalogClassification",
    "idCatalogRequiredService",
  ] as const);

  if (skipReplacementKeys.has(key)) {
    return rawValue;
  }

  const match = rawValue.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
  if (!match) {
    return rawValue;
  }

  const replacementKey = match[1] as keyof typeof replacements;
  return replacements[replacementKey] ?? "";
};

const expectTemplateDrivenValues = (
  payload: Awaited<ReturnType<typeof buildSiaFileAddPayloadFromTemplate>>,
  template: SiaFileAddPayload,
  replacements: ReturnType<typeof buildReplacements>,
) => {
  expect(payload.idCatalogServices).toBe(
    resolveTemplateValue(template, "idCatalogServices", replacements),
  );
  expect(payload.idCatalogClassification).toBe(
    resolveTemplateValue(template, "idCatalogClassification", replacements),
  );
  expect(payload.idCatalogRequiredService).toBe(
    resolveTemplateValue(template, "idCatalogRequiredService", replacements),
  );
  expect(payload.reasonCalled).toBe(
    resolveTemplateValue(template, "reasonCalled", replacements),
  );
  expect(payload.comment).toBe(resolveTemplateValue(template, "comment", replacements));
};

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
    expectTemplateDrivenValues(payload, TENANT_SPECIFIC_TEMPLATE, replacements);
  });

  it("falls back to the default template when no tenant is provided", async () => {
    const replacements = buildReplacements("FT");
    const payload = await buildSiaFileAddPayloadFromTemplate({
      tenant: null,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expectCommonTemplateValues(payload, replacements);
    expectTemplateDrivenValues(payload, SERVICE_FALLBACK_TEMPLATE, replacements);
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
    expectTemplateDrivenValues(payload, TENANT_FALLBACK_TEMPLATE, replacements);
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
    expectTemplateDrivenValues(payload, GLOBAL_FALLBACK_TEMPLATE, replacements);
  });
});

describe("buildSiaFileAddPayloadWithMetadata", () => {
  beforeEach(() => {
    __resetSiaFileAddTemplateCacheForTesting();
  });

  it("returns the filename of the resolved template", async () => {
    const tenant = buildTenant("demo.wdt.com");
    const replacements = buildReplacements("TF");

    const { payload, templateFilename } = await buildSiaFileAddPayloadWithMetadata({
      tenant,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expect(templateFilename).toBe("file-add.TF.DEMO_WDT_COM.json");
    expectCommonTemplateValues(payload, replacements);
  });

  it("indicates when the global fallback template is used", async () => {
    const tenant = buildTenant("demo.wdt.com");
    const replacements = buildReplacements("UNKNOWN");

    const { payload, templateFilename } = await buildSiaFileAddPayloadWithMetadata({
      tenant,
      formCodeService: replacements.form_code_service,
      replacements,
    });

    expect(templateFilename).toBe("file-add.default.json");
    expectCommonTemplateValues(payload, replacements);
  });
});
