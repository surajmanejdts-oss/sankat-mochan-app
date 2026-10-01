import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/api";

/**
 * Expo Go (SDK 53+) no longer supports Android remote push notifications.
 * We therefore load expo-notifications only inside a development/production
 * build, after checking that the app is not running inside Expo Go.
 */
function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export async function registerForPushNotifications(token: string | null) {
  if (!token || isExpoGo()) {
    if (isExpoGo()) {
      console.log(
        "Push registration skipped: Expo Go does not support Android remote push notifications. Use an EAS development build for phone push notifications."
      );
    }
    return;
  }

  try {
    // Dynamic import is intentional: importing expo-notifications at module
    // load time causes Expo Go to throw before the application can render.
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("important", {
        name: "Important notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default"
      });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        "Push notifications: EAS projectId is not configured yet."
      );
      return;
    }

    const expoToken = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    await apiFetch(
      "/notifications/push-token",
      {
        method: "POST",
        body: JSON.stringify({
          token: expoToken,
          platform: Platform.OS
        })
      },
      token
    );
  } catch (error) {
    // Notification setup should never prevent login or the rest of the app
    // from working.
    console.warn("Push notification registration skipped:", error);
  }
}
