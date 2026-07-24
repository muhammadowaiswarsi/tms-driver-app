import AsyncStorage from '@react-native-async-storage/async-storage';
import { customAxios } from './api';

export const TRACKING_SESSION_KEY = 'tracking_session_id';
export const TRACKING_INTERVAL_KEY = 'tracking_ping_interval_seconds';
const TRACKING_QUEUE_KEY = 'tracking_ping_queue';
const MAX_QUEUED_PINGS = 100;
export const DEFAULT_PING_INTERVAL_SECONDS = 300;

export type TrackingSession = {
  trackingSessionId: string;
  trackingMode: string;
  pingIntervalSeconds: number;
};

export type TrackingPingPayload = {
  trackingSessionId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedMph?: number;
  appState: 'foreground' | 'background';
};

export type LocationSnapshot = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
  };
};

export function normalizePingInterval(value: unknown): number {
  const interval = Number(value);
  return Number.isFinite(interval) && interval > 0
    ? Math.max(interval, 15)
    : DEFAULT_PING_INTERVAL_SECONDS;
}

export function toTrackingPing(
  location: LocationSnapshot,
  trackingSessionId: string,
  appState: TrackingPingPayload['appState'],
): TrackingPingPayload {
  return {
    trackingSessionId,
    timestamp: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
    speedMph:
      location.coords.speed == null ? undefined : location.coords.speed * 2.237,
    appState,
  };
}

export async function saveTrackingSession(session: TrackingSession): Promise<void> {
  await AsyncStorage.multiSet([
    [TRACKING_SESSION_KEY, session.trackingSessionId],
    [TRACKING_INTERVAL_KEY, String(normalizePingInterval(session.pingIntervalSeconds))],
  ]);
}

export async function getTrackingSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(TRACKING_SESSION_KEY);
}

export async function getTrackingInterval(): Promise<number> {
  return normalizePingInterval(await AsyncStorage.getItem(TRACKING_INTERVAL_KEY));
}

export async function clearTrackingSession(): Promise<void> {
  await AsyncStorage.multiRemove([TRACKING_SESSION_KEY, TRACKING_INTERVAL_KEY]);
}

async function readQueuedPings(): Promise<TrackingPingPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

async function writeQueuedPings(queue: TrackingPingPayload[]): Promise<void> {
  await AsyncStorage.setItem(
    TRACKING_QUEUE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUED_PINGS)),
  );
}

export async function queueTrackingPing(payload: TrackingPingPayload): Promise<void> {
  const queue = await readQueuedPings();
  queue.push(payload);
  await writeQueuedPings(queue);
}

export async function sendTrackingPing(payload: TrackingPingPayload): Promise<number> {
  const response = await customAxios.post('/tracking/ping', payload);
  const data = response.data?.data ?? response.data;
  const nextInterval = normalizePingInterval(data?.nextPingIntervalSeconds);

  return nextInterval;
}

export async function flushTrackingQueue(sessionId: string): Promise<void> {
  const queue = await readQueuedPings();
  if (!queue.length) return;

  const remaining: TrackingPingPayload[] = [];
  for (const payload of queue) {
    try {
      await sendTrackingPing({ ...payload, trackingSessionId: sessionId });
    } catch {
      remaining.push(payload);
      break;
    }
  }

  await writeQueuedPings(remaining);
}
