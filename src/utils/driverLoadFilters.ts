export function isDriverLoadCompleted(load: {
  status?: string;
  loadStatus?: string;
  completedAt?: string | null;
} | null | undefined): boolean {
  if (!load) return false;

  if (load.completedAt) return true;

  const status = String(load.status ?? load.loadStatus ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  return status === "COMPLETED";
}

export function getUpcomingDriverLoads<T extends { status?: string; loadStatus?: string; completedAt?: string | null }>(
  loads: T[] | null | undefined
): T[] {
  if (!Array.isArray(loads)) return [];
  return loads.filter((load) => !isDriverLoadCompleted(load));
}
