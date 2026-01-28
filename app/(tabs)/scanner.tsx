import { useState, useEffect } from "react";
import { Text, View, Pressable, Platform, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { Camera, CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const { width, height } = Dimensions.get("window");

export default function ScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = (event: BarcodeScanningResult | { nativeEvent: BarcodeScanningResult }) => {
    const payload = "nativeEvent" in event ? event.nativeEvent : event;
    const { data } = payload;
    if (isScanning || !data) return;

    setIsScanning(true);
    setScannedData(data);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Navigate to risk assessment screen with scanned data
    router.push({
      pathname: "/risk-assessment",
      params: { upiString: data, source: "qr_scan" },
    });

    // Reset scanning state after navigation
    setTimeout(() => {
      setIsScanning(false);
      setScannedData(null);
    }, 2000);
  };

  const handleGalleryPick = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const scannedResults = await Camera.scanFromURLAsync(result.assets[0].uri, ["qr"]);
        if (scannedResults && scannedResults.length > 0) {
          handleBarCodeScanned(scannedResults[0]);
        }
      } catch (error) {
        console.log("Error scanning from gallery:", error);
      }
    }
  };

  if (!permission) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Requesting camera permission...</Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer className="bg-background items-center justify-center p-6">
        <View className="items-center gap-4 max-w-sm">
          <IconSymbol name="camera.fill" size={64} color={colors.muted} />
          <Text className="text-xl font-bold text-foreground text-center">
            Camera Permission Required
          </Text>
          <Text className="text-base text-muted text-center">
            Shabari needs camera access to scan QR codes and verify payment requests
          </Text>
          <Pressable
            onPress={async () => {
              await requestPermission();
            }}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View className="bg-primary px-6 py-3 rounded-full">
              <Text className="text-white font-semibold text-base">
                Grant Permission
              </Text>
            </View>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerEnabled={!isScanning}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isScanning ? "Verifying..." : "Scan QR Code"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isScanning
              ? "Checking for fraud..."
              : "Point camera at UPI QR code"}
          </Text>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Scanning indicator */}
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={64}
                  color="#34C759"
                />
              </View>
            )}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {/* Gallery Button */}
          <Pressable
            onPress={handleGalleryPick}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.galleryButton,
              {
                opacity: pressed ? 0.7 : isScanning ? 0.5 : 1,
              },
            ]}
          >
            <IconSymbol name="photo.fill" size={24} color="#FFFFFF" />
            <Text style={styles.galleryButtonText}>
              Scan from Gallery
            </Text>
          </Pressable>

          {/* Scanned Data Display */}
          {scannedData && (
            <View style={styles.scannedDataContainer}>
              <Text style={styles.scannedDataText}>
                {scannedData.substring(0, 50)}
                {scannedData.length > 50 ? "..." : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontSize: 14,
    marginTop: 4,
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 256,
    height: 256,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 48,
    height: 48,
    borderColor: "#FFFFFF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanningIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(52, 199, 89, 0.2)",
    borderRadius: 16,
  },
  bottomActions: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    gap: 16,
  },
  galleryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  scannedDataContainer: {
    backgroundColor: "rgba(52, 199, 89, 0.2)",
    borderRadius: 16,
    padding: 16,
  },
  scannedDataText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
