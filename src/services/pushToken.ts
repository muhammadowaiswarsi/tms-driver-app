import { Platform } from "react-native";
import { customAxios } from "./api";

export const ANDROID_DEFAULT_CHANNEL_ID = "default";

export type PushTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string; error?: unknown };

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  const Notifications = await import("expo-notifications");
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

async function ensurePushPermissions(): Promise<boolean> {
  const Notifications = await import("expo-notifications");
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function getDevicePushToken(): Promise<string> {
  const Notifications = await import("expo-notifications");
  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

async function registerFcmToken(fcmToken: string): Promise<void> {
  await customAxios({
    method: "POST",
    url: "/auth/fcm-token",
    data: { fcmToken, platform: Platform.OS },
  });
}

/**
 * Full setup:
 * - checks physical device (required)
 * - creates Android channel
 * - requests permissions
 * - obtains native device push token (FCM on Android)
 * - syncs token to backend
 */
export async function setupPushTokenAndSync(): Promise<PushTokenResult> {
  try {
    const Device = await import("expo-device");
    if (!Device.isDevice) {
      return {
        ok: false,
        reason: "Push notifications require a physical device",
      };
    }

    await ensureAndroidChannel();

    const granted = await ensurePushPermissions();
    if (!granted) {
      return { ok: false, reason: "Push notification permission denied" };
    }

    const token = await getDevicePushToken();
    console.log("token", token);
    if (!token) {
      return { ok: false, reason: "Device push token empty" };
    }

    await registerFcmToken(token);
    return { ok: true, token };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      Platform.OS === "android" &&
      msg.toLowerCase().includes("default firebaseapp is not initialized")
    ) {
      return {
        ok: false,
        reason:
          "Firebase is not initialized in this Android build. Ensure google-services.json exists at project root and rebuild the dev client.",
        error,
      };
    }
    return { ok: false, reason: msg || "Failed to setup push token", error };
  }
}
