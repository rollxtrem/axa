import { createPublicKey, createVerify } from "node:crypto";
import type { Request, RequestHandler } from "express";

import {
  AUTH0_MANAGEMENT_AUDIENCE_SUFFIX,
  Auth0ServiceError,
  getAuth0BaseConfig,
} from "../services/auth0";
import { getTenantContext } from "../utils/tenant-env";

const CLOCK_TOLERANCE_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

class TokenVerificationError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "TokenVerificationError";
    this.status = status;
  }
}

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
  [key: string]: unknown;
};

type JwtPayload = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  scope?: string;
  [key: string]: unknown;
};

type Jwk = JsonWebKey & { kid?: string; x5c?: string[] };

type JwksCache = {
  keys: Jwk[];
  expiresAt: number;
};

type VerifyOptions = {
  domain: string;
  audiences: string[];
};

type ParsedToken = {
  raw: string;
  header: JwtHeader;
  payload: JwtPayload;
};

export type VerifiedAccessToken = ParsedToken;

export interface AuthenticatedRequest extends Request {
  auth?: VerifiedAccessToken;
}

let jwksCache: JwksCache | null = null;

const base64UrlDecode = (value: string) => Buffer.from(value, "base64url");

const parseTokenParts = (token: string) => {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new TokenVerificationError("El token JWT no tiene el formato esperado.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const decodeJson = <T,>(value: string, context: string): T => {
    try {
      const json = base64UrlDecode(value).toString("utf8");
      return JSON.parse(json) as T;
    } catch (error) {
      console.warn(`No se pudo parsear la sección ${context} del token JWT`, error);
      throw new TokenVerificationError(
        `El token JWT tiene un ${context} inválido.`,
        401
      );
    }
  };

  const header = decodeJson<JwtHeader>(encodedHeader, "header");
  const payload = decodeJson<JwtPayload>(encodedPayload, "payload");

  return {
    encodedHeader,
    encodedPayload,
    encodedSignature,
    header,
    payload,
  };
};

const fetchJwks = async (domain: string, forceRefresh = false): Promise<Jwk[]> => {
  const now = Date.now();

  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const url = `https://${domain}/.well-known/jwks.json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new TokenVerificationError(
      "No se pudo obtener la lista de claves públicas del proveedor de autenticación.",
      500
    );
  }

  const data = (await response.json()) as { keys?: Jwk[] };

  if (!data || !Array.isArray(data.keys)) {
    throw new TokenVerificationError(
      "La respuesta del proveedor de autenticación no contiene claves válidas.",
      500
    );
  }

  jwksCache = {
    keys: data.keys,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  };

  return data.keys;
};

const selectSigningKey = async (
  domain: string,
  header: JwtHeader
): Promise<Jwk> => {
  if (!header.kid) {
    throw new TokenVerificationError(
      "El token JWT no incluye el identificador de la clave (kid)."
    );
  }

  const keys = await fetchJwks(domain);

  let selected = keys.find((key) => key.kid === header.kid);

  if (!selected) {
    const refreshedKeys = await fetchJwks(domain, true);
    selected = refreshedKeys.find((key) => key.kid === header.kid);
  }

  if (!selected) {
    throw new TokenVerificationError(
      "La clave utilizada para firmar el token ya no está disponible.",
      401
    );
  }

  return selected;
};

const createKeyObject = (jwk: Jwk) => {
  try {
    if (Array.isArray(jwk.x5c) && jwk.x5c.length > 0) {
      const [certificate] = jwk.x5c;
      const wrappedCertificate = certificate
        .match(/.{1,64}/g)
        ?.join("\n");

      const pem = `-----BEGIN CERTIFICATE-----\n${wrappedCertificate}\n-----END CERTIFICATE-----\n`;
      return createPublicKey(pem);
    }

    if (!jwk.n || !jwk.e) {
      throw new TokenVerificationError(
        "La clave pública descargada no contiene los parámetros necesarios.",
        500
      );
    }

    return createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" });
  } catch (error) {
    console.error("No se pudo construir la clave pública a partir del JWK", error);
    throw new TokenVerificationError(
      "No fue posible preparar la clave pública para validar el token.",
      500
    );
  }
};

const verifySignature = (
  signingInput: string,
  encodedSignature: string,
  jwk: Jwk
) => {
  const signature = base64UrlDecode(encodedSignature);
  const publicKey = createKeyObject(jwk);

  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();

  const isValid = verifier.verify(publicKey, signature);

  if (!isValid) {
    throw new TokenVerificationError("La firma del token no es válida.");
  }
};

const normalizeAudiences = (aud?: string | string[]) => {
  if (!aud) {
    return [] as string[];
  }

  return Array.isArray(aud) ? aud : [aud];
};

const validateClaims = (payload: JwtPayload, options: VerifyOptions) => {
  const issuerVariations = new Set([
    `https://${options.domain}/`,
    `https://${options.domain}`,
  ]);

  if (!payload.iss || !issuerVariations.has(payload.iss)) {
    throw new TokenVerificationError(
      "El token no fue emitido por el proveedor de autenticación configurado."
    );
  }

  const audiences = normalizeAudiences(payload.aud);

  if (
    audiences.length === 0 ||
    !audiences.some((audience) => options.audiences.includes(audience))
  ) {
    throw new TokenVerificationError(
      "El token no contiene un audience válido para este API.",
      403
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    typeof payload.exp === "number" &&
    now - CLOCK_TOLERANCE_SECONDS >= payload.exp
  ) {
    throw new TokenVerificationError("El token ha expirado. Vuelve a iniciar sesión.");
  }

  if (
    typeof payload.nbf === "number" &&
    payload.nbf - CLOCK_TOLERANCE_SECONDS > now
  ) {
    throw new TokenVerificationError(
      "El token aún no es válido. Ajusta la hora del dispositivo e inténtalo de nuevo."
    );
  }
};

const verifyAccessToken = async (
  token: string,
  options: VerifyOptions
): Promise<ParsedToken> => {
  const { encodedHeader, encodedPayload, encodedSignature, header, payload } =
    parseTokenParts(token);

  if (!header.alg || header.alg !== "RS256") {
    throw new TokenVerificationError(
      "Solo se admiten tokens firmados con RS256.",
      401
    );
  }

  const signingKey = await selectSigningKey(options.domain, header);

  verifySignature(`${encodedHeader}.${encodedPayload}`, encodedSignature, signingKey);
  validateClaims(payload, options);

  return {
    raw: token,
    header,
    payload,
  };
};

const extractBearerToken = (authorization?: string | null) => {
  if (!authorization) {
    throw new TokenVerificationError(
      "Falta el encabezado Authorization con el esquema Bearer."
    );
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match || !match[1]) {
    throw new TokenVerificationError(
      "El encabezado Authorization debe utilizar el formato 'Bearer <token>'."
    );
  }

  const token = match[1].trim();

  if (!token) {
    throw new TokenVerificationError("El token Bearer está vacío.");
  }

  return token;
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  let config: { domain: string; audience?: string | undefined };

  try {
    const tenant = getTenantContext(req);
    config = getAuth0BaseConfig(tenant);
  } catch (error) {
    if (error instanceof Auth0ServiceError) {
      console.error("La autenticación del servidor no está configurada correctamente", error);
      res.status(500).json({
        message:
          "La autenticación del servidor no está configurada. Contacta al administrador del sistema.",
      });
      return;
    }

    console.error("No se pudo leer la configuración de autenticación", error);
    res.status(500).json({
      message: "No se pudo inicializar la autenticación del servidor.",
    });
    return;
  }

  try {
    const token = extractBearerToken(req.headers.authorization);
    const audiences = [
      config.audience?.trim() ?? `https://${config.domain}${AUTH0_MANAGEMENT_AUDIENCE_SUFFIX}`,
    ];

    const verified = await verifyAccessToken(token, {
      domain: config.domain,
      audiences,
    });

    (req as AuthenticatedRequest).auth = verified;
    next();
  } catch (error) {
    if (error instanceof TokenVerificationError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    console.error("Error inesperado al verificar el token JWT", error);
    res.status(500).json({
      message: "No se pudo validar el token de acceso.",
    });
  }
};

export const clearJwksCache = () => {
  jwksCache = null;
};
