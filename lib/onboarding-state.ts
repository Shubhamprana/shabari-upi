import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "@shabari_onboarding_completed";

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
}

/**
 * Reset onboarding (for testing or "Show Tutorial Again")
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error("Error resetting onboarding:", error);
  }
}
