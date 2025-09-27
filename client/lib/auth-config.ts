const normalizeFlagValue = (value?: string | boolean | null) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
};

const readAuthEnabledFlag = () => {
  let rawValue: string | boolean | null | undefined;

  try {
    rawValue = import.meta.env?.VITE_ENABLE_AUTH;
  } catch (_error) {
    rawValue = undefined;
  }

  const normalized = normalizeFlagValue(rawValue);

  if (typeof normalized === "boolean") {
    return normalized;
  }

  return false;
};

export const authConfig = {
  isAuthEnabled: readAuthEnabledFlag(),
} as const;
