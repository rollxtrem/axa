import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api-client";

import { authConfig } from "@/lib/auth-config";

import type {
  ApiErrorResponse,
  Auth0UserProfile,
  AuthTokens,
  LoginRequestBody,
  LoginResponseBody,
  RegisterRequestBody,
  RegisterResponseBody,
} from "@shared/api";

type LoginPayload = LoginRequestBody & { rememberMe?: boolean };

type AuthState = {
  tokens?: AuthTokens;
  user?: Auth0UserProfile;
  persist?: boolean;
};

type AuthContextType = {
  isAuthEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens?: AuthTokens;
  user?: Auth0UserProfile;
  login: (payload: LoginPayload) => Promise<LoginResponseBody>;
  register: (
    payload: RegisterRequestBody
  ) => Promise<RegisterResponseBody>;
  logout: () => void;
  error?: string;
  completeLogin: (
    result: LoginResponseBody,
    options?: { rememberMe?: boolean }
  ) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "axa-auth-state";

const AUTH_DISABLED_MESSAGE =
  "La autenticación está deshabilitada en este entorno.";

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

const parseJsonResponse = async <T,>(
  response: Response,
  context: string
): Promise<{ data?: T; rawText: string }> => {
  const rawText = await response.text();

  if (!rawText) {
    return { rawText };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return { rawText };
  }

  const firstChar = trimmed[0];
  if (firstChar !== "{" && firstChar !== "[") {
    console.warn(
      `La respuesta de ${context} no es JSON.`,
      {
        status: response.status,
        contentType: response.headers.get("content-type"),
        preview: trimmed.slice(0, 120),
      }
    );

    return { rawText };
  }

  try {
    return { data: JSON.parse(trimmed) as T, rawText };
  } catch (error) {
    console.warn(
      `No se pudo parsear la respuesta JSON de ${context}.`,
      error,
      {
        status: response.status,
        preview: trimmed.slice(0, 120),
      }
    );

    return { rawText };
  }
};

const createDisabledAuthContextValue = (): AuthContextType => ({
  isAuthEnabled: false,
  isAuthenticated: false,
  isLoading: false,
  tokens: undefined,
  user: undefined,
  login: async () => {
    throw new Error(AUTH_DISABLED_MESSAGE);
  },
  register: async () => {
    throw new Error(AUTH_DISABLED_MESSAGE);
  },
  logout: () => undefined,
  error: undefined,
  completeLogin: () => {
    throw new Error(AUTH_DISABLED_MESSAGE);
  },
});

const DISABLED_AUTH_CONTEXT_VALUE = createDisabledAuthContextValue();

const readStoredState = (): AuthState => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as AuthState;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("No se pudo recuperar el estado de autenticación", error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return {};
};

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!authConfig.isAuthEnabled) {
    return (
      <AuthContext.Provider value={DISABLED_AUTH_CONTEXT_VALUE}>
        {children}
      </AuthContext.Provider>
    );
  }

  const [authState, setAuthState] = useState<AuthState>(() => readStoredState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const completeLogin = useCallback(
    (
      result: LoginResponseBody,
      options?: { rememberMe?: boolean }
    ) => {
      setAuthState({
        tokens: result.tokens,
        user: result.user,
        persist: Boolean(options?.rememberMe),
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (authState.persist) {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(authState)
      );
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authState]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResponseBody> => {
      const { rememberMe = false, ...credentials } = payload;

      setIsLoading(true);
      setError(undefined);

      try {
        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials as LoginRequestBody),
        });

        const { data } = await parseJsonResponse<
          LoginResponseBody | ApiErrorResponse
        >(response, "inicio de sesión");

        if (!response.ok || !data || !("tokens" in data)) {
          const message = isApiErrorResponse(data)
            ? data.message
            : "No se pudo iniciar sesión. Inténtalo nuevamente.";

          throw new Error(message);
        }

        const result = data as LoginResponseBody;

        completeLogin(result, { rememberMe });

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión. Inténtalo nuevamente.";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [completeLogin]
  );

  const registerAccount = useCallback(
    async (payload: RegisterRequestBody): Promise<RegisterResponseBody> => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const { data } = await parseJsonResponse<
          RegisterResponseBody | ApiErrorResponse
        >(response, "registro");

        if (!response.ok || !data || !("user" in data)) {
          const message = isApiErrorResponse(data)
            ? data.message
            : "No se pudo completar el registro.";

          throw new Error(message);
        }

        return data as RegisterResponseBody;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo completar el registro.";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthState({});
    setError(undefined);
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthEnabled: true,
      isAuthenticated: Boolean(authState.tokens?.accessToken),
      isLoading,
      tokens: authState.tokens,
      user: authState.user,
      login,
      register: registerAccount,
      logout,
      error,
      completeLogin,
    }),
    [
      authState,
      completeLogin,
      error,
      isLoading,
      login,
      logout,
      registerAccount,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return ctx;
}
