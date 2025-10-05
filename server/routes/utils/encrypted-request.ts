import { createDecipheriv, privateDecrypt } from "node:crypto";
import { z } from "zod";

import type { EncryptedSubmissionRequest } from "@shared/api";

export const encryptedRequestSchema = z.object({
  ciphertext: z.string().min(1, "Encrypted payload is required"),
  encryptedKey: z.string().min(1, "Encrypted key is required"),
  iv: z.string().min(1, "Initialization vector is required"),
});

const AUTH_TAG_LENGTH = 16;

export const normalizePem = (value: string): string => value.replace(/\\n/g, "\n");

export const decryptPayload = (
  payload: EncryptedSubmissionRequest,
  privateKey: string,
): string => {
  const aesKey = privateDecrypt(
    {
      key: normalizePem(privateKey),
      oaepHash: "sha256",
    },
    Buffer.from(payload.encryptedKey, "base64"),
  );

  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  if (ciphertext.length <= AUTH_TAG_LENGTH) {
    throw new Error("Ciphertext is too short");
  }

  const authTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
  const encrypted = ciphertext.subarray(0, ciphertext.length - AUTH_TAG_LENGTH);
  const iv = Buffer.from(payload.iv, "base64");

  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf-8");
};

export const formatRecipients = (value: string | undefined): string[] =>
  value
    ?.split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type EncryptedRequestSchema = typeof encryptedRequestSchema;

export type ParsedEncryptedRequest = z.infer<typeof encryptedRequestSchema>;
