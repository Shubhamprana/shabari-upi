import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

// Import after mocking
import {
  addTrustedDomain,
  removeTrustedDomain,
  getTrustedDomains,
  isTrustedByUser,
  clearTrustedDomains,
} from "../lib/trusted-domains";

// Helper function to normalize domain (mirrors the logic in trusted-domains.ts)
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

describe("Trusted Domains", () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe("normalizeDomain helper", () => {
    it("should remove www prefix", () => {
      expect(normalizeDomain("www.example.com")).toBe("example.com");
    });

    it("should convert to lowercase", () => {
      expect(normalizeDomain("EXAMPLE.COM")).toBe("example.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeDomain("  example.com  ")).toBe("example.com");
    });

    it("should handle www and uppercase together", () => {
      expect(normalizeDomain("WWW.EXAMPLE.COM")).toBe("example.com");
    });

    it("should handle subdomains correctly", () => {
      expect(normalizeDomain("api.example.com")).toBe("api.example.com");
    });
  });

  describe("addTrustedDomain", () => {
    it("should add a new domain", async () => {
      const result = await addTrustedDomain("example.com");
      expect(result).toBe(true);
      
      const domains = await getTrustedDomains();
      expect(domains.length).toBe(1);
      expect(domains[0].domain).toBe("example.com");
    });

    it("should not add duplicate domains", async () => {
      await addTrustedDomain("example.com");
      const result = await addTrustedDomain("example.com");
      expect(result).toBe(false);
      
      const domains = await getTrustedDomains();
      expect(domains.length).toBe(1);
    });

    it("should normalize domains before adding", async () => {
      await addTrustedDomain("WWW.EXAMPLE.COM");
      
      const domains = await getTrustedDomains();
      expect(domains[0].domain).toBe("example.com");
    });
  });

  describe("removeTrustedDomain", () => {
    it("should remove an existing domain", async () => {
      await addTrustedDomain("example.com");
      const result = await removeTrustedDomain("example.com");
      expect(result).toBe(true);
      
      const domains = await getTrustedDomains();
      expect(domains.length).toBe(0);
    });

    it("should return false for non-existent domain", async () => {
      const result = await removeTrustedDomain("nonexistent.com");
      expect(result).toBe(false);
    });
  });

  describe("isTrustedByUser", () => {
    it("should return true for trusted domain", async () => {
      await addTrustedDomain("example.com");
      const result = await isTrustedByUser("example.com");
      expect(result).toBe(true);
    });

    it("should return false for untrusted domain", async () => {
      const result = await isTrustedByUser("untrusted.com");
      expect(result).toBe(false);
    });

    it("should match normalized domains", async () => {
      await addTrustedDomain("example.com");
      const result = await isTrustedByUser("WWW.EXAMPLE.COM");
      expect(result).toBe(true);
    });
  });

  describe("clearTrustedDomains", () => {
    it("should remove all trusted domains", async () => {
      await addTrustedDomain("example1.com");
      await addTrustedDomain("example2.com");
      await addTrustedDomain("example3.com");
      
      await clearTrustedDomains();
      
      const domains = await getTrustedDomains();
      expect(domains.length).toBe(0);
    });
  });
});
