import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SiaFileAddPayload } from "@shared/api";

import type { TenantContext } from "../utils/tenant-env";

import defaultTemplateData from "./file-add.default.json" with { type: "json" };

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDirname = path.dirname(moduleFilename);
const templatesDir = moduleDirname;

const templateDirectories = Array.from(
  new Set([
    templatesDir,
    path.join(templatesDir, "sia"),
    path.resolve(process.cwd(), "server", "sia"),
    path.resolve(process.cwd(), "server", "plantillas"),
    path.resolve(process.cwd(), "dist", "server", "sia"),
    path.resolve(process.cwd(), "dist", "plantillas"),
  ]),
);

const builtInDefaultTemplate = defaultTemplateData as SiaFileAddPayload;

const DEFAULT_TEMPLATE_FILENAME = "file-add.default.json";

const templateCache = new Map<string, SiaFileAddPayload>();

const PLACEHOLDER_PATTERN = /^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/;

type ReplacementMap = Record<string, string>;

const cloneTemplate = (template: SiaFileAddPayload): SiaFileAddPayload =>
  JSON.parse(JSON.stringify(template));

const SKIP_REPLACEMENT_KEYS = new Set([
  "idCatalogServices",
  "idCatalogClassification",
  "idCatalogRequiredService",
]);

const applyReplacements = (
  value: unknown,
  replacements: ReplacementMap,
  currentKey?: string,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => applyReplacements(item, replacements));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, applyReplacements(val, replacements, key)]),
    );
  }

  if (typeof value === "string") {
    if (currentKey && SKIP_REPLACEMENT_KEYS.has(currentKey)) {
      return value;
    }

    const match = PLACEHOLDER_PATTERN.exec(value);
    if (!match) {
      return value;
    }

    const replacementKey = match[1];
    const replacementValue = replacements[replacementKey];
    return replacementValue ?? "";
  }

  return value;
};

const readTemplateFile = async (filename: string): Promise<SiaFileAddPayload | null> => {
  for (const directory of templateDirectories) {
    const filePath = path.join(directory, filename);

    try {
      const fileContents = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(fileContents) as SiaFileAddPayload;
      templateCache.set(filename, parsed);
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  if (filename === DEFAULT_TEMPLATE_FILENAME) {
    templateCache.set(filename, builtInDefaultTemplate);
    return builtInDefaultTemplate;
  }

  return null;
};

const sanitizeTemplateKey = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
};

type LoadedTemplate = {
  filename: string;
  template: SiaFileAddPayload;
};

const loadTemplate = async (
  tenant?: TenantContext | null,
  formCodeService?: string | null,
): Promise<LoadedTemplate> => {
  const tenantKey = sanitizeTemplateKey(tenant?.id ?? null);
  const serviceKey = sanitizeTemplateKey(formCodeService ?? null);

  const specificTemplateFilename =
    serviceKey && tenantKey ? `file-add.${serviceKey}.${tenantKey}.json` : null;
  const serviceFallbackFilename = serviceKey ? `file-add.${serviceKey}.default.json` : null;

  const tryLoadTemplate = async (filename: string): Promise<SiaFileAddPayload | null> => {
    const cached = templateCache.get(filename);
    if (cached) {
      return cloneTemplate(cached);
    }

    const template = await readTemplateFile(filename);
    if (template) {
      return cloneTemplate(template);
    }

    return null;
  };

  if (specificTemplateFilename) {
    const template = await tryLoadTemplate(specificTemplateFilename);
    if (template) {
      return { filename: specificTemplateFilename, template };
    }
  }

  if (serviceFallbackFilename) {
    const template = await tryLoadTemplate(serviceFallbackFilename);
    if (template) {
      return { filename: serviceFallbackFilename, template };
    }
  }

  if (specificTemplateFilename && serviceFallbackFilename) {
    console.error(`No existe la plantilla ${specificTemplateFilename}`);
  }

  const defaultTemplate = await tryLoadTemplate(DEFAULT_TEMPLATE_FILENAME);
  if (defaultTemplate) {
    return { filename: DEFAULT_TEMPLATE_FILENAME, template: defaultTemplate };
  }

  throw new Error("No se encontró ninguna plantilla de FileAdd para SIA.");
};

interface BuildTemplatePayloadOptions {
  tenant?: TenantContext | null;
  replacements: ReplacementMap;
  formCodeService?: string | null;
}

export interface SiaFileAddTemplateMetadata {
  payload: SiaFileAddPayload;
  templateFilename: string;
}

export const buildSiaFileAddPayloadWithMetadata = async (
  options: BuildTemplatePayloadOptions,
): Promise<SiaFileAddTemplateMetadata> => {
  const { filename, template } = await loadTemplate(options.tenant, options.formCodeService);
  const payload = applyReplacements(template as unknown, options.replacements) as SiaFileAddPayload;
  return { payload, templateFilename: filename };
};

export const buildSiaFileAddPayloadFromTemplate = async (
  options: BuildTemplatePayloadOptions,
): Promise<SiaFileAddPayload> => {
  const { payload } = await buildSiaFileAddPayloadWithMetadata(options);
  return payload;
};

export const __resetSiaFileAddTemplateCacheForTesting = () => {
  templateCache.clear();
};
