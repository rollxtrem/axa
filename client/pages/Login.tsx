import { useEffect, useRef } from "react";

import {
  getAuth0ClientConfig,
  hasValidAuth0ClientConfig,
  loadAuth0ClientConfig,
  type Auth0ClientConfig,
} from "@/lib/auth0-config";
import { createPkceChallenge, persistPkceState } from "@/lib/pkce";

export default function Login() {
  const redirectAttemptedRef = useRef(false);

  const resolveRedirectUri = (configuredRedirect?: string) => {
    if (configuredRedirect) {
      return configuredRedirect;
    }

    if (typeof window === "undefined" || !window.location) {
      throw new Error(
        "No se pudo determinar la URL de redirección predeterminada para Auth0."
      );
    }

    const { location } = window;
    const origin =
      location.origin || `${location.protocol}//${location.host}` || "";

    if (!origin) {
      throw new Error(
        "El navegador no expuso un origen válido para construir la redirección de Auth0."
      );
    }

    return `${origin.replace(/\/$/, "")}/callback`;
  };

  useEffect(() => {
    if (redirectAttemptedRef.current) {
      return;
    }

    redirectAttemptedRef.current = true;

    if (typeof window === "undefined") {
      console.error("Este entorno no soporta redirecciones de autenticación.");
      return;
    }

    const redirectToAuth0 = async () => {
      try {
        let config: Auth0ClientConfig | undefined;

        try {
          config = await loadAuth0ClientConfig();
        } catch (error) {
          console.error(
            "No se pudo obtener la configuración de Auth0 desde el servidor. Se intentará usar la configuración por defecto.",
            error
          );
          config = getAuth0ClientConfig();
        }

        if (!hasValidAuth0ClientConfig(config)) {
          console.error(
            "La configuración de Auth0 está incompleta. Contacta al administrador."
          );
          return;
        }

        const { domain, clientId, audience } = config;
        let redirectUri: string;

        try {
          redirectUri = resolveRedirectUri(config.redirectUri);
        } catch (error) {
          console.error(
            "No se pudo determinar la URL de redirección para Auth0.",
            error
          );
          return;
        }

        if (config.redirectUri) {
          try {
            const configuredUrl = new URL(config.redirectUri);
            const currentOrigin = window.location.origin;

            if (configuredUrl.origin !== currentOrigin) {
              console.info(
                "Se utilizará la URL de redirección configurada para Auth0, que no coincide con el dominio actual.",
                {
                  redirectUri: config.redirectUri,
                  currentOrigin,
                }
              );
            }
          } catch (error) {
            console.warn(
              "La URL de redirección configurada para Auth0 no es válida.",
              error
            );
          }
        }

        const { codeVerifier, codeChallenge, state } = await createPkceChallenge();

        persistPkceState({
          state,
          codeVerifier,
          redirectUri,
          rememberMe: false,
          createdAt: Date.now(),
        });

        const authorizeUrl = new URL(`https://${domain}/authorize`);
        authorizeUrl.searchParams.set("client_id", clientId);
        authorizeUrl.searchParams.set("response_type", "code");
        authorizeUrl.searchParams.set("redirect_uri", redirectUri);
        authorizeUrl.searchParams.set(
          "scope",
          "openid email profile offline_access"
        );
        authorizeUrl.searchParams.set("state", state);
        authorizeUrl.searchParams.set("code_challenge", codeChallenge);
        authorizeUrl.searchParams.set("code_challenge_method", "S256");

        if (audience) {
          authorizeUrl.searchParams.set("audience", audience);
        }

        window.location.assign(authorizeUrl.toString());
      } catch (error) {
        console.error(
          "No se pudo redirigir a Auth0 para iniciar sesión.",
          error
        );
      }
    };

    void redirectToAuth0();
  }, []);

  return null;
}
