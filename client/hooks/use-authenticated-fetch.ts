import { useCallback } from "react";

import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

type AuthenticatedFetch = (input: FetchInput, init?: FetchInit) => ReturnType<typeof fetch>;

export function useAuthenticatedFetch(): AuthenticatedFetch {
  const { tokens } = useAuth();

  return useCallback<AuthenticatedFetch>(
    (input, init) => {
      const headers = new Headers(init?.headers ?? {});

      if (tokens?.accessToken) {
        headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      }

      return apiFetch(input, {
        ...init,
        headers,
      });
    },
    [tokens?.accessToken]
  );
}
