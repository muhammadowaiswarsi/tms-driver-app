import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ensureDriverTracking } from "../../services/TrackingService";

/** Starts GPS tracking only after login token is available. */
export default function TrackingBootstrap() {
  const { isAuthenticated, accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !accessToken) return;
    ensureDriverTracking().catch((error) => {
      console.warn("[Tracking] Failed to start:", error?.message || error);
    });
  }, [isAuthenticated, accessToken, isLoading]);

  return null;
}
