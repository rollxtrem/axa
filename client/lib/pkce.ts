const PKCE_STORAGE_KEY = "auth0-pkce-state";

export type StoredPkceState = {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  rememberMe: boolean;
  createdAt: number;
};

const textEncoder = new TextEncoder();

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const generateRandomBytes = (length = 32) => {
  const array = new Uint8Array(length);
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    throw new Error("El navegador no soporta la generación segura de claves (Web Crypto).");
  }
  window.crypto.getRandomValues(array);
  return array.buffer;
};

const sha256 = async (value: string) => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("El navegador no soporta operaciones criptográficas necesarias para PKCE.");
  }

  const data = textEncoder.encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest).buffer;
};

const generateVerifier = () => toBase64Url(generateRandomBytes(32));

const generateState = () => toBase64Url(generateRandomBytes(16));

export const createPkceChallenge = async () => {
  const codeVerifier = generateVerifier();
  const codeChallengeBuffer = await sha256(codeVerifier);
  const codeChallenge = toBase64Url(codeChallengeBuffer);
  const state = generateState();

  return { codeVerifier, codeChallenge, state };
};

export const persistPkceState = (value: StoredPkceState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("No se pudo almacenar el estado PKCE", error);
  }
};

export const readPkceState = (): StoredPkceState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(PKCE_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredPkceState | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.redirectUri !== "string"
    ) {
      return null;
    }

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      redirectUri: parsed.redirectUri,
      rememberMe: Boolean(parsed.rememberMe),
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch (error) {
    console.warn("No se pudo leer el estado PKCE", error);
    window.sessionStorage.removeItem(PKCE_STORAGE_KEY);
    return null;
  }
};

export const clearPkceState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(PKCE_STORAGE_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar el estado PKCE", error);
  }
};
