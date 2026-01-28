import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { openInBrowser } from "@/lib/open-in-browser";

/**
 * Catch-all route for unhandled deep links
 * This prevents the "Unmatched Route" error screen
 */
export default function CatchAllScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Reconstruct the original URL from the path
  const segments = params["unmatched"] as string[] | string | undefined;
  const path = Array.isArray(segments) ? segments.join("/") : segments || "";
  
  const handleGoHome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/");
  };

  const handleOpenExternally = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // If this looks like an http/https URL, try to open it externally
    if (path.startsWith("http://") || path.startsWith("https://")) {
      if (Platform.OS === "android") {
        openInBrowser(path);
      } else {
        await Linking.openURL(path);
      }
    }
    
    router.replace("/");
  };

  return (
    <ScreenContainer className="bg-background items-center justify-center p-6">
      <View className="items-center gap-4 max-w-sm">
        <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
          <IconSymbol name="link.badge.plus" size={40} color={colors.muted} />
        </View>
        
        <Text className="text-xl font-bold text-foreground text-center">
          External Link Detected
        </Text>
        
        <Text className="text-base text-muted text-center">
          Shabari intercepted a link that it cannot process directly.
        </Text>
        
        {path && (
          <View className="bg-surface/50 rounded-lg p-3 w-full">
            <Text className="text-xs text-muted font-mono text-center" numberOfLines={2}>
              {path}
            </Text>
          </View>
        )}

        <View className="gap-3 w-full mt-4">
          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="bg-primary px-6 py-4 rounded-xl items-center">
              <Text className="text-white font-semibold text-base">
                Go to Home
              </Text>
            </View>
          </Pressable>
          
          {(path.startsWith("http://") || path.startsWith("https://")) && (
            <Pressable
              onPress={handleOpenExternally}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View className="border border-border px-6 py-3 rounded-xl items-center">
                <Text className="text-muted font-semibold text-sm">
                  Open in Browser
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
