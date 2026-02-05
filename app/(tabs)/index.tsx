import { useState, useEffect, useCallback } from "react";
import { ScrollView, Text, View, Pressable, Platform, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getScanStats, getRecentScans } from "@/lib/scan-history";
import type { ScanStats, ScanRecord } from "@/shared/types";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  
  const [stats, setStats] = useState<ScanStats>({
    totalScans: 0,
    scansToday: 0,
    threatsBlocked: 0,
    greenScans: 0,
    yellowScans: 0,
    redScans: 0,
  });
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, recentData] = await Promise.all([
        getScanStats(),
        getRecentScans(5),
      ]);
      setStats(statsData);
      setRecentScans(recentData);
    } catch (error) {
      console.error("Error loading home data:", error);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScanPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/(tabs)/scanner");
  };

  const handleScanCardPress = (scanId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Navigate to scan detail screen
    console.log("View scan detail:", scanId);
  };

  const handleSafeBrowserPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/safe-browser");
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case "green":
        return colors.success;
      case "yellow":
        return colors.warning;
      case "red":
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="flex-1 p-6 gap-6">
          {/* Header Section */}
          <View className="items-center gap-2 pt-4">
            <IconSymbol name="shield.fill" size={48} color={colors.primary} />
            <Text className="text-3xl font-bold text-foreground">Shabari</Text>
            <Text className="text-base text-muted text-center">
              Your trusted UPI fraud protection
            </Text>
          </View>

          {/* Status Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-3 h-3 rounded-full bg-success" />
              <Text className="text-lg font-semibold text-foreground">
                Active Protection
              </Text>
            </View>
            <Text className="text-sm text-muted">
              Your device is protected from UPI fraud and phishing scams
            </Text>
          </View>

          {/* Scan Button */}
          <View className="items-center py-8">
            <Pressable
              onPress={handleScanPress}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="w-40 h-40 rounded-full bg-primary items-center justify-center shadow-lg">
                <IconSymbol name="qrcode" size={64} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text className="text-xl font-semibold text-foreground mt-4">
              Scan QR Code
            </Text>
            <Text className="text-sm text-muted mt-1">
              Verify payment before you pay
            </Text>
          </View>

          {/* Quick Actions */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              {/* Safe Browser */}
              <Pressable
                onPress={handleSafeBrowserPress}
                style={({ pressed }) => [
                  { flex: 1, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View className="bg-surface rounded-xl p-4 border border-border items-center gap-2">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <IconSymbol name="globe" size={24} color={colors.primary} />
                  </View>
                  <Text className="text-sm font-semibold text-foreground text-center">
                    Safe Browser
                  </Text>
                  <Text className="text-xs text-muted text-center">
                    Browse securely
                  </Text>
                </View>
              </Pressable>

              {/* Link Checker */}
              <Pressable
                onPress={() => router.push("/link-check")}
                style={({ pressed }) => [
                  { flex: 1, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View className="bg-surface rounded-xl p-4 border border-border items-center gap-2">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${colors.warning}20` }}
                  >
                    <IconSymbol name="link" size={24} color={colors.warning} />
                  </View>
                  <Text className="text-sm font-semibold text-foreground text-center">
                    Check Link
                  </Text>
                  <Text className="text-xs text-muted text-center">
                    Scan any URL
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Statistics Cards */}
          <View className="flex-row gap-4">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-foreground">
                {stats.scansToday}
              </Text>
              <Text className="text-sm text-muted mt-1">Scans Today</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-error">
                {stats.threatsBlocked}
              </Text>
              <Text className="text-sm text-muted mt-1">Threats Blocked</Text>
            </View>
          </View>

          {/* Recent Activity Section */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">
                Recent Activity
              </Text>
              {recentScans.length > 0 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/history")}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text className="text-sm text-primary font-semibold">
                    View All
                  </Text>
                </Pressable>
              )}
            </View>

            {recentScans.length === 0 ? (
              <View className="bg-surface rounded-xl p-6 border border-border items-center">
                <IconSymbol name="clock.fill" size={32} color={colors.muted} />
                <Text className="text-sm text-muted mt-2">No recent scans</Text>
                <Text className="text-xs text-muted mt-1">
                  Tap the scan button to get started
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {recentScans.map((scan) => (
                  <Pressable
                    key={scan.id}
                    onPress={() => handleScanCardPress(scan.id)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center gap-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${getRiskColor(scan.riskTier)}20` }}
                      >
                        <IconSymbol
                          name={
                            scan.riskTier === "green"
                              ? "checkmark.circle.fill"
                              : scan.riskTier === "yellow"
                              ? "exclamationmark.triangle.fill"
                              : "xmark.circle.fill"
                          }
                          size={20}
                          color={getRiskColor(scan.riskTier)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {scan.merchantName}
                        </Text>
                        <Text className="text-sm text-muted" numberOfLines={1}>
                          {scan.vpa}
                          {scan.amount && ` • ₹${scan.amount}`}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-muted">
                          {formatTimestamp(scan.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
