type GeocodedPoint = {
  latitude: number;
  longitude: number;
};

const cache = new Map<string, GeocodedPoint | null>();

function normalizeQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}


export async function geocodeAddress(address?: string | null): Promise<GeocodedPoint | null> {
  const query = (address || '').trim();
  if (!query) return null;

  const key = normalizeQuery(query);
  if (cache.has(key)) return cache.get(key) ?? null;

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  let point: GeocodedPoint | null = null;

  if (mapboxToken) {
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?access_token=${encodeURIComponent(mapboxToken)}&limit=1&types=address,poi,place,locality,neighborhood`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const feature = data?.features?.[0];
        const coords = feature?.center;
        if (Array.isArray(coords) && coords.length >= 2) {
          point = { longitude: Number(coords[0]), latitude: Number(coords[1]) };
        }
      }
    } catch {
    }
  }

  if (!point) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TMSDriverApp/1.0 (driver-tracking)',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : null;
        if (first?.lat != null && first?.lon != null) {
          point = {
            latitude: Number(first.lat),
            longitude: Number(first.lon),
          };
        }
      }
    } catch {
      point = null;
    }
  }

  if (
    point &&
    (!Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      (point.latitude === 0 && point.longitude === 0))
  ) {
    point = null;
  }

  cache.set(key, point);
  return point;
}

export function markerTypeFromEventType(eventType?: string): 'pickup' | 'delivery' | 'stop' {
  const t = (eventType || '').toUpperCase();
  if (
    t.includes('PICKUP') ||
    t.includes('HOOK') ||
    t.includes('PULL') ||
    t.includes('ORIGIN')
  ) {
    return 'pickup';
  }
  if (
    t.includes('DELIVERY') ||
    t.includes('DROPOFF') ||
    t.includes('DROP') ||
    t.includes('DESTINATION') ||
    t.includes('UNLOAD')
  ) {
    return 'delivery';
  }
  return 'stop';
}
