import { describe, it, expect } from "vitest";
import { checkGoogleSafeBrowsing, checkVirusTotal } from "../server/link-scanner";

/**
 * API Key Validation Tests
 * Validates that external API keys are configured correctly
 */

describe("API Key Validation", () => {
  it("should validate Google Safe Browsing API key (or skip if not configured)", async () => {
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    
    if (!apiKey) {
      console.log("Google Safe Browsing API key not configured - skipping test");
      return;
    }
    
    // Test with a known safe URL
    const result = await checkGoogleSafeBrowsing(["https://www.google.com"]);
    
    // Should return a valid response (safe or unsafe)
    expect(result).toBeDefined();
    expect(result.safe).toBeDefined();
    expect(result.threats).toBeDefined();
    expect(Array.isArray(result.threats)).toBe(true);
  }, 10000); // 10 second timeout for API call

  it("should validate VirusTotal API key (or skip if not configured)", async () => {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    
    if (!apiKey) {
      console.log("VirusTotal API key not configured - skipping test");
      return;
    }
    
    // Test with a known safe URL
    const result = await checkVirusTotal("https://www.google.com");
    
    // Should return a valid response
    expect(result).toBeDefined();
    expect(result.safe).toBeDefined();
    expect(typeof result.malicious).toBe("number");
    expect(typeof result.suspicious).toBe("number");
    expect(typeof result.harmless).toBe("number");
  }, 15000); // 15 second timeout for API call (VirusTotal is slower)
});
