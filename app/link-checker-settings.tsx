import { useState, useEffect, useCallback } from "react";
import { Text, View, Pressable, Platform, Switch, ScrollView, Linking, Alert, FlatList } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getLinkHistory, clearLinkHistory, LinkRecord } from "@/lib/link-checker";
import { getTrustedDomains, removeTrustedDomain, clearTrustedDomains, TrustedDomain } from "@/lib/trusted-domains";

const LINK_CHECKER_ENABLED_KEY = "shabari_link_checker_enabled";

export default function LinkCheckerSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [linkHistory, setLinkHistory] = useState<LinkRecord[]>([]);
  const [trustedDomains, setTrustedDomains] = useState<TrustedDomain[]>([]);
  const [stats, setStats] = useState({ total: 0, blocked: 0, safe: 0 });

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadHistory();
      loadTrustedDomains();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem(LINK_CHECKER_ENABLED_KEY);
      setIsEnabled(enabled !== "false");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const history = await getLinkHistory();
      setLinkHistory(history.slice(0, 10)); // Show last 10
      
      // Calculate stats
      const blocked = history.filter((r) => r.action === "blocked").length;
      const safe = history.filter((r) => r.riskLevel === "safe").length;
      setStats({ total: history.length, blocked, safe });
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadTrustedDomains = async () => {
    try {
      const domains = await getTrustedDomains();
      setTrustedDomains(domains);
    } catch (error) {
      console.error("Error loading trusted domains:", error);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEnabled(value);
    await AsyncStorage.setItem(LINK_CHECKER_ENABLED_KEY, value.toString());
  };

  const handleClearHistory = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      "Clear Link History",
      "Are you sure you want to clear all link check history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearLinkHistory();
            setLinkHistory([]);
            setStats({ total: 0, blocked: 0, safe: 0 });
          },
        },
      ]
    );
  };

  const handleRemoveTrustedDomain = async (domain: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      "Remove Trusted Domain",
      `Remove "${domain}" from your trusted domains? Links from this domain will be verified again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeTrustedDomain(domain);
            loadTrustedDomains();
          },
        },
      ]
    );
  };

  const handleClearAllTrustedDomains = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      "Clear All Trusted Domains",
      "Are you sure you want to remove all trusted domains? All links will be verified again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearTrustedDomains();
            setTrustedDomains([]);
          },
        },
      ]
    );
  };

  const handleOpenSettings = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (Platform.OS === "android") {
      Linking.openSettings();
    } else if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    }
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "safe": return colors.success;
      case "suspicious": return colors.warning;
      case "dangerous": return colors.error;
      default: return colors.muted;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Header */}
          <View className="flex-row items-center gap-3">
            <Pressable onPress={handleBack}>
              <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color={colors.primary} />
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">Link Checker</Text>
          </View>

          {/* Enable Toggle */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 gap-1">
                <Text className="text-lg font-semibold text-foreground">
                  Link Protection
                </Text>
                <Text className="text-sm text-muted">
                  Check links before opening in browser
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Trusted Domains Section */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <IconSymbol name="checkmark.shield.fill" size={20} color={colors.primary} />
                <Text className="text-lg font-semibold text-foreground">Trusted Domains</Text>
              </View>
              {trustedDomains.length > 0 && (
                <Pressable onPress={handleClearAllTrustedDomains}>
                  <Text className="text-sm text-error">Clear All</Text>
                </Pressable>
              )}
            </View>
            
            <Text className="text-sm text-muted">
              Links from these domains skip verification and open instantly.
            </Text>

            {trustedDomains.length === 0 ? (
              <View className="bg-background rounded-xl p-4 items-center gap-2">
                <IconSymbol name="checkmark.shield.fill" size={32} color={colors.muted} />
                <Text className="text-sm text-muted text-center">
                  No trusted domains yet.{"\n"}Add domains from the link check screen.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {trustedDomains.map((td) => (
                  <View key={td.domain} className="bg-background rounded-xl p-3 flex-row items-center justify-between">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">
                        {td.domain}
                      </Text>
                      <Text className="text-xs text-muted">
                        Added {formatDate(td.addedAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveTrustedDomain(td.domain)}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View className="bg-error/10 rounded-full p-2">
                        <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Statistics */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-4">
            <Text className="text-lg font-semibold text-foreground">Statistics</Text>
            <View className="flex-row gap-4">
              <View className="flex-1 bg-background rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-foreground">{stats.total}</Text>
                <Text className="text-sm text-muted">Links Checked</Text>
              </View>
              <View className="flex-1 bg-background rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-error">{stats.blocked}</Text>
                <Text className="text-sm text-muted">Blocked</Text>
              </View>
              <View className="flex-1 bg-background rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-success">{stats.safe}</Text>
                <Text className="text-sm text-muted">Safe</Text>
              </View>
            </View>
          </View>

          {/* How to Enable */}
          <View className="bg-primary/10 rounded-2xl p-4 gap-3">
            <Text className="text-lg font-semibold text-foreground">
              How to Enable Link Checking
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              To check links from WhatsApp, SMS, and other apps:
            </Text>
            <View className="gap-2">
              <Text className="text-sm text-foreground">
                1. Open your phone's Settings
              </Text>
              <Text className="text-sm text-foreground">
                2. Go to Apps → Default Apps → Opening Links
              </Text>
              <Text className="text-sm text-foreground">
                3. Select Shabari as your default browser
              </Text>
              <Text className="text-sm text-foreground">
                4. Now all links will be verified before opening
              </Text>
            </View>
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="bg-primary rounded-xl p-3 items-center mt-2">
                <Text className="text-white font-semibold">
                  Open Device Settings
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Recent History */}
          {linkHistory.length > 0 && (
            <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground">Recent Checks</Text>
                <Pressable onPress={handleClearHistory}>
                  <Text className="text-sm text-error">Clear All</Text>
                </Pressable>
              </View>
              
              {linkHistory.map((record) => (
                <View key={record.id} className="bg-background rounded-xl p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      {record.domain}
                    </Text>
                    <View 
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: getRiskColor(record.riskLevel) + "20" }}
                    >
                      <Text style={{ color: getRiskColor(record.riskLevel), fontSize: 12, fontWeight: "600" }}>
                        {record.riskLevel.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {record.url}
                  </Text>
                  <Text className="text-xs text-muted">
                    {record.action === "blocked" ? "🚫 Blocked" : "✓ Opened"} • {new Date(record.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Info */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">
              What We Check
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              • URL shorteners (bit.ly, tinyurl, etc.){"\n"}
              • Known phishing domains{"\n"}
              • Suspicious URL patterns{"\n"}
              • HTTPS security{"\n"}
              • Domain reputation
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
