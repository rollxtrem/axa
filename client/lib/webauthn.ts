import type {
  WebAuthnAuthenticatorTransport,
  WebAuthnCredentialRequestJSON,
  WebAuthnLoginStartResponse,
  WebAuthnPublicKeyCredentialRequestOptionsJSON,
} from "@shared/api";

const KNOWN_AUTHENTICATOR_TRANSPORTS: readonly AuthenticatorTransport[] = [
  "usb",
  "nfc",
  "ble",
  "internal",
];

const normalizeAuthenticatorTransports = (
  transports?: WebAuthnAuthenticatorTransport[]
): AuthenticatorTransport[] | undefined => {
  if (!transports || transports.length === 0) {
    return undefined;
  }

  const allowed = new Set<AuthenticatorTransport>(
    KNOWN_AUTHENTICATOR_TRANSPORTS
  );
  const normalized: AuthenticatorTransport[] = [];

  transports.forEach((transport) => {
    const candidate = transport as AuthenticatorTransport;
    if (allowed.has(candidate)) {
      normalized.push(candidate);
    }
  });

  return normalized.length > 0 ? normalized : undefined;
};

const base64UrlToArrayBuffer = (value: string): ArrayBuffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized.length % 4 === 0
      ? normalized
      : `${normalized}${"=".repeat(4 - (normalized.length % 4))}`;
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);

  for (let idx = 0; idx < binary.length; idx += 1) {
    output[idx] = binary.charCodeAt(idx);
  }

  return output.buffer;
};

const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let idx = 0; idx < bytes.byteLength; idx += 1) {
    binary += String.fromCharCode(bytes[idx]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const convertRequestOptionsFromJSON = (
  options: WebAuthnPublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptions => ({
  challenge: base64UrlToArrayBuffer(options.challenge),
  allowCredentials: options.allowCredentials?.map((descriptor) => ({
    type: descriptor.type,
    id: base64UrlToArrayBuffer(descriptor.id),
    transports: normalizeAuthenticatorTransports(descriptor.transports),
  })),
  rpId: options.rpId,
  timeout: options.timeout,
  userVerification: options.userVerification,
  extensions: options.extensions,
});

export const credentialToJSON = (
  credential: PublicKeyCredential
): WebAuthnCredentialRequestJSON => {
  const assertionResponse = credential.response as AuthenticatorAssertionResponse;
  const clientExtensionResults =
    (credential.getClientExtensionResults?.() as Record<string, unknown>) ||
    {};

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type as "public-key",
    authenticatorAttachment: credential.authenticatorAttachment ?? null,
    clientExtensionResults,
    response: {
      authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
      clientDataJSON: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
      signature: arrayBufferToBase64Url(assertionResponse.signature),
      userHandle: assertionResponse.userHandle
        ? arrayBufferToBase64Url(assertionResponse.userHandle)
        : null,
    },
  };
};

export const isWebAuthnSupported = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.credentials !== "undefined";

export type WebAuthnLoginFlowData = WebAuthnLoginStartResponse & {
  publicKeyOptions: PublicKeyCredentialRequestOptions;
};

export const prepareWebAuthnLoginOptions = (
  response: WebAuthnLoginStartResponse
): WebAuthnLoginFlowData => ({
  ...response,
  publicKeyOptions: convertRequestOptionsFromJSON(response.options),
});
