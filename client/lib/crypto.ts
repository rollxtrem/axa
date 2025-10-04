type PemKeyType = "PUBLIC KEY" | "RSA PUBLIC KEY";

const RSA_ALGORITHM_IDENTIFIER = new Uint8Array([
  0x30, 0x0d, // SEQUENCE length 0x0d
  0x06, 0x09, // OID length 0x09
  0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // 1.2.840.113549.1.1.1 (rsaEncryption)
  0x05, 0x00, // NULL
]);

const PEM_BOUNDARY_PATTERN = /-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/;

const isSupportedKeyType = (value: string): value is PemKeyType =>
  value === "PUBLIC KEY" || value === "RSA PUBLIC KEY";

const decodeBase64 = (input: string): Uint8Array => {
  const binaryString = globalThis.atob(input);
  const output = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    output[i] = binaryString.charCodeAt(i);
  }
  return output;
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
};

const encodeAsn1Length = (length: number): Uint8Array => {
  if (length < 0x80) {
    return new Uint8Array([length]);
  }

  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const wrapPkcs1InSpki = (pkcs1: Uint8Array): Uint8Array => {
  const bitStringLength = pkcs1.length + 1; // +1 for unused bits indicator
  const bitStringLengthBytes = encodeAsn1Length(bitStringLength);
  const bitString = new Uint8Array(1 + bitStringLengthBytes.length + bitStringLength);
  bitString[0] = 0x03; // BIT STRING tag
  bitString.set(bitStringLengthBytes, 1);
  bitString[1 + bitStringLengthBytes.length] = 0x00; // unused bits indicator
  bitString.set(pkcs1, 1 + bitStringLengthBytes.length + 1);

  const sequenceLength = RSA_ALGORITHM_IDENTIFIER.length + bitString.length;
  const sequenceLengthBytes = encodeAsn1Length(sequenceLength);
  const spki = new Uint8Array(1 + sequenceLengthBytes.length + sequenceLength);
  spki[0] = 0x30; // SEQUENCE tag
  spki.set(sequenceLengthBytes, 1);
  spki.set(RSA_ALGORITHM_IDENTIFIER, 1 + sequenceLengthBytes.length);
  spki.set(bitString, 1 + sequenceLengthBytes.length + RSA_ALGORITHM_IDENTIFIER.length);

  return spki;
};

export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const trimmed = pem.trim();
  const match = trimmed.match(PEM_BOUNDARY_PATTERN);
  if (!match) {
    if (trimmed.includes("-----BEGIN") || trimmed.includes("-----END")) {
      throw new Error("Invalid PEM format");
    }
    const sanitized = trimmed.replace(/\s+/g, "");
    if (!sanitized) {
      throw new Error("Invalid PEM format");
    }
    return toArrayBuffer(decodeBase64(sanitized));
  }

  const [, rawType, body] = match;
  const type = rawType.trim();
  if (!isSupportedKeyType(type)) {
    throw new Error(`Unsupported PEM key type: ${type}`);
  }

  const decoded = decodeBase64(body.replace(/\s+/g, ""));

  if (type === "RSA PUBLIC KEY") {
    const spki = wrapPkcs1InSpki(decoded);
    return toArrayBuffer(spki);
  }

  return toArrayBuffer(decoded);
}

export async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );
}

export function stringToArrayBuffer(input: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(input).buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

export interface EncryptedJsonPayload {
  ciphertext: string;
  encryptedKey: string;
  iv: string;
}

const uint8ArrayToBase64 = (value: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < value.byteLength; i += 1) {
    binary += String.fromCharCode(value[i]);
  }
  return globalThis.btoa(binary);
};

export async function encryptJsonWithPublicKey(
  key: CryptoKey,
  payload: unknown,
): Promise<EncryptedJsonPayload> {
  const json = JSON.stringify(payload);
  const dataBuffer = stringToArrayBuffer(json);

  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    dataBuffer,
  );

  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    rawAesKey,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    iv: uint8ArrayToBase64(iv),
  };
}
