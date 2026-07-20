import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { customAxios } from './api';

const SESSION_KEY = 'tracking_session_id';
const QUEUE_KEY = 'tracking_ping_queue';

/** Emulator/dev fallback near SF when native GPS module is not in the build yet. */
const DEV_FALLBACK_COORDS = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracyMeters: 50,
  speedMph: 0,
};

type TrackingSession = {
  trackingSessionId: string;
  trackingMode: string;
  pingIntervalSeconds: number;
};

type PingPayload = {
  trackingSessionId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedMph?: number;
  appState?: string;
};

let pingTimer: ReturnType<typeof setInterval> | null = null;
let sessionPromise: Promise<TrackingSession> | null = null;
let gpsUnavailableLogged = false;

function hasNativeGpsModule(): boolean {
  try {
    return requireOptionalNativeModule('ExpoLocation') != null;
  } catch {
    return false;
  }
}

async function saveSession(session: TrackingSession) {
  await AsyncStorage.setItem(SESSION_KEY, session.trackingSessionId);
  await AsyncStorage.setItem(`${SESSION_KEY}:interval`, String(session.pingIntervalSeconds));
}

async function getSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

async function getInterval(): Promise<number> {
  const value = await AsyncStorage.getItem(`${SESSION_KEY}:interval`);
  return value ? Number(value) : 300;
}

async function readQueue(): Promise<PingPayload[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: PingPayload[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function queuePing(payload: PingPayload) {
  const queue = await readQueue();
  queue.push(payload);
  await writeQueue(queue);
}

async function sendPing(payload: PingPayload): Promise<number> {
  console.log('[Tracking] POST /tracking/ping', {
    lat: payload.latitude,
    lng: payload.longitude,
  });
  const response = await customAxios.post('/tracking/ping', payload);
  const data = response.data?.data ?? response.data;
  return data?.nextPingIntervalSeconds ?? 300;
}

async function flushQueue(sessionId: string) {
  const queue = await readQueue();
  if (!queue.length) return;

  const remaining: PingPayload[] = [];
  for (const item of queue) {
    try {
      await sendPing({ ...item, trackingSessionId: sessionId });
    } catch {
      remaining.push(item);
      break;
    }
  }
  await writeQueue(remaining);
}

async function collectLocation(): Promise<Omit<PingPayload, 'trackingSessionId'> | null> {
  if (hasNativeGpsModule()) {
    try {
      const {
        requestForegroundPermissionsAsync,
        getCurrentPositionAsync,
        Accuracy,
      } = await import('expo-location');

      const { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Tracking] Location permission denied');
        return null;
      }

      const location = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
      return {
        timestamp: new Date(location.timestamp).toISOString(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy ?? undefined,
        speedMph: location.coords.speed != null ? location.coords.speed * 2.237 : undefined,
        appState: 'foreground',
      };
    } catch (error) {
      console.warn('[Tracking] Native GPS failed:', error);
    }
  } else if (!gpsUnavailableLogged) {
    gpsUnavailableLogged = true;
    console.warn(
      '[Tracking] Native ExpoLocation missing — using DEV fallback coordinates until you run: npx expo run:android',
    );
  }

  // Dev/emulator fallback so tracking can be tested without a rebuilt native binary.
  if (__DEV__) {
    return {
      timestamp: new Date().toISOString(),
      ...DEV_FALLBACK_COORDS,
      appState: 'foreground',
    };
  }

  return null;
}

async function trySendGpsPing(sessionId: string): Promise<boolean> {
  const coords = await collectLocation();
  if (!coords) return false;

  const payload: PingPayload = {
    trackingSessionId: sessionId,
    ...coords,
  };

  try {
    const nextInterval = await sendPing(payload);
    await AsyncStorage.setItem(`${SESSION_KEY}:interval`, String(nextInterval));
    await flushQueue(sessionId);
    schedulePingLoop(nextInterval);
    return true;
  } catch (error) {
    console.warn('[Tracking] Ping failed, queued offline:', error);
    await queuePing(payload);
    return false;
  }
}

function schedulePingLoop(intervalSeconds: number) {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    getSessionId().then((sessionId) => {
      if (sessionId) trySendGpsPing(sessionId);
    });
  }, Math.max(intervalSeconds, 15) * 1000);
}

async function createTrackingSession(): Promise<TrackingSession> {
  const existingId = await getSessionId();
  if (existingId) {
    return {
      trackingSessionId: existingId,
      trackingMode: 'IDLE_TRACKING',
      pingIntervalSeconds: await getInterval(),
    };
  }

  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    console.log('[Tracking] POST /tracking/start');
    const response = await customAxios.post('/tracking/start');
    const session: TrackingSession = response.data?.data ?? response.data;
    await saveSession(session);
    schedulePingLoop(session.pingIntervalSeconds);
    return session;
  })();

  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

/** Login → start backend session, then send GPS (or DEV fallback) ping. */
export async function ensureDriverTracking(): Promise<void> {
  const session = await createTrackingSession();
  await trySendGpsPing(session.trackingSessionId);
}

export async function startDriverTracking(): Promise<void> {
  await ensureDriverTracking();
}

export async function stopDriverTracking(): Promise<void> {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  gpsUnavailableLogged = false;
  try {
    console.log('[Tracking] POST /tracking/stop');
    await customAxios.post('/tracking/stop');
  } finally {
    await AsyncStorage.multiRemove([SESSION_KEY, `${SESSION_KEY}:interval`]);
  }
}

export async function resumeDriverTrackingIfNeeded(): Promise<void> {
  const sessionId = await getSessionId();
  if (!sessionId) return;
  schedulePingLoop(await getInterval());
  await trySendGpsPing(sessionId);
}
