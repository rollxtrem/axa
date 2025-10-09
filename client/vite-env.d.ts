/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
  readonly VITE_APPLICATIONINSIGHTS_INSTRUMENTATION_KEY?: string;
  readonly VITE_APPLICATIONINSIGHTS_WORKSPACE?: string;
  readonly VITE_APPLICATIONINSIGHTS_CLOUD_ROLE?: string;
  readonly VITE_APP_INSIGHTS_CONNECTION_STRING?: string;
  readonly VITE_APP_INSIGHTS_INSTRUMENTATION_KEY?: string;
  readonly VITE_APP_INSIGHTS_WORKSPACE?: string;
  readonly VITE_APP_INSIGHTS_CLOUD_ROLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
