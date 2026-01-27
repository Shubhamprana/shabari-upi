import { describe, it, expect } from "vitest";

/**
 * Silent Guard Logic Tests (without Expo dependencies)
 * Tests core fraud detection patterns and VPA extraction
 */

// Fraud patterns (copied from silent-guard.ts)
const FRAUD_PATTERNS = [
  /collect\s+request/i,
  /requested\s+money/i,
  /money\s+request/i,
  /payment\s+request/i,
  /refund\s+request/i,
  /cashback\s+request/i,
  /verification\s+payment/i,
  /confirm\s+payment/i,
];

// VPA extraction regex
const VPA_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/g;

function detectFraudPattern(text: string): boolean {
  return FRAUD_PATTERNS.some((pattern) => pattern.test(text));
}

function extractVpa(text: string): string[] {
  const matches = text.match(VPA_REGEX);
  return matches || [];
}

describe("Silent Guard - Fraud Pattern Detection", () => {
  it("should detect 'collect request' pattern", () => {
    const text = "You have received a collect request from merchant@paytm for ₹500";
    expect(detectFraudPattern(text)).toBe(true);
  });

  it("should detect 'requested money' pattern", () => {
    const text = "John requested money from you via PhonePe";
    expect(detectFraudPattern(text)).toBe(true);
  });

  it("should detect 'payment request' pattern", () => {
    const text = "New payment request received";
    expect(detectFraudPattern(text)).toBe(true);
  });

  it("should detect 'refund request' pattern", () => {
    const text = "Refund request initiated for your order";
    expect(detectFraudPattern(text)).toBe(true);
  });

  it("should detect 'verification payment' pattern", () => {
    const text = "Complete verification payment to activate account";
    expect(detectFraudPattern(text)).toBe(true);
  });

  it("should not detect fraud in normal payment notification", () => {
    const text = "Payment of ₹500 received from John";
    expect(detectFraudPattern(text)).toBe(false);
  });

  it("should not detect fraud in balance notification", () => {
    const text = "Your current balance is ₹1,234.56";
    expect(detectFraudPattern(text)).toBe(false);
  });
});

describe("Silent Guard - VPA Extraction", () => {
  it("should extract VPA from notification text", () => {
    const text = "Collect request from merchant@paytm for ₹500";
    const vpas = extractVpa(text);
    
    expect(vpas).toHaveLength(1);
    expect(vpas[0]).toBe("merchant@paytm");
  });

  it("should extract multiple VPAs", () => {
    const text = "Transfer from john@phonepe to merchant@paytm";
    const vpas = extractVpa(text);
    
    expect(vpas).toHaveLength(2);
    expect(vpas).toContain("john@phonepe");
    expect(vpas).toContain("merchant@paytm");
  });

  it("should extract VPA with dots and hyphens", () => {
    const text = "Payment from john.doe-123@ybl";
    const vpas = extractVpa(text);
    
    expect(vpas).toHaveLength(1);
    expect(vpas[0]).toBe("john.doe-123@ybl");
  });

  it("should return empty array when no VPA found", () => {
    const text = "Your payment was successful";
    const vpas = extractVpa(text);
    
    expect(vpas).toHaveLength(0);
  });
});

describe("UPI Link Detection", () => {
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

  it("should detect phonepe.com as payment link", () => {
    expect(isPaymentLink("phonepe.com")).toBe(true);
    expect(isPaymentLink("www.phonepe.com")).toBe(true);
  });

  it("should detect paytm.com as payment link", () => {
    expect(isPaymentLink("paytm.com")).toBe(true);
    expect(isPaymentLink("secure.paytm.com")).toBe(true);
  });

  it("should detect upi domains", () => {
    expect(isPaymentLink("upi.example.com")).toBe(true);
  });

  it("should not detect google.com as payment link", () => {
    expect(isPaymentLink("google.com")).toBe(false);
    expect(isPaymentLink("www.google.com")).toBe(false);
  });

  it("should not detect facebook.com as payment link", () => {
    expect(isPaymentLink("facebook.com")).toBe(false);
  });
});
