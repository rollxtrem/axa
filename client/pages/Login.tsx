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
        const redirectUri = `${window.location.origin.replace(/\/$/, "")}/callback`;
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
