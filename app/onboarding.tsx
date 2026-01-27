import React, { useState, useRef } from "react";
import { Text, View, Pressable, Platform, Dimensions, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { completeOnboarding } from "@/lib/onboarding-state";

const { width } = Dimensions.get("window");

const onboardingScreens = [
  {
    id: 1,
    icon: "qrcode" as const,
    iconColor: "#0a7ea4",
    title: "Scan QR Codes Safely",
    description:
      "Shabari scans payment QR codes and checks them against fraud databases before you pay. Simply tap the Scan tab and point your camera at any UPI QR code.",
    features: [
      "Instant fraud detection",
      "VPA verification",
      "NPCI compliance check",
    ],
  },
  {
    id: 2,
    icon: "shield.fill" as const,
    iconColor: "#0a7ea4",
    title: "Protect Your Links",
    description:
      "Set Shabari as your default browser to automatically check suspicious links from WhatsApp, SMS, and email before they open.",
    features: [
      "Phishing detection",
      "Malware scanning",
      "URL unshortening",
    ],
    setupNote: "Go to Settings → Apps → Default apps → Browser app → Shabari",
  },
  {
    id: 3,
    icon: "checkmark.circle.fill" as const,
    iconColor: "#22C55E",
    title: "Understand Risk Tiers",
    description:
      "Shabari uses a 3-tier system to show you how safe a payment or link is:",
    tiers: [
      {
        color: "#22C55E",
        name: "Green (Safe)",
        description: "Verified merchant, low risk",
      },
      {
        color: "#F59E0B",
        name: "Yellow (Caution)",
        description: "Name mismatch or suspicious patterns",
      },
      {
        color: "#EF4444",
        name: "Red (Danger)",
        description: "Blacklisted or high fraud risk",
      },
    ],
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentScreen = onboardingScreens[currentIndex];
  const isLastScreen = currentIndex === onboardingScreens.length - 1;

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isLastScreen) {
      handleGetStarted();
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  const handleGetStarted = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  const handleDotPress = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  return (
    <ScreenContainer className="bg-background" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1">
        {/* Skip Button */}
        {!isLastScreen && (
          <View className="absolute top-4 right-4 z-10">
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text className="text-primary font-semibold text-base">Skip</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {onboardingScreens.map((screen) => (
            <View
              key={screen.id}
              style={{ width }}
              className="flex-1 px-8 py-12 justify-center"
            >
              {/* Icon */}
              <View className="items-center mb-8">
                <View
                  className="w-32 h-32 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${screen.iconColor}20` }}
                >
                  <IconSymbol name={screen.icon} size={64} color={screen.iconColor} />
                </View>
              </View>

              {/* Title */}
              <Text className="text-3xl font-bold text-foreground text-center mb-4">
                {screen.title}
              </Text>

              {/* Description */}
              <Text className="text-base text-muted text-center leading-relaxed mb-6">
                {screen.description}
              </Text>

              {/* Features or Tiers */}
              {screen.features && (
                <View className="gap-3 mb-6">
                  {screen.features.map((feature, index) => (
                    <View key={index} className="flex-row items-center gap-3">
                      <View className="w-6 h-6 rounded-full bg-success/20 items-center justify-center">
                        <IconSymbol
                          name="checkmark.circle.fill"
                          size={20}
                          color={colors.success}
                        />
                      </View>
                      <Text className="text-base text-foreground">{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              {screen.tiers && (
                <View className="gap-4 mb-6">
                  {screen.tiers.map((tier, index) => (
                    <View
                      key={index}
                      className="flex-row items-center gap-3 bg-surface rounded-xl p-4 border border-border"
                    >
                      <View
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {tier.name}
                        </Text>
                        <Text className="text-sm text-muted">{tier.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Setup Note */}
              {screen.setupNote && (
                <View className="bg-primary/10 rounded-xl p-4">
                  <Text className="text-sm text-primary text-center leading-relaxed">
                    💡 {screen.setupNote}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View className="px-8 pb-8 gap-6">
          {/* Pagination Dots */}
          <View className="flex-row justify-center gap-2">
            {onboardingScreens.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => handleDotPress(index)}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  className={`h-2 rounded-full ${
                    index === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted"
                  }`}
                />
              </Pressable>
            ))}
          </View>

          {/* Next/Get Started Button */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="bg-primary px-6 py-4 rounded-xl">
              <Text className="text-white font-semibold text-base text-center">
                {isLastScreen ? "Get Started" : "Next"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
