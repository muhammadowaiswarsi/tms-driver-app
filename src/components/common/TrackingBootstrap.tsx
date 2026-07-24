import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ensureDriverTracking } from "../../services/TrackingService";


export default function TrackingBootstrap() {
  const { isAuthenticated, accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !accessToken) return;
    ensureDriverTracking().catch(() => {});
  }, [isAuthenticated, accessToken, isLoading]);

  return null;
}
