import { AppState, type AppStateStatus } from 'react-native';
import { customAxios } from './api';
import { DRIVER_LOCATION_TASK } from './backgroundLocationTask';
import {
  clearTrackingSession,
  flushTrackingQueue,
  getTrackingInterval,
  getTrackingSessionId,
  normalizePingInterval,
  queueTrackingPing,
  saveTrackingSession,
  sendTrackingPing,
  toTrackingPing,
  type TrackingSession,
} from './tracking.shared';

let pingTimer: ReturnType<typeof setInterval> | null = null;
let sessionPromise: Promise<TrackingSession> | null = null;
let pingInFlight = false;
let appStateSub: { remove: () => void } | null = null;
let backgroundIntervalSeconds: number | null = null;

function getAppState(): 'foreground' | 'background' {
  const state: AppStateStatus = AppState.currentState;
  return state === 'active' ? 'foreground' : 'background';
}

async function getForegroundLocation() {
  const Location = await import('expo-location');
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status !== 'granted') {
    return null;
  }

  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    const lastKnownLocation = await Location.getLastKnownPositionAsync();
    if (lastKnownLocation) return lastKnownLocation;
    return null;
  }
}

async function sendCurrentLocation(sessionId: string): Promise<boolean> {
  if (pingInFlight) return false;
  pingInFlight = true;

  try {
    const location = await getForegroundLocation();
    if (!location) return false;
    const payload = toTrackingPing(location, sessionId, getAppState());
    try {
      const nextInterval = await sendTrackingPing(payload);
      await saveTrackingSession({
        trackingSessionId: sessionId,
        trackingMode: 'UNKNOWN',
        pingIntervalSeconds: nextInterval,
      });
      await flushTrackingQueue(sessionId);
      scheduleForegroundPing(nextInterval);
      await startBackgroundUpdates(nextInterval);
      return true;
    } catch {
      await queueTrackingPing(payload);
      return false;
    }
  } finally {
    pingInFlight = false;
  }
}

function scheduleForegroundPing(intervalSeconds: number): void {
  const intervalMs = normalizePingInterval(intervalSeconds) * 1000;
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    if (AppState.currentState !== 'active') return;
    getTrackingSessionId().then((sessionId) => {
      if (sessionId) void sendCurrentLocation(sessionId);
    });
  }, intervalMs);
}


async function startBackgroundUpdates(intervalSeconds: number): Promise<void> {
  try {
    const Location = await import('expo-location');
    const TaskManager = await import('expo-task-manager');

    let fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      fg = await Location.requestForegroundPermissionsAsync();
    }
    if (fg.status !== 'granted') {
      return;
    }

    
    
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {}

    const requestedIntervalSeconds = normalizePingInterval(intervalSeconds);
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_LOCATION_TASK,
    );
    if (
      alreadyStarted &&
      backgroundIntervalSeconds === requestedIntervalSeconds
    ) {
      return;
    }

    const isTaskDefined = await TaskManager.isTaskDefined(DRIVER_LOCATION_TASK);
    if (!isTaskDefined) {
      return;
    }

    
    
    
    if (alreadyStarted) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }

    const timeIntervalMs = requestedIntervalSeconds * 1000;

    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: timeIntervalMs,
      
      distanceInterval: 0,
      deferredUpdatesInterval: timeIntervalMs,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      
      
      
      foregroundService: {
        notificationTitle: 'TMS Driver — Live tracking',
        notificationBody: 'Sharing your location with dispatch',
        notificationColor: '#2563eb',
        killServiceOnDestroy: false,
      },
    });

    backgroundIntervalSeconds = requestedIntervalSeconds;
  } catch {}
}

async function stopBackgroundUpdates(): Promise<void> {
  try {
    const Location = await import('expo-location');
    const started = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_LOCATION_TASK,
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
    backgroundIntervalSeconds = null;
  } catch {}
}

function ensureAppStateListener() {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      getTrackingSessionId().then((sessionId) => {
        if (sessionId) void sendCurrentLocation(sessionId);
      });
    }
  });
}

async function createTrackingSession(): Promise<TrackingSession> {
  const existingId = await getTrackingSessionId();
  if (existingId) {
    return {
      trackingSessionId: existingId,
      trackingMode: 'IDLE_TRACKING',
      pingIntervalSeconds: await getTrackingInterval(),
    };
  }

  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const response = await customAxios.post('/tracking/start');
    const session: TrackingSession = response.data?.data ?? response.data;
    await saveTrackingSession(session);
    return session;
  })();

  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}


export async function ensureDriverTracking(): Promise<void> {
  ensureAppStateListener();
  const session = await createTrackingSession();
  
  scheduleForegroundPing(session.pingIntervalSeconds);
  await startBackgroundUpdates(session.pingIntervalSeconds);
  await sendCurrentLocation(session.trackingSessionId);
}

export async function startDriverTracking(): Promise<void> {
  await ensureDriverTracking();
}

export async function stopDriverTracking(): Promise<void> {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  pingInFlight = false;
  backgroundIntervalSeconds = null;
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  await stopBackgroundUpdates();
  try {
    await customAxios.post('/tracking/stop');
  } finally {
    await clearTrackingSession();
  }
}

export async function resumeDriverTrackingIfNeeded(): Promise<void> {
  const sessionId = await getTrackingSessionId();
  if (!sessionId) return;
  ensureAppStateListener();
  const interval = await getTrackingInterval();
  scheduleForegroundPing(interval);
  await startBackgroundUpdates(interval);
  await sendCurrentLocation(sessionId);
}
