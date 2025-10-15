export const PROFILE_INFO_COOKIE_NAME = "info";
const ENCRYPTION_PASSPHRASE = "axa-profile-session-key";
const ENCRYPTION_SALT = "axa-profile-session-salt";

export type ProfileSessionData = {
  name: string;
  email: string;
  identification: string;
  mobile: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeBinaryToBase64 = (value: string) => {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  const bufferCtor = (globalThis as {
    Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } };
  }).Buffer;

  if (bufferCtor) {
    return bufferCtor.from(value, "binary").toString("base64");
  }

  throw new Error("El entorno no soporta la codificación base64 requerida.");
};

const decodeBase64ToBinary = (value: string) => {
  if (typeof atob === "function") {
    return atob(value);
  }

  const bufferCtor = (globalThis as {
    Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } };
  }).Buffer;

  if (bufferCtor) {
    return bufferCtor.from(value, "base64").toString("binary");
  }

  throw new Error("El entorno no soporta la decodificación base64 requerida.");
};

const toBase64 = (input: ArrayBuffer | Uint8Array) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return encodeBinaryToBase64(binary);
};

const fromBase64 = (value: string) => {
  const binary = decodeBase64ToBinary(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getCrypto = () => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("El navegador no soporta las funciones de cifrado requeridas.");
  }

  const cryptoApi = window.crypto.subtle;
  if (!cryptoApi) {
    throw new Error("El navegador no soporta las funciones de cifrado requeridas.");
  }
  return cryptoApi;
};

const deriveKey = async () => {
  const cryptoApi = getCrypto();
  const keyMaterial = await cryptoApi.importKey(
    "raw",
    textEncoder.encode(ENCRYPTION_PASSPHRASE),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoApi.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(ENCRYPTION_SALT),
      iterations: 150000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const parseProfilePayload = (payload: unknown): ProfileSessionData | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const fields: (keyof ProfileSessionData)[] = [
    "name",
    "email",
    "identification",
    "mobile",
  ];

  const result: Partial<ProfileSessionData> = {};

  for (const field of fields) {
    const value = (payload as Record<string, unknown>)[field];
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    result[field] = trimmed;
  }

  if (
    typeof result.name !== "string" ||
    typeof result.email !== "string" ||
    typeof result.identification !== "string" ||
    typeof result.mobile !== "string"
  ) {
    return null;
  }

  return result as ProfileSessionData;
};

export async function encryptProfileSessionData(
  values: ProfileSessionData,
): Promise<string> {
  const cryptoApi = getCrypto();
  const key = await deriveKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedPayload = textEncoder.encode(JSON.stringify(values));
  const encryptedBuffer = await cryptoApi.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedPayload,
  );

  const ivBase64 = toBase64(iv);
  const payloadBase64 = toBase64(encryptedBuffer);

  return `${ivBase64}.${payloadBase64}`;
}

export async function decryptProfileSessionData(
  value: string,
): Promise<ProfileSessionData> {
  const cryptoApi = getCrypto();
  const [ivSegment, payloadSegment] = value.split(".");
  if (!ivSegment || !payloadSegment) {
    throw new Error("La sesión del perfil es inválida.");
  }

  const iv = fromBase64(ivSegment);
  const payload = fromBase64(payloadSegment);
  const key = await deriveKey();
  const decrypted = await cryptoApi.decrypt(
    { name: "AES-GCM", iv },
    key,
    payload,
  );

  const decoded = textDecoder.decode(decrypted);
  const parsed = JSON.parse(decoded) as unknown;
  const profile = parseProfilePayload(parsed);

  if (!profile) {
    throw new Error("La información del perfil almacenada es inválida.");
  }

  return profile;
}

export const getProfileSessionCookie = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie?.split(";") ?? [];
  for (const rawCookie of cookies) {
    const [rawName, ...rest] = rawCookie.split("=");
    if (!rawName) {
      continue;
    }

    const name = rawName.trim();
    if (name !== PROFILE_INFO_COOKIE_NAME) {
      continue;
    }

    return decodeURIComponent(rest.join("=").trim());
  }

  return null;
};

export const setProfileSessionCookie = (value: string) => {
  if (typeof document === "undefined") {
    throw new Error("No se pudo acceder a la sesión del navegador.");
  }

  const secureSegment =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${PROFILE_INFO_COOKIE_NAME}=${encodeURIComponent(
    value,
  )}; Path=/; SameSite=Strict${secureSegment}`;
};

export const clearProfileSessionCookie = () => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${PROFILE_INFO_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
};

export const readProfileSessionData = async (): Promise<ProfileSessionData | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const cookieValue = getProfileSessionCookie();
  if (!cookieValue) {
    return null;
  }

  try {
    return await decryptProfileSessionData(cookieValue);
  } catch (error) {
    console.warn("No se pudo leer la información del perfil almacenada.", error);
    return null;
  }
};
