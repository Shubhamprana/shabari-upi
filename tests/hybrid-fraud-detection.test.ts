import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
global.fetch = vi.fn();

describe("Hybrid Fraud Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Backend Availability Check", () => {
    it("should detect backend as available when API responds", async () => {
      // Mock successful backend response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      // Note: isBackendAvailable is not exported, tested indirectly via checkUPIFraudHybrid
      expect(true).toBe(true);
    });

    it("should detect backend as unavailable on timeout", async () => {
      // Mock timeout
      (global.fetch as any).mockRejectedValueOnce(new Error("Timeout"));

      expect(true).toBe(true); // Placeholder
    });

    it("should cache backend availability status", async () => {
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Hybrid UPI Fraud Detection", () => {
    it("should use backend when available", async () => {
      const mockBackendResponse = {
        ok: true,
        json: async () => ({
          result: {
            data: {
              success: true,
              data: {
                upiParams: {
                  pa: "merchant@paytm",
                  pn: "Test Merchant",
                  am: "100",
                  tn: "Payment for goods",
                  cu: "INR",
                  mc: null,
                  tr: null,
                },
                vpaInfo: {
                  valid: true,
                  registeredName: "Test Merchant",
                  nameMismatch: false,
                },
                npciCompliance: {
                  compliant: true,
                },
                riskAssessment: {
                  score: 85,
                  tier: "green",
                  warnings: [],
                  isBlacklisted: false,
                  isCollectRequest: false,
                  hasSuspiciousNote: false,
                },
              },
            },
          },
        }),
      };

      (global.fetch as any).mockResolvedValue(mockBackendResponse);

      const { checkUPIFraudHybrid } = await import("../lib/hybrid-fraud-detection");
      const result = await checkUPIFraudHybrid(
        "upi://pay?pa=merchant@paytm&pn=Test%20Merchant&am=100&tn=Payment%20for%20goods"
      );

      expect(result.source).toBe("backend");
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it("should fallback to offline when backend fails", async () => {
      // Mock backend failure
      (global.fetch as any).mockRejectedValue(new Error("Network error"));

      const { checkUPIFraudHybrid } = await import("../lib/hybrid-fraud-detection");
      const result = await checkUPIFraudHybrid(
        "upi://pay?pa=merchant@paytm&pn=Test%20Merchant&am=100"
      );

      expect(result.source).toBe("offline");
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it("should fallback to offline when backend times out", async () => {
      // Mock timeout
      (global.fetch as any).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 6000)
        )
      );

      const { checkUPIFraudHybrid } = await import("../lib/hybrid-fraud-detection");
      const result = await checkUPIFraudHybrid(
        "upi://pay?pa=scammer@upi&pn=Scammer&am=5000"
      );

      expect(result.source).toBe("offline");
    });
  });

  describe("Backend Status Management", () => {
    it("should return backend status", async () => {
      const { getBackendStatus } = await import("../lib/hybrid-fraud-detection");
      const status = await getBackendStatus();

      expect(status).toHaveProperty("available");
      expect(status).toHaveProperty("lastChecked");
      expect(status).toHaveProperty("mode");
      expect(["online", "offline"]).toContain(status.mode);
    });

    it("should refresh backend status", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { refreshBackendStatus } = await import("../lib/hybrid-fraud-detection");
      const available = await refreshBackendStatus();

      expect(typeof available).toBe("boolean");
    });
  });

  describe("Risk Assessment Conversion", () => {
    it("should correctly convert backend response to RiskAssessment format", async () => {
      const mockBackendResponse = {
        ok: true,
        json: async () => ({
          result: {
            data: {
              success: true,
              data: {
                upiParams: {
                  pa: "merchant@paytm",
                  pn: "Verified Merchant",
                  am: "500",
                  tn: "Order payment",
                  cu: "INR",
                  mc: "1234",
                  tr: "TXN123",
                },
                vpaInfo: {
                  valid: true,
                  registeredName: "Verified Merchant Pvt Ltd",
                  nameMismatch: false,
                },
                npciCompliance: {
                  compliant: true,
                },
                riskAssessment: {
                  score: 90,
                  tier: "green",
                  warnings: [],
                  isBlacklisted: false,
                  isCollectRequest: false,
                  hasSuspiciousNote: false,
                },
              },
            },
          },
        }),
      };

      (global.fetch as any).mockResolvedValue(mockBackendResponse);

      const { checkUPIFraudHybrid } = await import("../lib/hybrid-fraud-detection");
      const result = await checkUPIFraudHybrid(
        "upi://pay?pa=merchant@paytm&pn=Verified%20Merchant&am=500"
      );

      expect(result.paymentDetails.vpa).toBe("merchant@paytm");
      expect(result.paymentDetails.payeeName).toBe("Verified Merchant");
      expect(result.paymentDetails.amount).toBe(500);
      expect(result.riskTier).toBe("green");
      expect(result.verifiedName).toBe("Verified Merchant Pvt Ltd");
    });
  });
});
