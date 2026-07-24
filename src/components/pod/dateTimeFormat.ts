
export function formatDateMdYy(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export function formatTimeAmPm(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function parseDateMdYy(s: string): Date {
  const fallback = new Date();
  if (!s?.trim()) {
    return fallback;
  }
  const m = s
    .trim()
    .match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!m) {
    return fallback;
  }
  let y = parseInt(m[3], 10);
  if (y < 100) {
    y += 2000;
  }
  return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
}

export function parseTimeAmPmOnDay(timeStr: string, day: Date): Date {
  const base = new Date(day);
  const t = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!t) {
    base.setHours(9, 0, 0, 0);
    return base;
  }
  let h = parseInt(t[1], 10);
  const min = parseInt(t[2], 10);
  const ap = t[3].toUpperCase();
  if (ap === "PM" && h < 12) {
    h += 12;
  }
  if (ap === "AM" && h === 12) {
    h = 0;
  }
  base.setHours(h, min, 0, 0);
  return base;
}
