const APP_INSIGHTS_SCRIPT_URL = "https://js.monitor.azure.com/scripts/b/ai.2.min.js";

let scriptLoadPromise: Promise<void> | null = null;
let clientInitPromise: Promise<AppInsightsClient | null> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function loadAppInsightsScript(): Promise<void> {
  if (!isBrowser()) {
    return Promise.resolve();
  }

  if (window.Microsoft?.ApplicationInsights?.ApplicationInsights) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${APP_INSIGHTS_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      if ((existingScript as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          scriptLoadPromise = null;
          reject(new Error("No se pudo cargar el script de Application Insights."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = APP_INSIGHTS_SCRIPT_URL;
    script.async = false;
    script.defer = false;
    script.crossOrigin = "anonymous";

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        scriptLoadPromise = null;
        reject(new Error("No se pudo cargar el script de Application Insights."));
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

function resolveConnectionString(): string | null {
  const connectionFromEnv =
    import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING ??
    import.meta.env.VITE_APP_INSIGHTS_CONNECTION_STRING ??
    null;

  if (connectionFromEnv && connectionFromEnv.trim().length > 0) {
    return connectionFromEnv;
  }

  return (
    "InstrumentationKey=1b65a59c-c829-4090-a9a4-be8b8f240e33;" +
    "IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;" +
    "LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;" +
    "ApplicationId=aacff451-35e9-4725-b14b-69dfe2b192bc"
  );
}

function resolveInstrumentationKey(): string | null {
  const keyFromEnv =
    import.meta.env.VITE_APPLICATIONINSIGHTS_INSTRUMENTATION_KEY ??
    import.meta.env.VITE_APP_INSIGHTS_INSTRUMENTATION_KEY ??
    null;

  if (keyFromEnv && keyFromEnv.trim().length > 0) {
    return keyFromEnv;
  }

  return "1b65a59c-c829-4090-a9a4-be8b8f240e33";
}

function getWorkspaceName(): string {
  return (
    import.meta.env.VITE_APPLICATIONINSIGHTS_WORKSPACE ??
    import.meta.env.VITE_APP_INSIGHTS_WORKSPACE ??
    "z-aas-tran-shrd-ppd-nc1-rgp01"
  );
}

function getCloudRoleName(): string {
  return (
    import.meta.env.VITE_APPLICATIONINSIGHTS_CLOUD_ROLE ??
    import.meta.env.VITE_APP_INSIGHTS_CLOUD_ROLE ??
    "axa-beneficios-spa"
  );
}

async function initializeClient(): Promise<AppInsightsClient | null> {
  if (!isBrowser()) {
    return null;
  }

  if (window.appInsights) {
    return window.appInsights;
  }

  if (clientInitPromise) {
    return clientInitPromise;
  }

  clientInitPromise = (async () => {
    try {
      await loadAppInsightsScript();
    } catch (error) {
      console.warn("No se pudo cargar Application Insights", error);
      return null;
    }

    const AppInsightsConstructor = window.Microsoft?.ApplicationInsights?.ApplicationInsights;

    if (!AppInsightsConstructor) {
      console.warn("El SDK de Application Insights no está disponible en la ventana global.");
      return null;
    }

    const connectionString = resolveConnectionString();
    const instrumentationKey = resolveInstrumentationKey();

    const config: AppInsightsConfiguration = connectionString
      ? {
          connectionString,
          enableAutoRouteTracking: true,
          autoTrackPageVisitTime: true,
          enableUnhandledPromiseRejectionTracking: true,
        }
      : {
          instrumentationKey: instrumentationKey ?? undefined,
          enableAutoRouteTracking: true,
          autoTrackPageVisitTime: true,
          enableUnhandledPromiseRejectionTracking: true,
        };

    const client = new AppInsightsConstructor({ config });

    client.loadAppInsights();

    const workspaceName = getWorkspaceName();
    const cloudRole = getCloudRoleName();

    client.addTelemetryInitializer?.((envelope: Record<string, unknown>) => {
      try {
        const telemetryEnvelope = envelope as TelemetryEnvelope;
        telemetryEnvelope.tags = telemetryEnvelope.tags ?? {};
        telemetryEnvelope.tags["ai.cloud.role"] = telemetryEnvelope.tags["ai.cloud.role"] ?? cloudRole;
        telemetryEnvelope.tags["ai.cloud.roleInstance"] =
          telemetryEnvelope.tags["ai.cloud.roleInstance"] ?? window.location.hostname;

        const baseData = telemetryEnvelope.data?.baseData;

        if (baseData && typeof baseData === "object") {
          baseData.properties = baseData.properties ?? {};

          if (!baseData.properties.workspace) {
            baseData.properties.workspace = workspaceName;
          }
        }
      } catch (initializerError) {
        console.warn("No se pudo aplicar el inicializador de telemetría", initializerError);
      }
    });

    client.trackPageView();
    window.appInsights = client;

    return client;
  })();

  return clientInitPromise;
}

export async function ensureAppInsightsClient(): Promise<AppInsightsClient | null> {
  return initializeClient();
}

export async function trackPageView(name: string, uri?: string): Promise<void> {
  const client = await ensureAppInsightsClient();

  if (!client) {
    return;
  }

  try {
    client.trackPageView({ name, uri });
  } catch (error) {
    console.warn("No se pudo registrar la vista de página en Application Insights", error);
  }
}

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

export async function trackEvent(event: TelemetryEvent): Promise<void> {
  const client = await ensureAppInsightsClient();

  if (!client || typeof client.trackEvent !== "function") {
    return;
  }

  try {
    client.trackEvent(event, event.properties);
  } catch (error) {
    console.warn("No se pudo registrar el evento en Application Insights", error);
  }
}

export type AppInsightsClient = {
  loadAppInsights: () => void;
  trackPageView: (pageView?: { name?: string; uri?: string }) => void;
  trackEvent?: (event: TelemetryEvent, properties?: Record<string, unknown>) => void;
  addTelemetryInitializer?: (callback: (envelope: Record<string, unknown>) => void) => void;
};

type TelemetryEnvelope = {
  name?: string;
  tags?: Record<string, unknown>;
  data?: {
    baseType?: string;
    baseData?: {
      name?: string;
      properties?: Record<string, any>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

type AppInsightsConfiguration = {
  instrumentationKey?: string;
  connectionString?: string;
  enableAutoRouteTracking?: boolean;
  autoTrackPageVisitTime?: boolean;
  enableUnhandledPromiseRejectionTracking?: boolean;
};
