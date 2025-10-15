import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { apiFetch, readJsonResponse } from "@/lib/api-client";
import { clearPkceState, readPkceState } from "@/lib/pkce";
import type { LoginResponseBody } from "@shared/api";

const CALLBACK_ERROR_MESSAGE =
  "No se pudo completar el inicio de sesión. Intenta iniciar sesión nuevamente.";

const normalizeAuth0Error = (error: string | null, description: string | null) => {
  if (error === "access_denied") {
    return (
      description ||
      "El acceso fue denegado. Revisa los permisos solicitados e intenta nuevamente."
    );
  }

  if (error === "login_required") {
    return "Tu sesión caducó. Vuelve a iniciar sesión.";
  }

  return description || error;
};

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const authError = searchParams.get("error");
    const authErrorDescription = searchParams.get("error_description");

    if (authError) {
      const normalizedError = normalizeAuth0Error(authError, authErrorDescription);
      setErrorMessage(
        normalizedError ||
          "Auth0 rechazó la autenticación. Intenta iniciar sesión nuevamente."
      );
      clearPkceState();
      return;
    }

    if (!code) {
      setErrorMessage(CALLBACK_ERROR_MESSAGE);
      clearPkceState();
      return;
    }

    const stored = readPkceState();

    if (!stored) {
      setErrorMessage(
        "No se encontró el estado de autenticación. Inicia sesión nuevamente desde la página principal."
      );
      return;
    }

    if (stored.state && state && stored.state !== state) {
      setErrorMessage(
        "La validación de seguridad falló. Inicia sesión nuevamente desde la página principal."
      );
      clearPkceState();
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await apiFetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            codeVerifier: stored.codeVerifier,
            redirectUri: stored.redirectUri,
          }),
        });

        const { data, errorMessage: apiError } = await readJsonResponse<LoginResponseBody>(
          response
        );

        if (!response.ok || !data) {
          throw new Error(apiError ?? CALLBACK_ERROR_MESSAGE);
        }

        completeLogin(data, { rememberMe: stored.rememberMe });
        clearPkceState();
        navigate("/", { replace: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : CALLBACK_ERROR_MESSAGE;
        setErrorMessage(message);
        clearPkceState();
      }
    };

    void exchangeCode();
  }, [completeLogin, location.search, navigate]);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0e45] px-4">
        <div className="max-w-md w-full bg-white rounded-[20px] shadow-lg p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-[#0e0e0e]">
            No se pudo completar el inicio de sesión
          </h1>
          <p className="text-sm text-[#4b5563] leading-5">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              clearPkceState();
              navigate("/login", { replace: true });
            }}
            className="mt-2 inline-flex h-11 px-6 items-center justify-center rounded-full bg-[#0c0e45] text-white text-sm font-semibold tracking-[1.25px] uppercase hover:bg-[#0c0e45]/90 transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0e45] px-4">
      <div className="max-w-md w-full bg-white rounded-[20px] shadow-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[#0e0e0e]">
          Conectando con Auth0…
        </h1>
        <p className="text-sm text-[#4b5563] leading-5">
          Estamos validando tus credenciales. Este proceso puede tomar unos segundos.
        </p>
      </div>
    </div>
  );
}
