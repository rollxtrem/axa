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

const applyReplacements = (value: unknown, replacements: ReplacementMap): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => applyReplacements(item, replacements));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, applyReplacements(val, replacements)]),
    );
  }

  if (typeof value === "string") {
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

const loadTemplate = async (tenant?: TenantContext | null): Promise<SiaFileAddPayload> => {
  const tenantFilename = tenant?.id ? `file-add.${tenant.id}.json` : null;
  const filenames = tenantFilename
    ? [tenantFilename, DEFAULT_TEMPLATE_FILENAME]
    : [DEFAULT_TEMPLATE_FILENAME];

  for (const filename of filenames) {
    const cached = templateCache.get(filename);
    if (cached) {
      return cloneTemplate(cached);
    }

    const template = await readTemplateFile(filename);
    if (template) {
      return cloneTemplate(template);
    }
  }

  throw new Error("No se encontró ninguna plantilla de FileAdd para SIA.");
};

interface BuildTemplatePayloadOptions {
  tenant?: TenantContext | null;
  replacements: ReplacementMap;
}

export const buildSiaFileAddPayloadFromTemplate = async (
  options: BuildTemplatePayloadOptions,
): Promise<SiaFileAddPayload> => {
  const template = await loadTemplate(options.tenant);
  return applyReplacements(template as unknown, options.replacements) as SiaFileAddPayload;
};

export const __resetSiaFileAddTemplateCacheForTesting = () => {
  templateCache.clear();
};
