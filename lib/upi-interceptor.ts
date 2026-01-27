import * as Linking from "expo-linking";
import { router } from "expo-router";

/**
 * UPI Link Interceptor
 * Handles incoming UPI payment links and redirects to Shabari verification
 */

export interface UpiLinkData {
  url: string;
  scheme: string;
  hostname?: string;
  path?: string;
  queryParams?: Record<string, string>;
}

/**
 * Initialize UPI link interception
 * Call this on app startup
 */
export function initializeUpiInterceptor() {
  // Handle deep links when app is already open
  Linking.addEventListener("url", handleDeepLink);

  // Handle deep link that opened the app
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink({ url });
    }
  });
}

/**
 * Handle incoming deep link
 */
function handleDeepLink(event: { url: string }) {
  const { url } = event;

  try {
    const parsed = Linking.parse(url);
    const { scheme, hostname, path, queryParams } = parsed;
    
    // Handle null values from Linking.parse
    const safeHostname = hostname ?? undefined;
    const safePath = path ?? undefined;
    const safeQueryParams = queryParams ?? undefined;

    // Check if it's a UPI link
    if (scheme === "upi") {
      handleUpiLink({
        url,
        scheme,
        hostname: safeHostname,
        path: safePath,
        queryParams: safeQueryParams as Record<string, string> | undefined,
      });
      return;
    }

    // Check if it's a payment-related HTTPS link
    if (scheme === "https" && isPaymentLink(hostname || "")) {
      handlePaymentLink({
        url,
        scheme,
        hostname: safeHostname,
        path: safePath,
        queryParams: safeQueryParams as Record<string, string> | undefined,
      });
      return;
    }

    // Handle other app links (e.g., manus scheme)
    // Let Expo Router handle these normally
  } catch (error) {
    console.error("Error handling deep link:", error);
  }
}

/**
 * Check if hostname is a payment-related domain
 */
function isPaymentLink(hostname: string): boolean {
  const paymentDomains = [
    "upi",
    "phonepe.com",
    "paytm.com",
    "gpay.app.goo.gl",
    "pay.google.com",
  ];

  return paymentDomains.some((domain) => hostname.includes(domain));
}

/**
 * Handle UPI payment link
 */
function handleUpiLink(data: UpiLinkData) {
  console.log("UPI link intercepted:", data.url);

  // Navigate to risk assessment screen with UPI data
  router.push({
    pathname: "/risk-assessment",
    params: {
      qrData: data.url,
      source: "link_interception",
    },
  });
}

/**
 * Handle payment-related HTTPS link
 */
function handlePaymentLink(data: UpiLinkData) {
  console.log("Payment link intercepted:", data.url);

  // Extract UPI string from URL if present
  const upiParam = data.queryParams?.upi || data.queryParams?.pa;

  if (upiParam) {
    // Construct UPI string
    const upiString = upiParam.startsWith("upi://") ? upiParam : `upi://pay?pa=${upiParam}`;

    router.push({
      pathname: "/risk-assessment",
      params: {
        qrData: upiString,
        source: "link_interception",
      },
    });
  }
  // If no UPI data found, just log it (no dedicated link-warning screen yet)
}

/**
 * Check if app can handle UPI links
 */
export async function canHandleUpiLinks(): Promise<boolean> {
  try {
    // Check if the app is registered to handle upi:// scheme
    const canOpen = await Linking.canOpenURL("upi://pay");
    return canOpen;
  } catch (error) {
    console.error("Error checking UPI link handling:", error);
    return false;
  }
}

/**
 * Open system settings to set Shabari as default for UPI links
 */
export async function openDefaultAppSettings() {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.error("Error opening settings:", error);
  }
}
