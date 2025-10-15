import { useEffect, useRef } from "react";

import { auth0ClientConfig, isAuth0ClientConfigValid } from "@/lib/auth0-config";
import { createPkceChallenge, persistPkceState } from "@/lib/pkce";

export default function Login() {
  const redirectAttemptedRef = useRef(false);

  useEffect(() => {
    if (redirectAttemptedRef.current) {
      return;
    }

    redirectAttemptedRef.current = true;

    if (!isAuth0ClientConfigValid) {
      console.error(
        "La configuración de Auth0 no está disponible. Contacta al administrador."
      );
      return;
    }

    if (typeof window === "undefined") {
      console.error("Este entorno no soporta redirecciones de autenticación.");
      return;
    }

    const { domain, clientId, audience } = auth0ClientConfig;

    if (!domain || !clientId) {
      console.error(
        "La configuración de Auth0 está incompleta. Contacta al administrador."
      );
      return;
    }

    const redirectToAuth0 = async () => {
      try {
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
