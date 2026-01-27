/**
 * Offline Fraud Detection Module
 * 
 * This module provides client-side fraud detection that works without
 * requiring a backend server connection. It includes:
 * - UPI string parsing
 * - Local blacklist checking
 * - Risk scoring algorithm
 * - Heuristic pattern detection
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export interface UPIPaymentDetails {
  vpa: string;
  payeeName: string;
  amount: number;
  currency: string;
  transactionNote: string;
  mode: string;
  merchantCode: string;
  referenceId: string;
  rawString: string;
}

export interface RiskAssessment {
  riskScore: number;
  riskTier: "green" | "yellow" | "red";
  isBlacklisted: boolean;
  isCollectRequest: boolean;
  isNPCINonCompliant: boolean;
  hasNameMismatch: boolean;
  hasSuspiciousNote: boolean;
  warnings: string[];
  breakdown: {
    reputation: number;
    heuristics: number;
    identity: number;
  };
  verifiedName: string;
  paymentDetails: UPIPaymentDetails;
}

// Local blacklist storage key
const BLACKLIST_STORAGE_KEY = "@shabari_blacklist";

// Default blacklist (embedded for offline use)
const DEFAULT_BLACKLIST: string[] = [
  "scammer@paytm",
  "fraud@ybl",
  "fake@phonepe",
  "scam@okaxis",
  "fraudster@upi",
];

// Suspicious keywords in transaction notes
const SUSPICIOUS_KEYWORDS = [
  "lottery",
  "prize",
  "winner",
  "claim",
  "urgent",
  "verify",
  "verification",
  "otp",
  "password",
  "pin",
  "refund",
  "cashback",
  "reward",
  "lucky",
  "selected",
  "congratulations",
  "free",
  "gift",
  "bonus",
];

// Known legitimate merchant patterns
const LEGITIMATE_PATTERNS = [
  /^merchant@/i,
  /^paytm@/i,
  /^amazon@/i,
  /^flipkart@/i,
  /^swiggy@/i,
  /^zomato@/i,
  /^uber@/i,
  /^ola@/i,
  /^bigbasket@/i,
  /^grofers@/i,
];

/**
 * Parse UPI string into structured payment details
 */
export function parseUPIString(upiString: string): UPIPaymentDetails | null {
  try {
    // Handle both upi:// and upi:pay formats
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
      mode: params.get("mode") || "00", // 00 = pay, 02 = collect
      merchantCode: params.get("mc") || "",
      referenceId: params.get("tr") || "",
      rawString: upiString,
    };
  } catch (error) {
    console.error("Error parsing UPI string:", error);
    return null;
  }
}

/**
 * Get local blacklist from storage
 */
async function getLocalBlacklist(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_BLACKLIST;
  } catch {
    return DEFAULT_BLACKLIST;
  }
}

/**
 * Add VPA to local blacklist
 */
export async function addToBlacklist(vpa: string): Promise<void> {
  try {
    const blacklist = await getLocalBlacklist();
    if (!blacklist.includes(vpa.toLowerCase())) {
      blacklist.push(vpa.toLowerCase());
      await AsyncStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklist));
    }
  } catch (error) {
    console.error("Error adding to blacklist:", error);
  }
}

/**
 * Check if VPA is in local blacklist
 */
async function checkBlacklist(vpa: string): Promise<boolean> {
  const blacklist = await getLocalBlacklist();
  return blacklist.includes(vpa.toLowerCase());
}

/**
 * Check for suspicious keywords in transaction note
 */
function checkSuspiciousNote(note: string): boolean {
  const lowerNote = note.toLowerCase();
  return SUSPICIOUS_KEYWORDS.some((keyword) => lowerNote.includes(keyword));
}

/**
 * Check if VPA matches known legitimate patterns
 */
function isLegitimatePattern(vpa: string): boolean {
  return LEGITIMATE_PATTERNS.some((pattern) => pattern.test(vpa));
}

/**
 * Simulate VPA verification (returns mock verified name)
 * In production, this would call a real VPA verification API
 */
function getVerifiedName(vpa: string): string {
  // Extract name from VPA for simulation
  const parts = vpa.split("@");
  if (parts.length > 0) {
    // Capitalize first letter of each word
    return parts[0]
      .replace(/[0-9]/g, "")
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim() || "Unknown";
  }
  return "Unknown";
}

/**
 * Check for name mismatch between payee name and verified name
 */
function checkNameMismatch(payeeName: string, verifiedName: string): boolean {
  if (!payeeName || !verifiedName) return false;
  
  const normalizedPayee = payeeName.toLowerCase().replace(/[^a-z]/g, "");
  const normalizedVerified = verifiedName.toLowerCase().replace(/[^a-z]/g, "");
  
  // Check if names are significantly different
  if (normalizedPayee.length < 3 || normalizedVerified.length < 3) {
    return false;
  }
  
  // Check if one contains the other
  if (normalizedPayee.includes(normalizedVerified) || normalizedVerified.includes(normalizedPayee)) {
    return false;
  }
  
  // Calculate similarity
  const similarity = calculateSimilarity(normalizedPayee, normalizedVerified);
  return similarity < 0.5; // Less than 50% similar = mismatch
}

/**
 * Calculate string similarity (Jaccard index)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(""));
  const set2 = new Set(str2.split(""));
  
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Main fraud detection function - works completely offline
 */
export async function detectFraud(upiString: string): Promise<RiskAssessment> {
  const paymentDetails = parseUPIString(upiString);
  
  if (!paymentDetails) {
    // Return high risk for invalid UPI strings
    return {
      riskScore: 0,
      riskTier: "red",
      isBlacklisted: false,
      isCollectRequest: false,
      isNPCINonCompliant: false,
      hasNameMismatch: false,
      hasSuspiciousNote: false,
      warnings: ["Invalid UPI QR code format"],
      breakdown: { reputation: 0, heuristics: 0, identity: 0 },
      verifiedName: "Unknown",
      paymentDetails: {
        vpa: "",
        payeeName: "",
        amount: 0,
        currency: "INR",
        transactionNote: "",
        mode: "00",
        merchantCode: "",
        referenceId: "",
        rawString: upiString,
      },
    };
  }

  const warnings: string[] = [];
  let reputationScore = 40; // Max 40 points
  let heuristicsScore = 30; // Max 30 points
  let identityScore = 30; // Max 30 points

  // 1. Check blacklist (Reputation - 40%)
  const isBlacklisted = await checkBlacklist(paymentDetails.vpa);
  if (isBlacklisted) {
    reputationScore = 0;
    warnings.push("This VPA is in the fraud blacklist");
  } else if (isLegitimatePattern(paymentDetails.vpa)) {
    reputationScore = 40; // Full score for known merchants
  } else {
    reputationScore = 25; // Neutral score for unknown VPAs
  }

  // 2. Check heuristics (30%)
  const isCollectRequest = paymentDetails.mode === "02";
  const isNPCINonCompliant = isCollectRequest && paymentDetails.amount > 2000;
  const hasSuspiciousNote = checkSuspiciousNote(paymentDetails.transactionNote);

  if (isCollectRequest) {
    heuristicsScore -= 15;
    warnings.push("This is a Collect Request - money will be DEBITED from your account");
  }

  if (isNPCINonCompliant) {
    heuristicsScore -= 10;
    warnings.push("Collect request exceeds NPCI limit of ₹2,000");
  }

  if (hasSuspiciousNote) {
    heuristicsScore -= 15;
    warnings.push("Transaction note contains suspicious keywords");
  }

  // 3. Check identity (30%)
  const verifiedName = getVerifiedName(paymentDetails.vpa);
  const hasNameMismatch = checkNameMismatch(paymentDetails.payeeName, verifiedName);

  if (hasNameMismatch) {
    identityScore -= 20;
    warnings.push(`Name mismatch: "${paymentDetails.payeeName}" vs verified "${verifiedName}"`);
  }

  // Calculate final score
  const riskScore = Math.max(0, Math.min(100, reputationScore + heuristicsScore + identityScore));

  // Determine risk tier
  let riskTier: "green" | "yellow" | "red";
  if (riskScore >= 80) {
    riskTier = "green";
  } else if (riskScore >= 40) {
    riskTier = "yellow";
  } else {
    riskTier = "red";
  }

  return {
    riskScore,
    riskTier,
    isBlacklisted,
    isCollectRequest,
    isNPCINonCompliant,
    hasNameMismatch,
    hasSuspiciousNote,
    warnings,
    breakdown: {
      reputation: reputationScore,
      heuristics: heuristicsScore,
      identity: identityScore,
    },
    verifiedName,
    paymentDetails,
  };
}
