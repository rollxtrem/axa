export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const binaryString = globalThis.atob(cleaned);
  const buffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  return buffer.buffer;
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

export async function encryptJsonWithPublicKey(key: CryptoKey, payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  const dataBuffer = stringToArrayBuffer(json);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    dataBuffer,
  );
  return arrayBufferToBase64(encrypted);
}
