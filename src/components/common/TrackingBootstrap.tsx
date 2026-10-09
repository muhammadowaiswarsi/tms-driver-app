import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { resumeDriverTrackingIfNeeded } from "../../services/TrackingService";


export default function TrackingBootstrap() {
  const { isAuthenticated, accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !accessToken) return;
    // Login alone does not open a session. Resume only if a load start
    // already stored one, so foreground and background pings continue.
    resumeDriverTrackingIfNeeded().catch(() => {});
  }, [isAuthenticated, accessToken, isLoading]);

  return null;
}
