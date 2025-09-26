import type {
  Auth0UserProfile,
  AuthTokens,
  LoginRequestBody,
  LoginResponseBody,
  RegisterRequestBody,
  RegisterResponseBody,
} from "@shared/api";

const MANAGEMENT_AUDIENCE_SUFFIX = "/api/v2/";

type Auth0Config = {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience?: string;
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

const getAuth0Config = (): Auth0Config => {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_CLIENT_SECRET?.trim();
  const dbConnection = process.env.AUTH0_DB_CONNECTION?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();

  if (!domain || !clientId || !clientSecret || !dbConnection) {
    throw new Auth0ServiceError(
      "Configuración de Auth0 incompleta. Verifica tus variables de entorno.",
      500
    );
  }

  return {
    domain: normalizeDomain(domain),
    clientId,
    clientSecret,
    dbConnection,
    audience,
  };
};

const getManagementAudience = (domain: string) =>
  `https://${domain}${MANAGEMENT_AUDIENCE_SUFFIX}`;

const getManagementToken = async (config: Auth0Config): Promise<string> => {
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
  const config = getAuth0Config();
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

export const loginWithPassword = async (
  payload: LoginRequestBody
): Promise<LoginResponseBody> => {
  const config = getAuth0Config();

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
