import * as TaskManager from 'expo-task-manager';
import {
  flushTrackingQueue,
  getTrackingSessionId,
  queueTrackingPing,
  sendTrackingPing,
  toTrackingPing,
} from './tracking.shared';

export const DRIVER_LOCATION_TASK = 'TMS_DRIVER_BACKGROUND_LOCATION';

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      speed: number | null;
      heading: number | null;
    };
    timestamp: number;
  }[] })?.locations;

  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const sessionId = await getTrackingSessionId();
  if (!sessionId) return;

  const payload = toTrackingPing(latest, sessionId, 'background');

  try {
    await sendTrackingPing(payload);
    await flushTrackingQueue(sessionId);
  } catch {
    await queueTrackingPing(payload);
  }
});
