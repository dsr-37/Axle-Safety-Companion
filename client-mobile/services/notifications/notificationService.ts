import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Provide full behavior object to satisfy stricter typings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is deprecated in newer expo-notifications; specify banner/list explicitly
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    shouldShowInForeground: true,
    shouldSetNotificationCenter: true,
  }) as any,
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  static async getPushToken(): Promise<string | null> {
    // Remote push tokens are not supported in Expo Go (SDK 53+). Recommend using
    // a development build (EAS dev client) or standalone build for push tokens.
    if (Constants.appOwnership === 'expo') {
      console.warn('Push tokens are not available when running in Expo Go. Use a development build (EAS) or standalone app to receive push tokens.');
      return null;
    }

    const ok = await this.requestPermissions();
    if (!ok) return null;

    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return (token as any).data ?? null;
    } catch (error) {
      console.warn('Failed to obtain Expo push token (likely running in an environment without remote notifications):', error);
      return null;
    }
  }

  static async scheduleLocal(title: string, body: string | object) {
    // Normalize body so that objects are shown nicely rather than raw JSON
    const formattedBody = typeof body === 'string' ? body : (() => {
      try {
        // Prefer a compact readable summary if known shape
        const b = body as any;
        if (b.userName || b.userId) {
          return `${b.userName || b.userId} • ${b.userRole || ''}` + (b.location ? ` • ${b.location.latitude?.toFixed?.(5) || b.location.lat?.toFixed?.(5) || 'loc'}` : '');
        }
        return JSON.stringify(body);
      } catch (e) {
        return String(body);
      }
    })();

    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: formattedBody,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // immediate
    });
  }

  static async scheduleDailyReminder() {
    // Cancel all previous with this identifier if already scheduled
    // Expo SDK doesn’t support identifier filtering; keep simple for MVP
    await Notifications.cancelAllScheduledNotificationsAsync();

    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Safety Checklist',
        body: "Don't forget to complete your daily safety checklist!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }

  static async sendEmergencyAlert(body: string | object) {
    // Only schedule a local notification on the sender device; format body for readability
    return this.scheduleLocal('🆘 EMERGENCY ALERT', body);
  }
}
