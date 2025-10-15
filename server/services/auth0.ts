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

let managementTokenCache: ManagementTokenCache | null = null;

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

export const getAuth0BaseConfig = (): Auth0BaseConfig => {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();

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

const getAuth0ClientConfig = (): Auth0ClientConfig => {
  const baseConfig = getAuth0BaseConfig();
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_CLIENT_SECRET?.trim();

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

const getAuth0DbConfig = (): Auth0DbConfig => {
  const clientConfig = getAuth0ClientConfig();
  const dbConnection = process.env.AUTH0_DB_CONNECTION?.trim();

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
  if (managementTokenCache && managementTokenCache.expiresAt > now) {
    return managementTokenCache.token;
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

  managementTokenCache = {
    token: body.access_token,
    expiresAt,
  };

  return body.access_token;
};

export const createAuth0User = async (
  payload: RegisterRequestBody
): Promise<RegisterResponseBody> => {
  const config = getAuth0DbConfig();
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
  email: string
): Promise<WebAuthnLoginStartResponse> => {
  const config = getAuth0ClientConfig();

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
  payload: WebAuthnLoginFinishRequest
): Promise<LoginResponseBody> => {
  const config = getAuth0ClientConfig();

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
  payload: LoginRequestBody
): Promise<LoginResponseBody> => {
  const config = getAuth0DbConfig();

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

export const exchangeAuthorizationCode = async ({
  code,
  codeVerifier,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<LoginResponseBody> => {
  const config = getAuth0ClientConfig();

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
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
