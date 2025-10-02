const DEFAULT_BUILDER_PUBLIC_KEY = "251da8f29625434a8c872a9913dedea9";

function normalizeEnvValue(rawValue: unknown): string | undefined {
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const builderPublicKey = normalizeEnvValue(
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_PUBLIC_BUILDER_KEY : undefined,
) ?? DEFAULT_BUILDER_PUBLIC_KEY;

export const encodedBuilderPublicKey = encodeURIComponent(builderPublicKey);
