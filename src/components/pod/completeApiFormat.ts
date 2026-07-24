import { parseDateMdYy, parseTimeAmPmOnDay } from "./dateTimeFormat";


export function toApiDateYmd(dateDisplay: string): string {
  const d = parseDateMdYy(dateDisplay);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toApiTime24h(timeDisplay: string): string {
  const t = timeDisplay.trim();
  if (!t) {
    return "00:00";
  }
  if (/^\d{1,2}:\d{2}$/i.test(t) && !/\s*([AP]M)\s*$/i.test(t)) {
    const [a, b] = t.split(":");
    return `${String(parseInt(a, 10)).padStart(2, "0")}:${String(
      parseInt(b, 10),
    ).padStart(2, "0")}`;
  }
  const d = parseTimeAmPmOnDay(t, new Date(2000, 0, 1));
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function normalizeSignatureDataUrl(dataUrl: string): string {
  const s = dataUrl.trim();
  if (!s) {
    return s;
  }
  if (s.startsWith("data:image/")) {
    return s;
  }
  return `data:image/png;base64,${s}`;
}
