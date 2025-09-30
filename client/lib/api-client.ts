const normalizePath = (path: string) => {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const sanitizeUrlValue = (value: string) => value.replace(/\s+/g, "").replace(/\/+$/, "");

const readApiBaseUrl = () => {
  let rawValue: string | undefined;

  try {
    rawValue = import.meta.env?.VITE_API_BASE_URL;
  } catch (_error) {
    rawValue = undefined;
  }

  if (!rawValue) {
    return "";
  }

  const trimmedValue = sanitizeUrlValue(rawValue);

  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(trimmedValue);
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    console.warn(
      "El valor de VITE_API_BASE_URL no es una URL válida. Se utilizará el mismo host de la aplicación.",
      error
    );
    return "";
  }
};

const API_BASE_URL = readApiBaseUrl();

export const createApiUrl = (path: string) => {
  const normalizedPath = normalizePath(path);

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  try {
    return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
  } catch (error) {
    console.warn(
      `No se pudo construir la URL final para la ruta ${normalizedPath}. Se usará la ruta relativa.`,
      error
    );
    return normalizedPath;
  }
};

export const apiFetch: typeof fetch = (input, init) => {
  if (typeof input === "string") {
    return fetch(createApiUrl(input), init);
  }

  return fetch(input, init);
};
