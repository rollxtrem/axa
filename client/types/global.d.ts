export type TelemetryInitializer = (envelope: Record<string, unknown>) => void;

export interface AppInsightsLike {
  loadAppInsights: () => void;
  trackPageView: (pageView?: { name?: string; uri?: string }) => void;
  trackEvent?: (event: { name: string; properties?: Record<string, unknown> }, properties?: Record<string, unknown>) => void;
  addTelemetryInitializer?: (callback: TelemetryInitializer) => void;
}

declare global {
  interface Window {
    appInsights?: AppInsightsLike;
    Microsoft?: {
      ApplicationInsights?: {
        ApplicationInsights: new (options: { config: Record<string, unknown> }) => AppInsightsLike;
      };
    };
  }
}

export {};
