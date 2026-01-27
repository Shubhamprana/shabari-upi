import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getSecurityAlerts } from "@/lib/silent-guard";

type SecurityAlert = {
  title: string;
  body: string;
  vpa?: string;
  app?: string;
  timestamp: string;
};

export default function AlertHistoryScreen() {
  const colors = useColors();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const data = await getSecurityAlerts();
      setAlerts(data);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }

  function formatTimestamp(timestamp: string): string {
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
  }

  function renderAlert({ item }: { item: SecurityAlert }) {
    return (
      <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-foreground">
              {item.title}
            </Text>
            <Text className="text-sm text-muted mt-1">
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          <Text className="text-2xl">🚨</Text>
        </View>
        
        <Text className="text-sm text-foreground leading-relaxed mb-3">
          {item.body}
        </Text>
        
        {item.vpa && (
          <View className="bg-background rounded-lg p-2 mb-2">
            <Text className="text-xs text-muted">VPA</Text>
            <Text className="text-sm font-mono text-foreground">{item.vpa}</Text>
          </View>
        )}
        
        {item.app && (
          <View className="bg-background rounded-lg p-2">
            <Text className="text-xs text-muted">Source App</Text>
            <Text className="text-sm text-foreground">{item.app}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1 p-4">
        {/* Header */}
        <View className="mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start" }}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          
          <Text className="text-3xl font-bold text-foreground mt-4">
            Alert History
          </Text>
          <Text className="text-muted mt-2">
            {alerts.length} {alerts.length === 1 ? "threat" : "threats"} blocked
          </Text>
        </View>

        {/* Alert List */}
        {alerts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-6xl mb-4">🛡️</Text>
            <Text className="text-lg font-semibold text-foreground mb-2">
              No Alerts Yet
            </Text>
            <Text className="text-sm text-muted text-center px-8">
              Silent Guard is protecting you. Alerts will appear here when suspicious activity is detected.
            </Text>
          </View>
        ) : (
          <FlatList
            data={alerts}
            renderItem={renderAlert}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
