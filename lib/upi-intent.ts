import { Linking, Platform, Alert } from "react-native";

/**
 * Launch UPI payment app with the given UPI string
 * Supports GPay, PhonePe, Paytm, and generic UPI apps
 */
export async function launchUpiIntent(upiString: string): Promise<boolean> {
  try {
    // Ensure UPI string has proper format
    const formattedUpiString = upiString.startsWith("upi://")
      ? upiString
      : `upi://${upiString}`;

    // Check if the device can handle UPI links
    const canOpen = await Linking.canOpenURL(formattedUpiString);

    if (!canOpen) {
      Alert.alert(
        "No UPI App Found",
        "Please install a UPI payment app like GPay, PhonePe, or Paytm to complete this payment.",
        [{ text: "OK" }]
      );
      return false;
    }

    // Open the UPI link (OS will show app chooser)
    await Linking.openURL(formattedUpiString);
    return true;
  } catch (error) {
    console.error("Error launching UPI intent:", error);
    
    // Fallback: Try opening in browser
    try {
      const browserUrl = `https://pay.google.com/gp/v/pay?${upiString.replace("upi://pay?", "")}`;
      await Linking.openURL(browserUrl);
      return true;
    } catch (browserError) {
      Alert.alert(
        "Payment Failed",
        "Unable to open payment app. Please try again or use a different payment method.",
        [{ text: "OK" }]
      );
      return false;
    }
  }
}

/**
 * Launch specific UPI app with deep link
 */
export async function launchSpecificUpiApp(
  upiString: string,
  app: "gpay" | "phonepe" | "paytm"
): Promise<boolean> {
  try {
    let deepLink: string;
    const upiParams = upiString.replace("upi://pay?", "");

    switch (app) {
      case "gpay":
        // Google Pay deep link
        deepLink = Platform.select({
          ios: `gpay://upi/pay?${upiParams}`,
          android: `gpay://upi/pay?${upiParams}`,
          default: `https://pay.google.com/gp/v/pay?${upiParams}`,
        }) as string;
        break;

      case "phonepe":
        // PhonePe deep link
        deepLink = Platform.select({
          ios: `phonepe://pay?${upiParams}`,
          android: `phonepe://pay?${upiParams}`,
          default: `https://phon.pe/pay?${upiParams}`,
        }) as string;
        break;

      case "paytm":
        // Paytm deep link
        deepLink = Platform.select({
          ios: `paytmmp://pay?${upiParams}`,
          android: `paytmmp://pay?${upiParams}`,
          default: `https://paytm.com/pay?${upiParams}`,
        }) as string;
        break;

      default:
        return launchUpiIntent(upiString);
    }

    const canOpen = await Linking.canOpenURL(deepLink);

    if (!canOpen) {
      // App not installed, fallback to generic UPI intent
      return launchUpiIntent(upiString);
    }

    await Linking.openURL(deepLink);
    return true;
  } catch (error) {
    console.error(`Error launching ${app}:`, error);
    // Fallback to generic UPI intent
    return launchUpiIntent(upiString);
  }
}

/**
 * Check if a specific UPI app is installed
 */
export async function isUpiAppInstalled(
  app: "gpay" | "phonepe" | "paytm"
): Promise<boolean> {
  try {
    let testUrl: string;

    switch (app) {
      case "gpay":
        testUrl = Platform.select({
          ios: "gpay://",
          android: "gpay://",
          default: "https://pay.google.com",
        }) as string;
        break;

      case "phonepe":
        testUrl = Platform.select({
          ios: "phonepe://",
          android: "phonepe://",
          default: "https://phon.pe",
        }) as string;
        break;

      case "paytm":
        testUrl = Platform.select({
          ios: "paytmmp://",
          android: "paytmmp://",
          default: "https://paytm.com",
        }) as string;
        break;

      default:
        return false;
    }

    return await Linking.canOpenURL(testUrl);
  } catch (error) {
    console.error(`Error checking ${app} installation:`, error);
    return false;
  }
}
