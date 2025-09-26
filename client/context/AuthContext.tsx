import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "axa-auth-state";

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

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
  const [authState, setAuthState] = useState<AuthState>(() => readStoredState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials as LoginRequestBody),
        });

        const data = (await response.json().catch(() => undefined)) as
          | LoginResponseBody
          | ApiErrorResponse
          | undefined;

        if (!response.ok || !data || !("tokens" in data)) {
          const message = isApiErrorResponse(data)
            ? data.message
            : "No se pudo iniciar sesión. Inténtalo nuevamente.";

          throw new Error(message);
        }

        const result = data as LoginResponseBody;

        setAuthState({
          tokens: result.tokens,
          user: result.user,
          persist: rememberMe,
        });

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
    []
  );

  const registerAccount = useCallback(
    async (payload: RegisterRequestBody): Promise<RegisterResponseBody> => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => undefined)) as
          | RegisterResponseBody
          | ApiErrorResponse
          | undefined;

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
      isAuthenticated: Boolean(authState.tokens?.accessToken),
      isLoading,
      tokens: authState.tokens,
      user: authState.user,
      login,
      register: registerAccount,
      logout,
      error,
    }),
    [authState, error, isLoading, login, logout, registerAccount]
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
