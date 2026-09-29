type PickupLoadShape = {
  pickupAptFrom?: string | Date | null;
  pickupLocation?: Array<{ from?: string | null; to?: string | null; kind?: string }>;
} | null | undefined;

function getPrimaryPickupLocation(load: PickupLoadShape) {
  if (!load || !Array.isArray(load.pickupLocation) || load.pickupLocation.length === 0) {
    return null;
  }
  return load.pickupLocation.find((location) => location.kind === "pickup") || load.pickupLocation[0];
}

function getPickupScheduleBounds(load: PickupLoadShape): { from: Date; to: Date } | null {
  if (!load) return null;
  if (load.pickupAptFrom) {
    const from = new Date(load.pickupAptFrom);
    if (!Number.isNaN(from.getTime())) return { from, to: from };
  }
  const pickup = getPrimaryPickupLocation(load);
  if (!pickup) return null;
  const from = pickup.from ? new Date(pickup.from) : null;
  const to = pickup.to ? new Date(pickup.to) : null;
  if (!from && !to) return null;
  if (from && to) return { from, to };
  if (from) return { from, to: from };
  if (to) return { from: to, to };
  return null;
}

function getPickupTimestamp(load: PickupLoadShape): number {
  const schedule = getPickupScheduleBounds(load);
  if (!schedule) return Number.MAX_SAFE_INTEGER;
  const timestamp = schedule.from.getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function sortDriverLoadsByPickupDate<T>(loads: T[]): T[] {
  return [...loads].sort(
    (left, right) => getPickupTimestamp(left as PickupLoadShape) - getPickupTimestamp(right as PickupLoadShape),
  );
}

function getPickupRawValue(load: PickupLoadShape): string | Date | null {
  if (!load) return null;
  if (load.pickupAptFrom) return load.pickupAptFrom;
  const pickup = getPrimaryPickupLocation(load);
  return pickup?.from || pickup?.to || null;
}

function formatApiDateTime(value: string | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Pickup date not set";

  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hourNum = d.getUTCHours();
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  const suffix = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${month}/${day}/${year}, ${hour12}:${minute} ${suffix}`;
}

export function formatPickupDateTime(load: PickupLoadShape): string {
  const value = getPickupRawValue(load);
  if (!value) return "Pickup date not set";
  return formatApiDateTime(value);
}

function isPastPickupLoad(load: PickupLoadShape, referenceDate: Date = new Date()): boolean {
  const schedule = getPickupScheduleBounds(load);
  if (!schedule) return false;
  return schedule.to.getTime() < referenceDate.getTime();
}

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
  return sortDriverLoadsByPickupDate(
    loads.filter((load) => !isDriverLoadCompleted(load) && !isPastPickupLoad(load as PickupLoadShape)),
  );
}
