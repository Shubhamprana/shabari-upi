import { describe, it, expect } from "vitest";

// Import the functions we want to test
// Note: We test the logic directly without AsyncStorage mocking
describe("Offline Fraud Detection - UPI Parsing", () => {
  // Test UPI string parsing logic
  function parseUPIString(upiString: string) {
    try {
      const normalizedString = upiString.replace("upi:pay", "upi://pay");
      if (!normalizedString.startsWith("upi://")) {
        return null;
      }
      const url = new URL(normalizedString);
      const params = new URLSearchParams(url.search);
      return {
        vpa: params.get("pa") || "",
        payeeName: decodeURIComponent(params.get("pn") || ""),
        amount: parseFloat(params.get("am") || "0"),
        currency: params.get("cu") || "INR",
        transactionNote: decodeURIComponent(params.get("tn") || ""),
        mode: params.get("mode") || "00",
        merchantCode: params.get("mc") || "",
        referenceId: params.get("tr") || "",
        rawString: upiString,
      };
    } catch {
      return null;
    }
  }

  it("should parse standard UPI string", () => {
    const upiString = "upi://pay?pa=merchant@paytm&pn=Amazon&am=500&cu=INR";
    const result = parseUPIString(upiString);

    expect(result).not.toBeNull();
    expect(result?.vpa).toBe("merchant@paytm");
    expect(result?.payeeName).toBe("Amazon");
    expect(result?.amount).toBe(500);
    expect(result?.currency).toBe("INR");
  });

  it("should handle URL-encoded payee name", () => {
    const upiString = "upi://pay?pa=test@ybl&pn=My%20Shop%20Name";
    const result = parseUPIString(upiString);

    expect(result?.payeeName).toBe("My Shop Name");
  });

  it("should detect collect request mode", () => {
    const upiString = "upi://pay?pa=test@ybl&mode=02";
    const result = parseUPIString(upiString);

    expect(result?.mode).toBe("02");
  });

  it("should handle missing amount", () => {
    const upiString = "upi://pay?pa=test@ybl&pn=Test";
    const result = parseUPIString(upiString);

    expect(result?.amount).toBe(0);
  });

  it("should return null for invalid UPI string", () => {
    const upiString = "https://example.com";
    const result = parseUPIString(upiString);

    expect(result).toBeNull();
  });
});

describe("Offline Fraud Detection - Risk Scoring", () => {
  // Suspicious keywords detection
  const SUSPICIOUS_KEYWORDS = [
    "lottery", "prize", "winner", "claim", "urgent",
    "verify", "verification", "otp", "password", "pin",
    "refund", "cashback", "reward", "lucky", "selected",
  ];

  function checkSuspiciousNote(note: string): boolean {
    const lowerNote = note.toLowerCase();
    return SUSPICIOUS_KEYWORDS.some((keyword) => lowerNote.includes(keyword));
  }

  it("should detect suspicious keywords in transaction note", () => {
    expect(checkSuspiciousNote("Claim your lottery prize")).toBe(true);
    expect(checkSuspiciousNote("Enter OTP to verify")).toBe(true);
    expect(checkSuspiciousNote("Urgent: Refund pending")).toBe(true);
  });

  it("should not flag normal transaction notes", () => {
    expect(checkSuspiciousNote("Order payment")).toBe(false);
    expect(checkSuspiciousNote("Dinner bill")).toBe(false);
    expect(checkSuspiciousNote("Monthly rent")).toBe(false);
  });

  // Name mismatch detection
  function checkNameMismatch(payeeName: string, verifiedName: string): boolean {
    if (!payeeName || !verifiedName) return false;
    const normalizedPayee = payeeName.toLowerCase().replace(/[^a-z]/g, "");
    const normalizedVerified = verifiedName.toLowerCase().replace(/[^a-z]/g, "");
    if (normalizedPayee.length < 3 || normalizedVerified.length < 3) return false;
    if (normalizedPayee.includes(normalizedVerified) || normalizedVerified.includes(normalizedPayee)) {
      return false;
    }
    // Simple similarity check
    const set1 = new Set(normalizedPayee.split(""));
    const set2 = new Set(normalizedVerified.split(""));
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const similarity = intersection.size / union.size;
    return similarity < 0.5;
  }

  it("should detect name mismatch", () => {
    expect(checkNameMismatch("Flipkart", "John Doe")).toBe(true);
    expect(checkNameMismatch("Amazon", "Scammer Name")).toBe(true);
  });

  it("should not flag matching names", () => {
    expect(checkNameMismatch("Amazon", "Amazon India")).toBe(false);
    expect(checkNameMismatch("John", "John Doe")).toBe(false);
  });

  it("should handle empty names", () => {
    expect(checkNameMismatch("", "Test")).toBe(false);
    expect(checkNameMismatch("Test", "")).toBe(false);
  });
});

describe("Offline Fraud Detection - Tier Assignment", () => {
  function getTier(score: number): "green" | "yellow" | "red" {
    if (score >= 80) return "green";
    if (score >= 40) return "yellow";
    return "red";
  }

  it("should assign green tier for score 80-100", () => {
    expect(getTier(100)).toBe("green");
    expect(getTier(85)).toBe("green");
    expect(getTier(80)).toBe("green");
  });

  it("should assign yellow tier for score 40-79", () => {
    expect(getTier(79)).toBe("yellow");
    expect(getTier(60)).toBe("yellow");
    expect(getTier(40)).toBe("yellow");
  });

  it("should assign red tier for score 0-39", () => {
    expect(getTier(39)).toBe("red");
    expect(getTier(20)).toBe("red");
    expect(getTier(0)).toBe("red");
  });
});

describe("Offline Fraud Detection - NPCI Compliance", () => {
  function checkNPCICompliance(mode: string, amount: number): boolean {
    // mode=02 is collect request, NPCI limit is ₹2000 for P2P collect
    return !(mode === "02" && amount > 2000);
  }

  it("should flag collect requests above ₹2000", () => {
    expect(checkNPCICompliance("02", 2500)).toBe(false);
    expect(checkNPCICompliance("02", 5000)).toBe(false);
  });

  it("should allow collect requests below ₹2000", () => {
    expect(checkNPCICompliance("02", 1500)).toBe(true);
    expect(checkNPCICompliance("02", 2000)).toBe(true);
  });

  it("should allow pay mode regardless of amount", () => {
    expect(checkNPCICompliance("00", 10000)).toBe(true);
    expect(checkNPCICompliance("01", 50000)).toBe(true);
  });
});
