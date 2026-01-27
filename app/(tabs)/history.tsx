import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getScanHistory,
  filterScanHistory,
  searchScanHistory,
  deleteScanRecord,
} from "@/lib/scan-history";
import type { ScanRecord } from "@/shared/types";

type FilterType = "all" | "green" | "yellow" | "red";

export default function HistoryScreen() {
  const colors = useColors();
  
  const [allScans, setAllScans] = useState<ScanRecord[]>([]);
  const [displayedScans, setDisplayedScans] = useState<ScanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const scans = await getScanHistory();
      setAllScans(scans);
      applyFilters(scans, activeFilter, searchQuery);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const applyFilters = (
    scans: ScanRecord[],
    filter: FilterType,
    query: string
  ) => {
    let filtered = scans;

    // Apply tier filter
    if (filter !== "all") {
      filtered = filtered.filter((scan) => scan.riskTier === filter);
    }

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter((scan) => {
        const merchantMatch = scan.merchantName.toLowerCase().includes(lowerQuery);
        const vpaMatch = scan.vpa.toLowerCase().includes(lowerQuery);
        return merchantMatch || vpaMatch;
      });
    }

    setDisplayedScans(filtered);
  };

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  // Apply filters when search or filter changes
  useEffect(() => {
    applyFilters(allScans, activeFilter, searchQuery);
  }, [activeFilter, searchQuery, allScans]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleFilterPress = (filter: FilterType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveFilter(filter);
  };

  const handleScanPress = (scanId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Navigate to scan detail screen
    console.log("View scan detail:", scanId);
  };

  const handleDeleteScan = async (scanId: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      await deleteScanRecord(scanId);
      await loadHistory();
    } catch (error) {
      console.error("Error deleting scan:", error);
    }
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

  const renderScanCard = ({ item }: { item: ScanRecord }) => (
    <Pressable
      onPress={() => handleScanPress(item.id)}
      onLongPress={() => handleDeleteScan(item.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View className="bg-surface rounded-xl p-4 border border-border mb-2">
        <View className="flex-row items-center gap-3">
          {/* Risk Indicator */}
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: `${getRiskColor(item.riskTier)}20` }}
          >
            <IconSymbol
              name={
                item.riskTier === "green"
                  ? "checkmark.circle.fill"
                  : item.riskTier === "yellow"
                  ? "exclamationmark.triangle.fill"
                  : "xmark.circle.fill"
              }
              size={24}
              color={getRiskColor(item.riskTier)}
            />
          </View>

          {/* Scan Details */}
          <View className="flex-1">
            <Text
              className="text-base font-semibold text-foreground"
              numberOfLines={1}
            >
              {item.merchantName}
            </Text>
            <Text className="text-sm text-muted mt-1" numberOfLines={1}>
              {item.vpa}
            </Text>
            {item.amount && (
              <Text className="text-sm font-semibold text-foreground mt-1">
                ₹{item.amount}
              </Text>
            )}
          </View>

          {/* Timestamp and Score */}
          <View className="items-end gap-1">
            <Text className="text-xs text-muted">
              {formatTimestamp(item.timestamp)}
            </Text>
            <View
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: `${getRiskColor(item.riskTier)}20` }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: getRiskColor(item.riskTier) }}
              >
                {item.riskScore}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 p-6 gap-4">
        {/* Header */}
        <Text className="text-2xl font-bold text-foreground">Scan History</Text>

        {/* Search Bar */}
        <View className="bg-surface rounded-xl px-4 py-3 border border-border flex-row items-center gap-3">
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            className="flex-1 text-base text-foreground"
            placeholder="Search merchant or VPA"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2">
          {(["all", "green", "yellow", "red"] as FilterType[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => handleFilterPress(filter)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                className={`px-4 py-2 rounded-full border ${
                  activeFilter === filter
                    ? "border-primary bg-primary"
                    : "border-border bg-surface"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    activeFilter === filter ? "text-white" : "text-foreground"
                  }`}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "green"
                    ? "Safe"
                    : filter === "yellow"
                    ? "Caution"
                    : "Danger"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Scan List */}
        {displayedScans.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <IconSymbol name="clock.fill" size={64} color={colors.muted} />
            <Text className="text-base text-muted mt-4">
              {searchQuery || activeFilter !== "all"
                ? "No scans found"
                : "No scan history yet"}
            </Text>
            <Text className="text-sm text-muted mt-2 text-center">
              {searchQuery || activeFilter !== "all"
                ? "Try adjusting your filters"
                : "Your scanned QR codes will appear here"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedScans}
            renderItem={renderScanCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              <View className="mb-2">
                <Text className="text-sm text-muted">
                  {displayedScans.length} scan{displayedScans.length !== 1 ? "s" : ""}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}
