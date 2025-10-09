import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ensureAppInsightsClient, trackPageView } from "@/lib/telemetry";

export function AppInsightsTracker() {
  const location = useLocation();

  useEffect(() => {
    void ensureAppInsightsClient();
  }, []);

  useEffect(() => {
    const pageName = document.title || location.pathname;
    const uri = `${location.pathname}${location.search}`;
    void trackPageView(pageName, uri);
  }, [location]);

  return null;
}
