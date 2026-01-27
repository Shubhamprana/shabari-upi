import { useState, useEffect } from "react";
import { View, Text, ScrollView, Switch, TouchableOpacity, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import {
  isSilentGuardEnabled,
  setSilentGuardEnabled,
  getMonitoredApps,
  setMonitoredApps,
  PAYMENT_APPS,
  setupNotificationChannels,
  getSecurityAlerts,
} from "@/lib/silent-guard";

export default function SilentGuardSettingsScreen() {
  const colors = useColors();
  const [enabled, setEnabled] = useState(false);
  const [monitoredApps, setMonitoredAppsState] = useState<string[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    setupNotificationChannels();
  }, []);

  async function loadSettings() {
    try {
      const isEnabled = await isSilentGuardEnabled();
      const apps = await getMonitoredApps();
      const alerts = await getSecurityAlerts();
      
      setEnabled(isEnabled);
      setMonitoredAppsState(apps);
      setAlertCount(alerts.length);
    } catch (error) {
      console.error("Error loading Silent Guard settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSilentGuard(value: boolean) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (value) {
        // Show permission instructions
        Alert.alert(
          "Enable Silent Guard",
          "Silent Guard monitors payment app notifications for suspicious collect requests. To enable:\n\n1. Tap 'Open Settings' below\n2. Find 'Shabari' in the list\n3. Enable notification access\n4. Return to the app",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
      }
      
      await setSilentGuardEnabled(value);
      setEnabled(value);
    } catch (error) {
      console.error("Error toggling Silent Guard:", error);
    }
  }

  async function toggleApp(appKey: string) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const newApps = monitoredApps.includes(appKey)
        ? monitoredApps.filter((key) => key !== appKey)
        : [...monitoredApps, appKey];
      
      await setMonitoredApps(newApps);
      setMonitoredAppsState(newApps);
    } catch (error) {
      console.error("Error toggling app:", error);
    }
  }

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start" }}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          
          <Text className="text-3xl font-bold text-foreground mt-4">
            Silent Guard
          </Text>
          <Text className="text-muted mt-2">
            Real-time protection against collect request scams
          </Text>
        </View>

        {/* Status Card */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-foreground">
              {enabled ? "🛡️ Active Protection" : "⚠️ Protection Disabled"}
            </Text>
            <Switch
              value={enabled}
              onValueChange={toggleSilentGuard}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <Text className="text-sm text-muted">
            {enabled
              ? "Monitoring payment app notifications for suspicious activity"
              : "Enable to protect against collect request scams"}
          </Text>
        </View>

        {/* Alert History */}
        <TouchableOpacity
          className="bg-surface rounded-2xl p-4 mb-4 border border-border"
          onPress={() => router.push("/alert-history")}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-semibold text-foreground">
                Alert History
              </Text>
              <Text className="text-sm text-muted mt-1">
                {alertCount} {alertCount === 1 ? "alert" : "alerts"} blocked
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Monitored Apps */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Monitored Apps
          </Text>
          
          {Object.entries(PAYMENT_APPS).map(([key, app]) => (
            <View
              key={key}
              className="bg-surface rounded-xl p-4 mb-2 border border-border"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Text className="text-2xl mr-3">{app.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">
                      {app.name}
                    </Text>
                    <Text className="text-sm text-muted">
                      {monitoredApps.includes(key) ? "Monitoring enabled" : "Not monitored"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={monitoredApps.includes(key)}
                  onValueChange={() => toggleApp(key)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                  disabled={!enabled}
                />
              </View>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            How Silent Guard Works
          </Text>
          
          <View className="mb-3">
            <Text className="text-sm font-medium text-foreground mb-1">
              1. Monitors Notifications
            </Text>
            <Text className="text-sm text-muted">
              Watches for collect request notifications from payment apps
            </Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-sm font-medium text-foreground mb-1">
              2. Detects Fraud Patterns
            </Text>
            <Text className="text-sm text-muted">
              Identifies suspicious keywords like "refund request" or "verification payment"
            </Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-sm font-medium text-foreground mb-1">
              3. Checks Blacklist
            </Text>
            <Text className="text-sm text-muted">
              Verifies VPA against known scammer database
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-foreground mb-1">
              4. Instant Alert
            </Text>
            <Text className="text-sm text-muted">
              Fires high-priority warning before you can tap the notification
            </Text>
          </View>
        </View>

        {/* Privacy Notice */}
        <View className="bg-surface rounded-2xl p-4 mb-6 border border-border">
          <Text className="text-base font-semibold text-foreground mb-2">
            🔒 Privacy & Security
          </Text>
          <Text className="text-sm text-muted leading-relaxed">
            Silent Guard only reads notification content from payment apps. No personal data is stored or transmitted. All VPA checks use SHA-256 hashing (DPDP Act 2023 compliant).
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
