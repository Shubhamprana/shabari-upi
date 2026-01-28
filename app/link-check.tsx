import { useState, useEffect } from "react";
import { Text, View, Pressable, Platform, ActivityIndicator, ScrollView, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { checkLink, saveLinkRecord, LinkCheckResult } from "@/lib/link-checker";
import { openInBrowser } from "@/lib/open-in-browser";

export default function LinkCheckScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<LinkCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTrusting, setIsTrusting] = useState(false);

  useEffect(() => {
    const runCheck = async () => {
      if (!params.url) {
        setError("No URL provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const checkResult = await checkLink(params.url);
        setResult(checkResult);
        
        // Haptic feedback based on risk level
        if (Platform.OS !== "web") {
          if (checkResult.riskLevel === "safe") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (checkResult.riskLevel === "suspicious") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      } catch (err) {
        setError("Failed to check link");
        console.error("Link check error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    runCheck();
  }, [params.url]);

  const handleOpenLink = async () => {
    if (!result) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Save to history
    await saveLinkRecord(result, "opened");
    
    // Open in browser
    try {
      if (Platform.OS === "web") {
        window.open(result.url, "_blank");
      } else if (Platform.OS === "android") {
        openInBrowser(result.url);
      } else {
        await WebBrowser.openBrowserAsync(result.url);
      }
    } catch {
      await Linking.openURL(result.url);
    }
    
    router.back();
  };

  const handleBlock = async () => {
    if (!result) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Save to history as blocked
    await saveLinkRecord(result, "blocked");
    
    router.back();
  };

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleTrustDomain = async () => {
    if (!result) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Show confirmation
    Alert.alert(
      "Always Trust This Domain?",
      `Add "${result.domain}" to your trusted domains list? Links from this domain will skip verification in the future.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Trust Domain",
          onPress: async () => {
            setIsTrusting(true);
            const success = await addTrustedDomain(result.domain);
            setIsTrusting(false);
            
            if (success) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert(
                "Domain Trusted",
                `${result.domain} has been added to your trusted domains.`,
                [{ text: "OK" }]
              );
            } else {
              Alert.alert(
                "Already Trusted",
                `${result.domain} is already in your trusted domains list.`,
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <View className="items-center gap-4">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-lg font-semibold text-foreground">
            Checking Link Safety...
          </Text>
          <Text className="text-sm text-muted text-center px-8">
            Analyzing URL for phishing, malware, and scams
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !result) {
    return (
      <ScreenContainer className="bg-background items-center justify-center p-6">
        <View className="items-center gap-4 max-w-sm">
          <IconSymbol name="xmark.circle.fill" size={64} color={colors.error} />
          <Text className="text-xl font-bold text-foreground text-center">
            Check Failed
          </Text>
          <Text className="text-base text-muted text-center">
            {error || "Unable to verify link safety"}
          </Text>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="bg-primary px-6 py-3 rounded-full">
              <Text className="text-white font-semibold text-base">Go Back</Text>
            </View>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const { riskLevel, riskScore, domain, url, originalUrl, isExpanded, warnings, checks, trustedByUser } = result;

  // Safe Link (Green)
  if (riskLevel === "safe") {
    return (
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-6 gap-6">
            {/* Success Header */}
            <View className="items-center gap-3 pt-8">
              <View className="w-24 h-24 rounded-full bg-success/20 items-center justify-center">
                <IconSymbol name="checkmark.circle.fill" size={64} color={colors.success} />
              </View>
              <Text className="text-2xl font-bold text-foreground">
                Link is Safe
              </Text>
              {trustedByUser && (
                <View className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center gap-2">
                  <IconSymbol name="checkmark.shield.fill" size={16} color={colors.primary} />
                  <Text className="text-primary font-semibold">
                    Trusted by You
                  </Text>
                </View>
              )}
              {!trustedByUser && (
                <View className="bg-success/10 px-4 py-2 rounded-full">
                  <Text className="text-success font-semibold">
                    Safety Score: {riskScore}/100
                  </Text>
                </View>
              )}
            </View>

            {/* Link Details */}
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted">Domain</Text>
                <Text className="text-xl font-bold text-foreground">
                  {domain}
                </Text>
              </View>
              
              <View className="h-px bg-border" />
              
              <View className="gap-2">
                <Text className="text-sm text-muted">Full URL</Text>
                <Text className="text-sm text-foreground font-mono" numberOfLines={3}>
                  {url}
                </Text>
              </View>

              {isExpanded && (
                <>
                  <View className="h-px bg-border" />
                  <View className="bg-primary/10 rounded-lg p-3">
                    <Text className="text-sm text-primary">
                      ℹ️ Shortened URL was expanded for verification
                    </Text>
                  </View>
                </>
              )}
              
              {/* Security Checks */}
              <View className="h-px bg-border" />
              <View className="gap-2">
                <Text className="text-sm text-muted">Security Checks</Text>
                <View className="gap-1">
                  {trustedByUser ? (
                    <Text className="text-sm text-primary">★ You have trusted this domain</Text>
                  ) : (
                    <>
                      <Text className="text-sm text-success">✓ {checks.isHTTPS ? "Secure HTTPS connection" : "Connection verified"}</Text>
                      <Text className="text-sm text-success">✓ No phishing patterns detected</Text>
                      <Text className="text-sm text-success">✓ Domain reputation is good</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleOpenLink}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-success rounded-2xl p-4 items-center">
                  <Text className="text-white font-bold text-lg">
                    Open Link
                  </Text>
                </View>
              </Pressable>

              {/* Always Trust This Domain Button - only show if not already trusted */}
              {!trustedByUser && (
                <Pressable
                  onPress={handleTrustDomain}
                  disabled={isTrusting}
                  style={({ pressed }) => [
                    {
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed || isTrusting ? 0.7 : 1,
                    },
                  ]}
                >
                  <View className="bg-surface border border-primary rounded-2xl p-4 items-center flex-row justify-center gap-2">
                    <IconSymbol name="checkmark.shield.fill" size={20} color={colors.primary} />
                    <Text className="text-primary font-bold text-base">
                      {isTrusting ? "Adding..." : "Always Trust This Domain"}
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View className="items-center py-3">
                  <Text className="text-muted font-semibold">Cancel</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Suspicious Link (Yellow)
  if (riskLevel === "suspicious") {
    return (
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-6 gap-6">
            {/* Warning Header */}
            <View className="items-center gap-3 pt-8">
              <View className="w-24 h-24 rounded-full bg-warning/20 items-center justify-center">
                <IconSymbol name="exclamationmark.triangle.fill" size={64} color={colors.warning} />
              </View>
              <Text className="text-2xl font-bold text-foreground">
                Proceed with Caution
              </Text>
              <View className="bg-warning/10 px-4 py-2 rounded-full">
                <Text className="text-warning font-semibold">
                  Safety Score: {riskScore}/100
                </Text>
              </View>
            </View>

            {/* Warnings */}
            {warnings.length > 0 && (
              <View className="bg-warning/10 border border-warning/30 rounded-2xl p-4 gap-2">
                {warnings.map((warning, index) => (
                  <Text key={index} className="text-warning font-medium text-center">
                    ⚠️ {warning}
                  </Text>
                ))}
              </View>
            )}

            {/* Link Details */}
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted">Domain</Text>
                <Text className="text-lg font-semibold text-foreground">
                  {domain}
                </Text>
              </View>
              
              <View className="h-px bg-border" />
              
              <View className="gap-2">
                <Text className="text-sm text-muted">Full URL</Text>
                <Text className="text-sm text-foreground font-mono" numberOfLines={3}>
                  {url}
                </Text>
              </View>

              {isExpanded && originalUrl !== url && (
                <>
                  <View className="h-px bg-border" />
                  <View className="gap-2">
                    <Text className="text-sm text-muted">Original Shortened URL</Text>
                    <Text className="text-sm text-foreground font-mono" numberOfLines={2}>
                      {originalUrl}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleBlock}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-surface border border-border rounded-2xl p-4 items-center">
                  <Text className="text-foreground font-bold text-lg">
                    Block & Go Back
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleOpenLink}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-warning rounded-2xl p-4 items-center">
                  <Text className="text-white font-bold text-lg">
                    Open Anyway
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Dangerous Link (Red)
  return (
    <View className="flex-1 bg-error">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-6">
          {/* Danger Header */}
          <View className="items-center gap-3 pt-8">
            <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
              <IconSymbol name="xmark.octagon.fill" size={64} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-bold text-white">
              DANGER
            </Text>
            <Text className="text-xl text-white/90 text-center">
              Likely Phishing or Scam
            </Text>
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold">
                Safety Score: {riskScore}/100
              </Text>
            </View>
          </View>

          {/* Warnings */}
          <View className="bg-white/10 rounded-2xl p-4 gap-3">
            {warnings.map((warning, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <Text className="text-white">🚨</Text>
                <Text className="text-white font-medium flex-1">
                  {warning}
                </Text>
              </View>
            ))}
          </View>

          {/* Link Details */}
          <View className="bg-white/10 rounded-2xl p-4 gap-3">
            <View className="gap-1">
              <Text className="text-white/60 text-sm">Domain</Text>
              <Text className="text-white font-semibold">{domain}</Text>
            </View>
            <View className="gap-1">
              <Text className="text-white/60 text-sm">URL</Text>
              <Text className="text-white font-mono text-sm" numberOfLines={3}>{url}</Text>
            </View>
          </View>

          {/* Security Issues */}
          <View className="bg-white/10 rounded-2xl p-4 gap-2">
            <Text className="text-white font-bold">Security Issues Detected:</Text>
            {checks.isKnownPhishing && (
              <Text className="text-white">✗ Matches known phishing patterns</Text>
            )}
            {checks.hasSuspiciousPattern && (
              <Text className="text-white">✗ Contains suspicious URL patterns</Text>
            )}
            {!checks.isHTTPS && (
              <Text className="text-white">✗ Insecure connection (HTTP)</Text>
            )}
            {checks.isShortener && (
              <Text className="text-white">✗ Uses URL shortener to hide destination</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={handleBlock}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="bg-white rounded-2xl p-4 items-center">
                <Text className="text-error font-bold text-lg">
                  Block This Link
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleOpenLink}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View className="border border-white/30 rounded-2xl p-4 items-center">
                <Text className="text-white/70 font-semibold">
                  Open Anyway (Not Recommended)
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
