import React, { useState, useEffect } from "react";
import { Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getBackendStatus, refreshBackendStatus } from "@/lib/hybrid-fraud-detection";

export default function BackendSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [status, setStatus] = useState<{
    available: boolean;
    lastChecked: number;
    mode: "online" | "offline";
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const currentStatus = await getBackendStatus();
    setStatus(currentStatus);
  };

  const handleRefresh = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsRefreshing(true);
    await refreshBackendStatus();
    await loadStatus();
    setIsRefreshing(false);
  };

  const formatLastChecked = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 p-6 gap-6">
        {/* Header */}
        <View className="flex-row items-center gap-4 mb-4">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.95 : 1 }],
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <IconSymbol name="chevron.left" size={28} color={colors.foreground} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">
            Backend Connection
          </Text>
        </View>

        {/* Connection Status Card */}
        <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">
              Connection Status
            </Text>
            {status && (
              <View
                className={`px-3 py-1 rounded-full ${
                  status.available ? "bg-success/20" : "bg-muted/20"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    status.available ? "text-success" : "text-muted"
                  }`}
                >
                  {status.mode === "online" ? "● Online" : "● Offline"}
                </Text>
              </View>
            )}
          </View>

          {status && (
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Last Checked</Text>
                <Text className="text-sm text-foreground">
                  {formatLastChecked(status.lastChecked)}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm text-muted">Protection Mode</Text>
                <Text className="text-sm text-foreground">
                  {status.available
                    ? "✓ Real-time threat intelligence with Google Safe Browsing & VirusTotal"
                    : "📱 Local pattern-based detection"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Refresh Button */}
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View className="bg-primary px-6 py-4 rounded-xl flex-row items-center justify-center gap-2">
            {isRefreshing ? (
              <ActivityIndicator color="white" />
            ) : (
              <IconSymbol name="arrow.clockwise" size={20} color="white" />
            )}
            <Text className="text-white font-semibold text-base">
              {isRefreshing ? "Checking..." : "Refresh Status"}
            </Text>
          </View>
        </Pressable>

        {/* Info Section */}
        <View className="bg-surface/50 rounded-xl p-4 gap-3">
          <Text className="text-sm font-semibold text-foreground">
            How It Works
          </Text>
          <Text className="text-sm text-muted leading-relaxed">
            Shabari automatically tries to connect to the backend server for enhanced protection. When online, you get real-time phishing detection, malware scanning, and access to the latest fraud database. When offline, the app uses local pattern detection to keep you protected.
          </Text>
        </View>

        {/* Backend URL Info */}
        <View className="bg-surface/50 rounded-xl p-4 gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Backend API URL
          </Text>
          <Text className="text-xs text-muted font-mono">
            {process.env.EXPO_PUBLIC_API_BASE_URL || "https://shabari-upi.onrender.com"}
          </Text>
          <Text className="text-xs text-muted leading-relaxed mt-2">
            The backend server must be deployed and publicly accessible for online protection to work. Contact your administrator to deploy the server.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
