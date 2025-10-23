import type {
  Auth0UserProfile,
  AuthTokens,
  LoginRequestBody,
  LoginResponseBody,
  RegisterRequestBody,
  RegisterResponseBody,
  WebAuthnLoginFinishRequest,
  WebAuthnLoginStartResponse,
} from "@shared/api";
import { resolveTenantEnv, type TenantContext } from "../utils/tenant-env";

export const AUTH0_MANAGEMENT_AUDIENCE_SUFFIX = "/api/v2/";

type Auth0BaseConfig = {
  domain: string;
  audience?: string;
};

type Auth0ClientConfig = Auth0BaseConfig & {
  clientId: string;
  clientSecret: string;
};

type Auth0DbConfig = Auth0ClientConfig & {
  dbConnection: string;
};

type ManagementTokenCache = {
  token: string;
  expiresAt: number;
};

type Auth0RequestOptions = {
  tenant?: TenantContext | null;
};

type Auth0TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

type Auth0WebAuthnStartResponse = {
  publicKeyCredentialRequestOptions?: WebAuthnLoginStartResponse["options"];
  publicKey?: WebAuthnLoginStartResponse["options"];
  state?: string;
  expires_at?: string;
  [key: string]: unknown;
};

type Auth0WebAuthnFinishResponse = Auth0TokenResponse & {
  [key: string]: unknown;
};

export class Auth0ServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "Auth0ServiceError";
    this.status = status;
    this.details = details;
  }
}

const managementTokenCache = new Map<string, ManagementTokenCache>();
const getManagementCacheKey = (config: Auth0ClientConfig) => `${config.domain}::${config.clientId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseJson = async <T>(response: Response): Promise<T | undefined> => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn("No se pudo parsear la respuesta JSON de Auth0", error);
    return undefined;
  }
};

const extractAuth0Message = (body: unknown, fallback: string): string => {
  if (!isRecord(body)) {
    return fallback;
  }

  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message;
  }

  if (
    typeof body.error_description === "string" &&
    body.error_description.trim().length > 0
  ) {
    return body.error_description;
  }

  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }

  return fallback;
};

const normalizeDomain = (domain: string): string =>
  domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

const normalizeRedirectUri = (redirectUri: string): string | null => {
  try {
    const url = new URL(redirectUri);
    const sanitizedPath = url.pathname.replace(/\/+$/, "");
    const sanitizedSearch = url.search?.trim() ?? "";
    return `${url.origin}${sanitizedPath}${sanitizedSearch}`;
  } catch (_error) {
    return null;
  }
};

export const getAuth0BaseConfig = (tenant?: TenantContext | null): Auth0BaseConfig => {
  const domain = resolveTenantEnv("AUTH0_DOMAIN", tenant);
  const audience = resolveTenantEnv("AUTH0_AUDIENCE", tenant);

  if (!domain) {
    throw new Auth0ServiceError(
      "Configuración de Auth0 incompleta. Falta la variable AUTH0_DOMAIN.",
      500
    );
  }

  return {
    domain: normalizeDomain(domain),
    audience: audience ? audience : undefined,
  };
};

const getAuth0ClientConfig = (tenant?: TenantContext | null): Auth0ClientConfig => {
  const baseConfig = getAuth0BaseConfig(tenant);
  const clientId = resolveTenantEnv("AUTH0_CLIENT_ID", tenant);
  const clientSecret = resolveTenantEnv("AUTH0_CLIENT_SECRET", tenant);

  if (!clientId || !clientSecret) {
    throw new Auth0ServiceError(
      "Configuración de Auth0 incompleta. Verifica tus variables de entorno.",
      500
    );
  }

  return {
    ...baseConfig,
    clientId,
    clientSecret,
  };
};

const getAuth0DbConfig = (tenant?: TenantContext | null): Auth0DbConfig => {
  const clientConfig = getAuth0ClientConfig(tenant);
  const dbConnection = resolveTenantEnv("AUTH0_DB_CONNECTION", tenant);

  if (!dbConnection) {
    throw new Auth0ServiceError(
      "Configuración de Auth0 incompleta. Falta la variable AUTH0_DB_CONNECTION.",
      500
    );
  }

  return {
    ...clientConfig,
    dbConnection,
  };
};

const getManagementAudience = (domain: string) =>
  `https://${domain}${AUTH0_MANAGEMENT_AUDIENCE_SUFFIX}`;

const getManagementToken = async (config: Auth0ClientConfig): Promise<string> => {
  const now = Date.now();
  const cacheKey = getManagementCacheKey(config);
  const cached = managementTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.token;
  }

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      audience: getManagementAudience(config.domain),
      grant_type: "client_credentials",
    }),
  });

  const body = await parseJson<Auth0TokenResponse>(response);

  if (!response.ok || !body?.access_token) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        body,
        "No se pudo obtener el token de administración de Auth0."
      ),
      response.status || 500,
      body
    );
  }

  const expiresInSeconds = body.expires_in ?? 0;
  const expiresAt = Date.now() + Math.max(expiresInSeconds - 60, 30) * 1000;

  managementTokenCache.set(cacheKey, {
    token: body.access_token,
    expiresAt,
  });

  return body.access_token;
};

export const createAuth0User = async (
  payload: RegisterRequestBody,
  options: Auth0RequestOptions = {},
): Promise<RegisterResponseBody> => {
  const config = getAuth0DbConfig(options.tenant);
  const managementToken = await getManagementToken(config);

  const response = await fetch(`https://${config.domain}/api/v2/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connection: config.dbConnection,
      email: payload.email,
      password: payload.password,
      verify_email: false,
      name: payload.fullName,
      user_metadata: {
        fullName: payload.fullName,
        documentNumber: payload.documentNumber,
      },
    }),
  });

  const body = await parseJson<Auth0UserProfile>(response);

  if (!response.ok || !body) {
    const message = extractAuth0Message(
      body,
      "No se pudo registrar el usuario en Auth0."
    );

    throw new Auth0ServiceError(
      message,
      response.status || 500,
      body
    );
  }

  return {
    user: body,
    message: "Usuario registrado correctamente en Auth0.",
  };
};

const normalizeWebAuthnStartResponse = (
  body: Auth0WebAuthnStartResponse | undefined,
  status: number
): WebAuthnLoginStartResponse => {
  if (!body) {
    throw new Auth0ServiceError(
      "No se recibieron opciones de autenticación WebAuthn.",
      status || 500
    );
  }

  const candidateOptions = (body as Record<string, unknown>).options;

  const options =
    body.publicKeyCredentialRequestOptions ??
    body.publicKey ??
    (isRecord(candidateOptions)
      ? ((candidateOptions as unknown) as WebAuthnLoginStartResponse["options"])
      : undefined);

  if (!options) {
    throw new Auth0ServiceError(
      "La respuesta de Auth0 no incluye las opciones WebAuthn necesarias.",
      status || 500,
      body
    );
  }

  return {
    options,
    state: typeof body.state === "string" ? body.state : undefined,
    expiresAt:
      typeof body.expires_at === "string" ? body.expires_at : undefined,
  };
};

export const startWebAuthnLogin = async (
  email: string,
  options: Auth0RequestOptions = {},
): Promise<WebAuthnLoginStartResponse> => {
  const config = getAuth0ClientConfig(options.tenant);

  const response = await fetch(`https://${config.domain}/webauthn/login/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      username: email,
    }),
  });

  const body = await parseJson<Auth0WebAuthnStartResponse>(response);

  if (!response.ok) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        body,
        "No se pudo iniciar la autenticación WebAuthn."
      ),
      response.status || 500,
      body
    );
  }

  return normalizeWebAuthnStartResponse(body, response.status || 200);
};

export const finishWebAuthnLogin = async (
  payload: WebAuthnLoginFinishRequest,
  options: Auth0RequestOptions = {},
): Promise<LoginResponseBody> => {
  const config = getAuth0ClientConfig(options.tenant);

  const response = await fetch(`https://${config.domain}/webauthn/login/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      credential: payload.credential,
      username: payload.email,
      state: payload.state,
    }),
  });

  const body = await parseJson<Auth0WebAuthnFinishResponse>(response);

  if (!response.ok || !body?.access_token) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        body,
        "No se pudo validar la autenticación WebAuthn."
      ),
      response.status || 500,
      body
    );
  }

  const profileResponse = await fetch(`https://${config.domain}/userinfo`, {
    headers: {
      Authorization: `Bearer ${body.access_token}`,
    },
  });

  const profile = await parseJson<Auth0UserProfile>(profileResponse);

  if (!profileResponse.ok || !profile) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        profile,
        "No se pudo recuperar el perfil del usuario tras autenticarse."
      ),
      profileResponse.status || 500,
      profile
    );
  }

  const tokens: AuthTokens = {
    accessToken: body.access_token,
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    tokenType: body.token_type,
    scope: body.scope,
  };

  return {
    tokens,
    user: profile,
  };
};

export const loginWithPassword = async (
  payload: LoginRequestBody,
  options: Auth0RequestOptions = {},
): Promise<LoginResponseBody> => {
  const config = getAuth0DbConfig(options.tenant);

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: payload.email,
      password: payload.password,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      realm: config.dbConnection,
      audience:
        config.audience ?? getManagementAudience(config.domain),
      scope: "openid profile email offline_access",
    }),
  });

  const body = await parseJson<Auth0TokenResponse>(response);

  if (!response.ok || !body?.access_token) {
    const message = extractAuth0Message(
      body,
      response.status === 401 || response.status === 403
        ? "Credenciales inválidas. Verifica tu correo y contraseña."
        : "No se pudo iniciar sesión en Auth0."
    );

    throw new Auth0ServiceError(
      message,
      response.status || 500,
      body
    );
  }

  const profileResponse = await fetch(`https://${config.domain}/userinfo`, {
    headers: {
      Authorization: `Bearer ${body.access_token}`,
    },
  });

  const profile = await parseJson<Auth0UserProfile>(profileResponse);

  if (!profileResponse.ok || !profile) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        profile,
        "No se pudo recuperar el perfil del usuario."
      ),
      profileResponse.status || 500,
      profile
    );
  }

  const tokens: AuthTokens = {
    accessToken: body.access_token,
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    tokenType: body.token_type,
    scope: body.scope,
  };

  return {
    tokens,
    user: profile,
  };
};

export const exchangeAuthorizationCode = async (
  {
    code,
    codeVerifier,
    redirectUri,
  }: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  },
  options: Auth0RequestOptions = {},
): Promise<LoginResponseBody> => {
  const config = getAuth0ClientConfig(options.tenant);
  const configuredRedirect = resolveTenantEnv("AUTH0_REDIRECT_URI", options.tenant);
  const normalizedRequestedRedirect = normalizeRedirectUri(redirectUri);

  if (!normalizedRequestedRedirect) {
    throw new Auth0ServiceError(
      "La URL de redirección proporcionada no es válida.",
      400
    );
  }

  if (configuredRedirect) {
    const normalizedConfiguredRedirect = normalizeRedirectUri(configuredRedirect);

    if (
      normalizedConfiguredRedirect &&
      normalizedConfiguredRedirect !== normalizedRequestedRedirect
    ) {
      throw new Auth0ServiceError(
        "La URL de redirección utilizada no coincide con la configurada para Auth0.",
        400
      );
    }
  }

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: normalizedRequestedRedirect,
      code_verifier: codeVerifier,
    }),
  });

  const body = await parseJson<Auth0TokenResponse>(response);

  if (!response.ok || !body?.access_token) {
    const message = extractAuth0Message(
      body,
      "No se pudo completar el inicio de sesión con Auth0."
    );

    throw new Auth0ServiceError(
      message,
      response.status || 500,
      body
    );
  }

  const profileResponse = await fetch(`https://${config.domain}/userinfo`, {
    headers: {
      Authorization: `Bearer ${body.access_token}`,
    },
  });

  const profile = await parseJson<Auth0UserProfile>(profileResponse);

  if (!profileResponse.ok || !profile) {
    throw new Auth0ServiceError(
      extractAuth0Message(
        profile,
        "No se pudo recuperar el perfil del usuario tras autenticarse."
      ),
      profileResponse.status || 500,
      profile
    );
  }

  const tokens: AuthTokens = {
    accessToken: body.access_token,
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    tokenType: body.token_type,
    scope: body.scope,
  };

  return {
    tokens,
    user: profile,
  };
};
