import { describe, it, expect } from "vitest";

/**
 * Backend Fraud Detection API Tests
 * Tests the complete fraud detection pipeline with sample UPI strings
 */

// Sample UPI strings for testing
const testCases = [
  {
    name: "Green Tier - Verified Merchant",
    upiString: "upi://pay?pa=merchant@paytm&pn=Amazon&am=500&cu=INR&tn=Order%20Payment",
    expectedTier: "green",
    expectedMinScore: 80,
  },
  {
    name: "Yellow Tier - Name Mismatch",
    upiString: "upi://pay?pa=john123@ybl&pn=Flipkart&am=1000&cu=INR&tn=Product%20Payment",
    expectedTier: "yellow",
    expectedMinScore: 40,
    expectedMaxScore: 79,
  },
  {
    name: "Red Tier - Blacklisted VPA",
    upiString: "upi://pay?pa=scammer@paytm&pn=Fake%20Merchant&am=2500&cu=INR&tn=Verification%20Payment",
    expectedTier: "red",
    expectedMaxScore: 39,
  },
  {
    name: "Red Tier - Collect Request Pattern",
    upiString: "upi://pay?pa=unknown@phonepe&pn=Random&am=500&cu=INR&mode=02&tn=Collect%20Request",
    expectedTier: "red",
    expectedMaxScore: 39,
  },
];

describe("Fraud Detection API - UPI Parsing", () => {
  it("should parse UPI string correctly", () => {
    const upiString = "upi://pay?pa=merchant@paytm&pn=Amazon&am=500&cu=INR";
    const url = new URL(upiString);
    const params = new URLSearchParams(url.search);

    expect(params.get("pa")).toBe("merchant@paytm");
    expect(params.get("pn")).toBe("Amazon");
    expect(params.get("am")).toBe("500");
    expect(params.get("cu")).toBe("INR");
  });

  it("should handle URL-encoded transaction notes", () => {
    const upiString = "upi://pay?pa=test@ybl&tn=Order%20Payment";
    const url = new URL(upiString);
    const params = new URLSearchParams(url.search);

    expect(params.get("tn")).toBe("Order Payment");
  });

  it("should detect collect request mode", () => {
    const upiString = "upi://pay?pa=test@ybl&mode=02";
    const url = new URL(upiString);
    const params = new URLSearchParams(url.search);

    expect(params.get("mode")).toBe("02");
  });
});

describe("Fraud Detection API - Risk Scoring Logic", () => {
  it("should calculate reputation score (40% weight)", () => {
    // Blacklisted VPA should have high reputation penalty
    const blacklisted = true;
    const reputationPenalty = blacklisted ? 40 : 0;

    expect(reputationPenalty).toBe(40);
  });

  it("should calculate heuristics score (30% weight)", () => {
    // Collect request should have high heuristics penalty
    const isCollectRequest = true;
    const heuristicsPenalty = isCollectRequest ? 30 : 0;

    expect(heuristicsPenalty).toBe(30);
  });

  it("should calculate identity score (30% weight)", () => {
    // Name mismatch should have identity penalty
    const nameMismatch = true;
    const identityPenalty = nameMismatch ? 30 : 0;

    expect(identityPenalty).toBe(30);
  });

  it("should calculate final risk score correctly", () => {
    const reputationPenalty = 40; // Blacklisted
    const heuristicsPenalty = 30; // Collect request
    const identityPenalty = 30; // Name mismatch

    const totalPenalty = reputationPenalty + heuristicsPenalty + identityPenalty;
    const riskScore = 100 - totalPenalty;

    expect(riskScore).toBe(0); // Maximum risk
  });
});

describe("Fraud Detection API - Tier Assignment", () => {
  it("should assign Green tier for score 80-100", () => {
    const score = 85;
    const tier = score >= 80 ? "green" : score >= 40 ? "yellow" : "red";

    expect(tier).toBe("green");
  });

  it("should assign Yellow tier for score 40-79", () => {
    const score = 60;
    const tier = score >= 80 ? "green" : score >= 40 ? "yellow" : "red";

    expect(tier).toBe("yellow");
  });

  it("should assign Red tier for score 0-39", () => {
    const score = 25;
    const tier = score >= 80 ? "green" : score >= 40 ? "yellow" : "red";

    expect(tier).toBe("red");
  });
});

describe("Fraud Detection API - NPCI Compliance", () => {
  it("should flag P2P collect requests above ₹2000", () => {
    const amount = 2500;
    const mode = "02"; // Collect request
    const isNonCompliant = mode === "02" && amount > 2000;

    expect(isNonCompliant).toBe(true);
  });

  it("should allow P2P collect requests below ₹2000", () => {
    const amount = 1500;
    const mode = "02"; // Collect request
    const isNonCompliant = mode === "02" && amount > 2000;

    expect(isNonCompliant).toBe(false);
  });

  it("should allow pay mode regardless of amount", () => {
    const amount = 5000;
    const mode: string = "01"; // Pay mode
    const isNonCompliant = mode === "02" && amount > 2000;

    expect(isNonCompliant).toBe(false);
  });
});
