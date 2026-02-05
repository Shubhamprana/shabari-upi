import { useState, useRef, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
  TextInput,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { WebView, WebViewNavigation } from "react-native-webview";
import * as FileSystem from "expo-file-system";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// Dangerous file extensions that should be blocked or sandboxed
const DANGEROUS_EXTENSIONS = [
  ".apk", ".exe", ".msi", ".bat", ".cmd", ".scr", ".js", ".vbs",
  ".jar", ".zip", ".rar", ".7z", ".tar", ".gz", ".iso", ".dmg",
];

export default function SafeBrowserScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string }>();
  const webViewRef = useRef<WebView>(null);

  const [urlInput, setUrlInput] = useState("");
  const [actualUrl, setActualUrl] = useState(params.url || "");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(params.url || "");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [downloadWarning, setDownloadWarning] = useState<string | null>(null);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      if (Platform.OS === "android") {
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
      }
    }, [canGoBack])
  );

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setPageTitle(navState.title || "");
    setIsLoading(navState.loading);
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }) => {
    const url = request.url.toLowerCase();

    // Check for dangerous downloads
    const isDangerousDownload = DANGEROUS_EXTENSIONS.some((ext) =>
      url.includes(ext)
    );

    if (isDangerousDownload) {
      // Block and warn user
      setDownloadWarning(
        `⚠️ Blocked potentially dangerous download:\n${request.url}`
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      Alert.alert(
        "Download Blocked",
        "This file type could be dangerous. Shabari has blocked this download for your safety.\n\nFile types like .apk, .exe, .zip can contain malware.",
        [{ text: "OK", style: "default" }]
      );

      return false; // Block the navigation/download
    }

    // Block non-http(s) schemes except for tel/mailto
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("tel:") &&
      !url.startsWith("mailto:")
    ) {
      Alert.alert(
        "Navigation Blocked",
        "This link is trying to open an external app. For your safety, this is not allowed in Safe Browser.",
        [{ text: "OK" }]
      );
      return false;
    }

    return true;
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (canGoForward && webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const handleLoadUrl = () => {
    let url = urlInput.trim();
    if (!url) {
      Alert.alert("Error", "Please enter a URL");
      return;
    }
    
    // Add https:// if no protocol specified
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    setActualUrl(url);
    setCurrentUrl(url);
    Keyboard.dismiss();
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!actualUrl) {
    return (
      <ScreenContainer className="bg-background p-6">
        <View className="flex-1 justify-center gap-6">
          <View className="items-center gap-4">
            <View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <IconSymbol name="globe" size={40} color={colors.primary} />
            </View>
            <Text className="text-2xl font-bold text-foreground">Safe Browser</Text>
            <Text className="text-base text-muted text-center">
              Enter a URL to browse securely
            </Text>
          </View>

          <View className="gap-3">
            <View className="bg-surface rounded-xl border border-border p-4 flex-row items-center gap-3">
              <IconSymbol name="link" size={20} color={colors.muted} />
              <TextInput
                className="flex-1 text-foreground text-base"
                placeholder="Enter website URL..."
                placeholderTextColor={colors.muted}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleLoadUrl}
              />
            </View>
            
            <Pressable
              onPress={handleLoadUrl}
              style={({ pressed }) => [{
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }]}
            >
              <View className="bg-primary rounded-xl p-4 items-center flex-row justify-center gap-2">
                <IconSymbol name="arrow.right.circle.fill" size={20} color="#FFFFFF" />
                <Text className="text-white font-bold text-base">Browse</Text>
              </View>
            </Pressable>
          </View>

          <Pressable onPress={handleClose}>
            <View className="items-center py-3">
              <Text className="text-muted">Go Back</Text>
            </View>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View
        className="bg-primary pt-12 pb-3 px-4"
        style={{ paddingTop: Platform.OS === "android" ? 40 : 50 }}
      >
        <View className="flex-row items-center gap-3">
          {/* Close Button */}
          <Pressable onPress={handleClose} className="p-2">
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </Pressable>

          {/* URL Bar */}
          <View className="flex-1 bg-white/20 rounded-full px-4 py-2 flex-row items-center gap-2">
            <IconSymbol name="lock.fill" size={14} color="#FFFFFF" />
            <Text
              className="text-white text-sm flex-1"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {getDomain(currentUrl)}
            </Text>
          </View>

          {/* Refresh Button */}
          <Pressable onPress={handleRefresh} className="p-2">
            <IconSymbol name="arrow.clockwise" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Safe Browser Badge */}
        <View className="flex-row items-center justify-center gap-2 mt-2">
          <IconSymbol name="checkmark.shield.fill" size={14} color="#FFFFFF" />
          <Text className="text-white/80 text-xs font-medium">
            Safe Browser - Downloads Blocked
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View className="absolute top-0 left-0 right-0 z-10" style={{ top: Platform.OS === "android" ? 100 : 110 }}>
          <View className="h-1 bg-primary/30">
            <View className="h-1 bg-white w-1/3 animate-pulse" />
          </View>
        </View>
      )}

      {/* Download Warning Banner */}
      {downloadWarning && (
        <Pressable
          onPress={() => setDownloadWarning(null)}
          className="bg-warning/20 border-b border-warning/30 p-3"
        >
          <Text className="text-warning text-sm text-center">
            {downloadWarning}
          </Text>
          <Text className="text-warning/70 text-xs text-center mt-1">
            Tap to dismiss
          </Text>
        </Pressable>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: actualUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
        // Better rendering
        androidLayerType="hardware"
        cacheEnabled={true}
        // Security settings
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        allowFileAccessFromFileURLs={false}
        mixedContentMode="always"
        // Better viewport for proper scaling
        injectedJavaScript={`
          const meta = document.createElement('meta');
          meta.setAttribute('name', 'viewport');
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
        // Render loading indicator
        renderLoading={() => (
          <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-muted mt-4">Loading securely...</Text>
          </View>
        )}
        // Error handling
        renderError={(errorDomain, errorCode, errorDesc) => (
          <View className="flex-1 items-center justify-center bg-background p-6">
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={48}
              color={colors.warning}
            />
            <Text className="text-foreground font-bold text-lg mt-4">
              Failed to Load
            </Text>
            <Text className="text-muted text-center mt-2">{errorDesc}</Text>
            <Pressable onPress={handleRefresh} className="mt-4">
              <View className="bg-primary px-6 py-3 rounded-full">
                <Text className="text-white font-semibold">Try Again</Text>
              </View>
            </Pressable>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Bottom Navigation Bar */}
      <View className="bg-surface border-t border-border px-6 py-3 flex-row items-center justify-around">
        <Pressable
          onPress={handleGoBack}
          disabled={!canGoBack}
          className="p-3"
          style={{ opacity: canGoBack ? 1 : 0.3 }}
        >
          <IconSymbol
            name="chevron.left"
            size={24}
            color={canGoBack ? colors.foreground : colors.muted}
          />
        </Pressable>

        <Pressable
          onPress={handleGoForward}
          disabled={!canGoForward}
          className="p-3"
          style={{ opacity: canGoForward ? 1 : 0.3 }}
        >
          <IconSymbol
            name="chevron.right"
            size={24}
            color={canGoForward ? colors.foreground : colors.muted}
          />
        </Pressable>

        <Pressable onPress={handleRefresh} className="p-3">
          <IconSymbol name="arrow.clockwise" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable onPress={handleClose} className="p-3">
          <IconSymbol name="xmark.circle.fill" size={24} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
}
