import { Text, View, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { resetOnboarding } from "@/lib/onboarding-state";

export default function SettingsScreen() {
  const colors = useColors();

  const handleSettingPress = async (setting: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (setting === "silent-guard") {
      router.push("/silent-guard-settings");
    } else if (setting === "link-checker") {
      router.push("/link-checker-settings");
    } else if (setting === "backend") {
      router.push("/backend-settings");
    } else if (setting === "tutorial") {
      await resetOnboarding();
      router.push("/onboarding");
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 p-6 gap-4">
        <Text className="text-2xl font-bold text-foreground">Settings</Text>

        {/* Settings List */}
        <View className="gap-2">
          {/* Link Checker */}
          <Pressable
            onPress={() => handleSettingPress("link-checker")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="house.fill" size={24} color={colors.warning} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Link Checker
                  </Text>
                  <Text className="text-sm text-muted">
                    Verify links before opening
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>

          {/* Backend Connection */}
          <Pressable
            onPress={() => handleSettingPress("backend")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="cloud.fill" size={24} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Backend Connection
                  </Text>
                  <Text className="text-sm text-muted">
                    Online/Offline protection status
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>

          {/* Silent Guard */}
          <Pressable
            onPress={() => handleSettingPress("silent-guard")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="shield.fill" size={24} color={colors.primary} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Silent Guard
                  </Text>
                  <Text className="text-sm text-muted">
                    Monitor payment notifications
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>

          {/* Data & Privacy */}
          <Pressable
            onPress={() => handleSettingPress("privacy")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="shield.fill" size={24} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Data & Privacy
                  </Text>
                  <Text className="text-sm text-muted">
                    DPDP Act compliance
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>

          {/* Show Tutorial Again */}
          <Pressable
            onPress={() => handleSettingPress("tutorial")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="paperplane.fill" size={24} color={colors.primary} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Show Tutorial Again
                  </Text>
                  <Text className="text-sm text-muted">
                    Learn how to use Shabari
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>

          {/* About */}
          <Pressable
            onPress={() => handleSettingPress("about")}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol name="paperplane.fill" size={24} color={colors.muted} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    About & Help
                  </Text>
                  <Text className="text-sm text-muted">
                    Version, support, feedback
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </View>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
