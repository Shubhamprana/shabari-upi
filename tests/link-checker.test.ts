import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocking
import { checkLink } from "../lib/link-checker";

describe("Link Checker Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Safe Links", () => {
    it("should mark google.com as safe", async () => {
      const result = await checkLink("https://google.com");
      expect(result.riskLevel).toBe("safe");
      expect(result.domain).toBe("google.com");
      expect(result.checks.isHTTPS).toBe(true);
    });

    it("should mark amazon.in as safe", async () => {
      const result = await checkLink("https://www.amazon.in/product");
      expect(result.riskLevel).toBe("safe");
      expect(result.domain).toBe("amazon.in");
    });

    it("should mark paytm.com as safe", async () => {
      const result = await checkLink("https://paytm.com/payment");
      expect(result.riskLevel).toBe("safe");
      expect(result.domain).toBe("paytm.com");
    });
  });

  describe("URL Shorteners", () => {
    it("should detect bit.ly as URL shortener", async () => {
      const result = await checkLink("https://bit.ly/abc123");
      expect(result.checks.isShortener).toBe(true);
      expect(result.warnings).toContain("This is a shortened URL - destination hidden");
    });

    it("should detect tinyurl.com as URL shortener", async () => {
      const result = await checkLink("https://tinyurl.com/xyz");
      expect(result.checks.isShortener).toBe(true);
    });
  });

  describe("Phishing Detection", () => {
    it("should detect fake SBI login page", async () => {
      const result = await checkLink("https://sbi-login-secure.xyz/verify");
      expect(result.checks.isKnownPhishing).toBe(true);
      expect(result.riskLevel).toBe("dangerous");
    });

    it("should detect fake Paytm verification", async () => {
      const result = await checkLink("https://paytm-verify-prize.com/claim");
      expect(result.checks.isKnownPhishing).toBe(true);
    });

    it("should detect fake UPI prize scam", async () => {
      const result = await checkLink("https://upi-prize-winner.site/claim");
      expect(result.checks.isKnownPhishing).toBe(true);
    });
  });

  describe("Suspicious TLDs", () => {
    it("should flag .xyz domain as suspicious", async () => {
      const result = await checkLink("https://random-site.xyz");
      expect(result.riskScore).toBeLessThan(100);
    });

    it("should flag .top domain as suspicious", async () => {
      const result = await checkLink("https://unknown.top");
      expect(result.riskScore).toBeLessThan(100);
    });
  });

  describe("HTTPS Check", () => {
    it("should flag HTTP as insecure", async () => {
      const result = await checkLink("http://example.com");
      expect(result.checks.isHTTPS).toBe(false);
      expect(result.warnings).toContain("Connection is not secure (HTTP)");
    });

    it("should mark HTTPS as secure", async () => {
      const result = await checkLink("https://example.com");
      expect(result.checks.isHTTPS).toBe(true);
    });
  });

  describe("Suspicious Patterns", () => {
    it("should detect executable file links", async () => {
      const result = await checkLink("https://download.com/file.apk");
      expect(result.checks.hasSuspiciousPattern).toBe(true);
    });

    it("should detect @ in URL path", async () => {
      const result = await checkLink("https://evil.com/login@google.com");
      expect(result.checks.hasSuspiciousPattern).toBe(true);
    });
  });

  describe("URL Normalization", () => {
    it("should add https:// if missing", async () => {
      const result = await checkLink("google.com");
      expect(result.url).toContain("https://");
    });

    it("should handle URLs with www prefix", async () => {
      const result = await checkLink("https://www.google.com");
      expect(result.domain).toBe("google.com");
    });
  });

  describe("Risk Scoring", () => {
    it("should give high score to trusted domains", async () => {
      const result = await checkLink("https://github.com");
      expect(result.riskScore).toBeGreaterThanOrEqual(80);
    });

    it("should give low score to phishing sites", async () => {
      const result = await checkLink("https://sbi-login-verify.xyz");
      expect(result.riskScore).toBeLessThan(50);
    });
  });
});
