import { Platform } from "react-native";

// Conditional import for notifications (not available in Expo Go SDK 53+)
let Notifications: any = null;
try {
  if (Platform.OS !== "web") {
    Notifications = require("expo-notifications");
  }
} catch (error) {
  console.warn("expo-notifications not available, notification features disabled");
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

/**
 * Silent Guard - Notification Monitoring Service
 * Monitors payment app notifications for "Collect Request" scams
 * 
 * Note: Full notification monitoring requires native Android NotificationListenerService
 * This module provides the logic and UI framework that can be connected to native code
 */

const SILENT_GUARD_ENABLED_KEY = "shabari:silent_guard:enabled";
const MONITORED_APPS_KEY = "shabari:silent_guard:monitored_apps";

// Payment apps to monitor
export const PAYMENT_APPS = {
  PHONEPE: {
    id: "com.phonepe.app",
    name: "PhonePe",
    icon: "💳",
  },
  GPAY: {
    id: "com.google.android.apps.nbu.paisa.user",
    name: "Google Pay",
    icon: "💰",
  },
  PAYTM: {
    id: "net.one97.paytm",
    name: "Paytm",
    icon: "💵",
  },
} as const;

// Fraud patterns to detect in notifications
const FRAUD_PATTERNS = [
  /collect\s+request/i,
  /requested\s+money/i,
  /money\s+request/i,
  /payment\s+request/i,
  /refund\s+request/i,
  /cashback\s+request/i,
  /verification\s+payment/i,
  /confirm\s+payment/i,
];

// VPA extraction regex
const VPA_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/g;

/**
 * Check if Silent Guard is enabled
 */
export async function isSilentGuardEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(SILENT_GUARD_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    console.error("Error checking Silent Guard status:", error);
    return false;
  }
}

/**
 * Enable/Disable Silent Guard
 */
export async function setSilentGuardEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SILENT_GUARD_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error("Error setting Silent Guard status:", error);
  }
}

/**
 * Get list of monitored apps
 */
export async function getMonitoredApps(): Promise<string[]> {
  try {
    const apps = await AsyncStorage.getItem(MONITORED_APPS_KEY);
    return apps ? JSON.parse(apps) : Object.keys(PAYMENT_APPS);
  } catch (error) {
    console.error("Error getting monitored apps:", error);
    return Object.keys(PAYMENT_APPS);
  }
}

/**
 * Set list of monitored apps
 */
export async function setMonitoredApps(appIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MONITORED_APPS_KEY, JSON.stringify(appIds));
  } catch (error) {
    console.error("Error setting monitored apps:", error);
  }
}

/**
 * Check if notification contains fraud patterns
 */
export function detectFraudPattern(notificationText: string): boolean {
  return FRAUD_PATTERNS.some((pattern) => pattern.test(notificationText));
}

/**
 * Extract VPA from notification text
 */
export function extractVpaFromNotification(notificationText: string): string[] {
  const matches = notificationText.match(VPA_REGEX);
  return matches || [];
}

/**
 * Fire high-priority Shabari alert
 */
export async function fireSecurityAlert(params: {
  title: string;
  body: string;
  vpa?: string;
  app?: string;
}): Promise<void> {
  const { title, body, vpa, app } = params;

  try {
    // Haptic feedback
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Fire high-priority notification (skip if notifications not available)
    if (!Notifications) {
      console.warn("Notifications not available, logging alert only");
      await logSecurityAlert({
        title,
        body,
        vpa,
        app,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ${title}`,
        body,
        data: {
          type: "security_alert",
          vpa,
          app,
          timestamp: new Date().toISOString(),
        },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "security_alert",
      },
      trigger: null, // Immediate
    });

    // Log alert for history
    await logSecurityAlert({
      title,
      body,
      vpa,
      app,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error firing security alert:", error);
  }
}

/**
 * Log security alert to AsyncStorage
 */
async function logSecurityAlert(alert: {
  title: string;
  body: string;
  vpa?: string;
  app?: string;
  timestamp: string;
}): Promise<void> {
  try {
    const key = "shabari:security_alerts";
    const existingAlerts = await AsyncStorage.getItem(key);
    const alerts = existingAlerts ? JSON.parse(existingAlerts) : [];
    
    alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.splice(100);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(alerts));
  } catch (error) {
    console.error("Error logging security alert:", error);
  }
}

/**
 * Get security alert history
 */
export async function getSecurityAlerts(): Promise<Array<{
  title: string;
  body: string;
  vpa?: string;
  app?: string;
  timestamp: string;
}>> {
  try {
    const key = "shabari:security_alerts";
    const alerts = await AsyncStorage.getItem(key);
    return alerts ? JSON.parse(alerts) : [];
  } catch (error) {
    console.error("Error getting security alerts:", error);
    return [];
  }
}

/**
 * Process incoming notification (called by native module or link interception)
 */
export async function processNotification(params: {
  appPackage: string;
  title: string;
  text: string;
}): Promise<void> {
  const { appPackage, title, text } = params;

  // Check if Silent Guard is enabled
  const enabled = await isSilentGuardEnabled();
  if (!enabled) {
    return;
  }

  // Check if app is monitored
  const monitoredApps = await getMonitoredApps();
  const appKey = Object.keys(PAYMENT_APPS).find(
    (key) => PAYMENT_APPS[key as keyof typeof PAYMENT_APPS].id === appPackage
  );
  
  if (!appKey || !monitoredApps.includes(appKey)) {
    return;
  }

  // Detect fraud patterns
  const hasFraudPattern = detectFraudPattern(text);
  
  if (!hasFraudPattern) {
    return;
  }

  // Extract VPAs
  const vpas = extractVpaFromNotification(text);
  
  if (vpas.length === 0) {
    return;
  }

  // Check VPAs against blacklist
  // TODO: Call fraud detection API to check VPA
  const vpa = vpas[0];
  
  // For now, fire alert for any collect request
  await fireSecurityAlert({
    title: "Suspicious Payment Request Detected",
    body: `Do not tap! A collect request from ${vpa} was detected in ${PAYMENT_APPS[appKey as keyof typeof PAYMENT_APPS].name}. This may be a fake refund scam.`,
    vpa,
    app: PAYMENT_APPS[appKey as keyof typeof PAYMENT_APPS].name,
  });
}

/**
 * Request notification listener permission (Android only)
 */
export async function requestNotificationListenerPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  // Note: This requires native module to open system settings
  // For now, return false and show manual instructions
  return false;
}

/**
 * Check if notification listener permission is granted
 */
export async function hasNotificationListenerPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  // Note: This requires native module to check permission status
  // For now, return false
  return false;
}

/**
 * Configure notification channels for alerts
 */
export async function setupNotificationChannels(): Promise<void> {
  if (!Notifications) {
    console.warn("Notifications not available, skipping channel setup");
    return;
  }
  
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("security_alert", {
      name: "Security Alerts",
      description: "High-priority fraud and scam alerts from Shabari",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Set notification handler
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
}
