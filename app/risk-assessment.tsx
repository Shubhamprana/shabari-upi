import { useState, useEffect } from "react";
import { Text, View, Pressable, Platform, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { saveScanRecord } from "@/lib/scan-history";
import { launchUpiIntent } from "@/lib/upi-intent";
import { checkUPIFraudHybrid } from "@/lib/hybrid-fraud-detection";
import { RiskAssessment } from "@/lib/offline-fraud-detection";

export default function RiskAssessmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ upiString: string; source?: string }>();
  
  const [countdown, setCountdown] = useState(5);
  const [canProceed, setCanProceed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState<(RiskAssessment & { source: "backend" | "offline" }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run offline fraud detection
  useEffect(() => {
    const runDetection = async () => {
      if (!params.upiString) {
        setError("No UPI data provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Add small delay for UX (shows verification is happening)
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const result = await checkUPIFraudHybrid(params.upiString);
        setAssessment(result);
        
        // Haptic feedback based on risk tier
        if (Platform.OS !== "web") {
          if (result.riskTier === "green") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (result.riskTier === "yellow") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      } catch (err) {
        setError("Failed to analyze payment request");
        console.error("Fraud detection error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    runDetection();
  }, [params.upiString]);

  // Countdown timer for Red tier
  useEffect(() => {
    if (assessment?.riskTier === "red" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanProceed(true);
    }
  }, [countdown, assessment]);

  const handleProceed = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Save scan to history before proceeding
    if (assessment && params.upiString) {
      try {
        await saveScanRecord(params.upiString, {
          upiParams: {
            pa: assessment.paymentDetails.vpa,
            pn: assessment.paymentDetails.payeeName,
            am: assessment.paymentDetails.amount.toString(),
            tn: assessment.paymentDetails.transactionNote,
            cu: assessment.paymentDetails.currency,
            mc: assessment.paymentDetails.merchantCode || null,
            tr: assessment.paymentDetails.referenceId || null,
          },
          vpaInfo: {
            valid: true,
            registeredName: assessment.verifiedName,
            bankName: null,
          },
          npciCompliance: {
            compliant: !assessment.isNPCINonCompliant,
            violation: assessment.isNPCINonCompliant ? "Collect request exceeds ₹2,000 limit" : null,
          },
          riskAssessment: {
            tier: assessment.riskTier,
            score: assessment.riskScore,
            breakdown: assessment.breakdown,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to save scan record:", err);
      }
    }
    
    // Launch UPI intent to open payment app
    if (params.upiString) {
      const launched = await launchUpiIntent(params.upiString);
      if (launched) {
        router.back();
      }
    }
  };

  const handleCancel = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Save scan to history even when cancelled
    if (assessment && params.upiString) {
      try {
        await saveScanRecord(params.upiString, {
          upiParams: {
            pa: assessment.paymentDetails.vpa,
            pn: assessment.paymentDetails.payeeName,
            am: assessment.paymentDetails.amount.toString(),
            tn: assessment.paymentDetails.transactionNote,
            cu: assessment.paymentDetails.currency,
            mc: assessment.paymentDetails.merchantCode || null,
            tr: assessment.paymentDetails.referenceId || null,
          },
          vpaInfo: {
            valid: true,
            registeredName: assessment.verifiedName,
            bankName: null,
          },
          npciCompliance: {
            compliant: !assessment.isNPCINonCompliant,
            violation: assessment.isNPCINonCompliant ? "Collect request exceeds ₹2,000 limit" : null,
          },
          riskAssessment: {
            tier: assessment.riskTier,
            score: assessment.riskScore,
            breakdown: assessment.breakdown,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to save scan record:", err);
      }
    }
    
    router.back();
  };

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <View className="items-center gap-4">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-lg font-semibold text-foreground">
            Verifying Payment...
          </Text>
          <Text className="text-sm text-muted">
            Checking for fraud and scams
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !assessment) {
    return (
      <ScreenContainer className="bg-background items-center justify-center p-6">
        <View className="items-center gap-4 max-w-sm">
          <IconSymbol name="xmark.circle.fill" size={64} color={colors.error} />
          <Text className="text-xl font-bold text-foreground text-center">
            Verification Failed
          </Text>
          <Text className="text-base text-muted text-center">
            {error || "Unable to verify payment request"}
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

  const { riskTier, riskScore, paymentDetails, verifiedName, warnings, breakdown } = assessment;

  // Green Tier: Trust Score 80-100 (Low Risk)
  if (riskTier === "green") {
    return (
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-6 gap-6">
            {/* Link Interception Badge */}
            {params.source === "link_interception" && (
              <View className="bg-primary/10 rounded-lg p-3 mb-4">
                <Text className="text-sm text-primary font-medium text-center">
                  🛡️ Link intercepted and verified by Shabari
                </Text>
              </View>
            )}
            
            {/* Backend/Offline Mode Indicator */}
            <View className="bg-surface/50 rounded-lg p-3">
              <Text className="text-xs text-muted text-center">
                {assessment.source === "backend" ? "✓ Verified with Online Protection" : "📱 Verified with Offline Protection"}
              </Text>
            </View>
            
            {/* Success Header */}
            <View className="items-center gap-3 pt-8">
              <View className="w-24 h-24 rounded-full bg-success/20 items-center justify-center">
                <IconSymbol name="checkmark.circle.fill" size={64} color={colors.success} />
              </View>
              <Text className="text-2xl font-bold text-foreground">
                Verified Merchant
              </Text>
              <View className="bg-success/10 px-4 py-2 rounded-full">
                <Text className="text-success font-semibold">
                  Trust Score: {riskScore}/100
                </Text>
              </View>
            </View>

            {/* Merchant Details */}
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted">Verified Name</Text>
                <Text className="text-xl font-bold text-foreground">
                  {verifiedName}
                </Text>
              </View>
              
              <View className="h-px bg-border" />
              
              <View className="gap-2">
                <Text className="text-sm text-muted">VPA</Text>
                <Text className="text-base text-foreground font-mono">
                  {paymentDetails.vpa}
                </Text>
              </View>
              
              {paymentDetails.amount > 0 && (
                <>
                  <View className="h-px bg-border" />
                  <View className="gap-2">
                    <Text className="text-sm text-muted">Amount</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      ₹{paymentDetails.amount}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleProceed}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-success rounded-2xl p-4 items-center">
                  <Text className="text-white font-bold text-lg">
                    Pay via GPay/PhonePe
                  </Text>
                </View>
              </Pressable>

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

  // Yellow Tier: Trust Score 40-79 (Medium Risk)
  if (riskTier === "yellow") {
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
                Caution Required
              </Text>
              <View className="bg-warning/10 px-4 py-2 rounded-full">
                <Text className="text-warning font-semibold">
                  Trust Score: {riskScore}/100
                </Text>
              </View>
            </View>

            {/* Warning Banners */}
            {warnings.length > 0 && (
              <View className="bg-warning/10 border border-warning/30 rounded-2xl p-4 gap-2">
                {warnings.map((warning, index) => (
                  <Text key={index} className="text-warning font-medium text-center">
                    ⚠️ {warning}
                  </Text>
                ))}
              </View>
            )}

            {/* Name Comparison */}
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted">QR Code Name</Text>
                <Text className="text-lg font-semibold text-foreground">
                  {paymentDetails.payeeName || "Not provided"}
                </Text>
              </View>
              
              <View className="h-px bg-border" />
              
              <View className="gap-2">
                <Text className="text-sm text-muted">Verified Name</Text>
                <Text className="text-lg font-semibold text-foreground">
                  {verifiedName}
                </Text>
              </View>
              
              <View className="h-px bg-border" />
              
              <View className="gap-2">
                <Text className="text-sm text-muted">VPA</Text>
                <Text className="text-base text-foreground font-mono">
                  {paymentDetails.vpa}
                </Text>
              </View>

              {paymentDetails.amount > 0 && (
                <>
                  <View className="h-px bg-border" />
                  <View className="gap-2">
                    <Text className="text-sm text-muted">Amount</Text>
                    <Text className="text-xl font-bold text-foreground">
                      ₹{paymentDetails.amount}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleProceed}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-warning rounded-2xl p-4 items-center">
                  <Text className="text-white font-bold text-lg">
                    Proceed with Caution
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-surface border border-border rounded-2xl p-4 items-center">
                  <Text className="text-foreground font-bold text-lg">
                    Cancel
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Red Tier: Trust Score 0-39 (High Risk)
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
              STOP
            </Text>
            <Text className="text-xl text-white/90 text-center">
              High Risk Detected
            </Text>
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold">
                Trust Score: {riskScore}/100
              </Text>
            </View>
          </View>

          {/* Warning Messages */}
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

          {/* Risk Breakdown */}
          <View className="bg-white/10 rounded-2xl p-4 gap-3">
            <Text className="text-white font-bold text-lg">Risk Breakdown</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-white/80">Reputation Score</Text>
                <Text className="text-white font-semibold">{breakdown.reputation}/40</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white/80">Heuristics Score</Text>
                <Text className="text-white font-semibold">{breakdown.heuristics}/30</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white/80">Identity Score</Text>
                <Text className="text-white font-semibold">{breakdown.identity}/30</Text>
              </View>
            </View>
          </View>

          {/* Payment Details */}
          <View className="bg-white/10 rounded-2xl p-4 gap-3">
            <View className="gap-1">
              <Text className="text-white/60 text-sm">VPA</Text>
              <Text className="text-white font-mono">{paymentDetails.vpa}</Text>
            </View>
            {paymentDetails.amount > 0 && (
              <View className="gap-1">
                <Text className="text-white/60 text-sm">Amount</Text>
                <Text className="text-white text-xl font-bold">₹{paymentDetails.amount}</Text>
              </View>
            )}
          </View>

          {/* Countdown Timer */}
          {!canProceed && (
            <View className="items-center py-4">
              <Text className="text-white/80 text-lg">
                Please wait {countdown} seconds before proceeding
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="bg-white rounded-2xl p-4 items-center">
                <Text className="text-error font-bold text-lg">
                  Cancel & Report
                </Text>
              </View>
            </Pressable>

            {canProceed && (
              <Pressable
                onPress={handleProceed}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 0.5,
                  },
                ]}
              >
                <View className="border border-white/30 rounded-2xl p-4 items-center">
                  <Text className="text-white/70 font-semibold">
                    Proceed Anyway (Not Recommended)
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
