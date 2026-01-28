import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import crypto from "crypto";
import { scanLinks, extractUrls } from "./link-scanner.js";
import { isVpaInCache, addVpaToCache, updateScanStats } from "./redis-cache.js";
import { verifyVpa as verifyVpaApi, calculateNameMismatch, type VpaVerificationResult } from "./vpa-verification.js";
import { isVpaBlacklisted, addToBlacklist, logScan, getMerchantReputation, updateMerchantReputation } from "./fraud-db.js";

/**
 * UPI String Parser
 * Parses upi://pay strings and extracts payment parameters
 */
function parseUpiString(upiString: string) {
  try {
    // Remove upi://pay? prefix if present
    const cleanString = upiString.replace(/^upi:\/\/pay\?/i, "");
    
    // Parse query parameters
    const params = new URLSearchParams(cleanString);
    
    return {
      pa: params.get("pa") || null, // Payee VPA
      pn: params.get("pn") || null, // Payee name
      am: params.get("am") || null, // Amount
      tn: params.get("tn") || null, // Transaction note
      cu: params.get("cu") || "INR", // Currency
      mc: params.get("mc") || null, // Merchant code
      tr: params.get("tr") || null, // Transaction reference
    };
  } catch (error) {
    throw new Error("Invalid UPI string format");
  }
}

/**
 * NPCI Compliance Check
 * Enforces P2P collect request limit of ₹2,000 as per 2026 NPCI guidelines
 */
function checkNpciCompliance(amount: string | null, transactionNote: string | null): {
  compliant: boolean;
  violation: string | null;
} {
  // Check for collect request patterns
  const collectKeywords = ["collect", "request", "refund", "cashback", "return"];
  const isCollectRequest = transactionNote?.toLowerCase().split(" ").some(
    (word) => collectKeywords.includes(word)
  );

  if (isCollectRequest && amount) {
    const amountValue = parseFloat(amount);
    if (amountValue > 2000) {
      return {
        compliant: false,
        violation: "P2P collect request exceeds ₹2,000 limit (NPCI 2026)",
      };
    }
  }

  return { compliant: true, violation: null };
}

/**
 * Detect "Collect Request" fraud pattern
 * Flags URIs with amount parameter presented as Refund/Cashback
 */
function detectCollectFraud(params: ReturnType<typeof parseUpiString>): boolean {
  const { am, tn, pn } = params;
  
  // If amount is present, check if transaction note or payee name suggests refund/cashback
  if (am) {
    const suspiciousKeywords = ["refund", "cashback", "return", "credit", "reward"];
    const textToCheck = `${tn || ""} ${pn || ""}`.toLowerCase();
    
    return suspiciousKeywords.some((keyword) => textToCheck.includes(keyword));
  }
  
  return false;
}

/**
 * Mock VPA Verification - REPLACED
 * Now uses real Cashfree/Razorpay API via vpa-verification.ts
 * Returns the official bank registered name for the VPA
 */
async function verifyVpa(vpa: string): Promise<{
  valid: boolean;
  registeredName: string | null;
  bankName: string | null;
  accountType?: string;
  verificationMethod?: string;
}> {
  // Use real VPA verification API
  const result = await verifyVpaApi(vpa);
  
  return {
    valid: result.valid,
    registeredName: result.registeredName,
    bankName: result.bankName,
    accountType: result.accountType,
    verificationMethod: result.verificationMethod,
  };
}

/**
 * Name Mismatch Detection - UPDATED
 * Now uses the improved algorithm from vpa-verification.ts
 */
function detectNameMismatch(
  qrName: string | null,
  registeredName: string | null
): number {
  return calculateNameMismatch(qrName, registeredName);
}

/**
 * Blacklist Check - UPDATED
 * Now queries the actual fraud_vpas table via fraud-db.ts
 * Uses Redis cache first (fast <50ms), then falls back to database
 */
async function checkBlacklist(vpa: string): Promise<{
  isBlacklisted: boolean;
  fraudType?: string;
  confidence?: number;
}> {
  // Use the new database-connected blacklist service
  const result = await isVpaBlacklisted(vpa);
  
  return {
    isBlacklisted: result.blacklisted,
    fraudType: result.fraudType,
    confidence: result.confidence,
  };
}

/**
 * Weighted Risk Scorer (0-100)
 * Based on 2026 specifications:
 * - Reputation (40%): Blacklist matches
 * - Heuristics (30%): Collect-as-Receive patterns
 * - Identity (30%): Name mismatch or VPA newness
 */
async function calculateRiskScore(
  upiParams: ReturnType<typeof parseUpiString>,
  vpaInfo: Awaited<ReturnType<typeof verifyVpa>>,
  linkScanResult?: Awaited<ReturnType<typeof scanLinks>>
): Promise<{
  score: number;
  breakdown: {
    reputation: number;
    heuristics: number;
    identity: number;
  };
  tier: "green" | "yellow" | "red";
  linkThreats?: Array<{ url: string; threatType: string; source: string }>;
  blacklistInfo?: { fraudType?: string; confidence?: number };
}> {
  const { pa, pn } = upiParams;
  
  // Reputation Score (40%) - Now with fraud type info
  const blacklistResult = pa ? await checkBlacklist(pa) : { isBlacklisted: false };
  const reputationScore = blacklistResult.isBlacklisted ? 40 : 0;
  
  // Heuristics Score (30%)
  const hasCollectFraud = detectCollectFraud(upiParams);
  const hasLinkThreat = linkScanResult && !linkScanResult.safe;
  const heuristicsScore = hasCollectFraud ? 30 : hasLinkThreat ? 30 : 0;
  
  // Identity Score (30%)
  const nameMismatch = detectNameMismatch(pn, vpaInfo.registeredName);
  const identityScore = nameMismatch * 30;
  
  // Total Risk Score (0-100)
  const totalScore = Math.round(reputationScore + heuristicsScore + identityScore);
  
  // Determine tier
  let tier: "green" | "yellow" | "red";
  if (totalScore >= 0 && totalScore <= 39) {
    tier = "red"; // High risk
  } else if (totalScore >= 40 && totalScore <= 79) {
    tier = "yellow"; // Medium risk
  } else {
    tier = "green"; // Low risk (80-100)
  }
  
  // Invert score for display (higher = safer)
  const displayScore = 100 - totalScore;
  
  return {
    score: displayScore,
    breakdown: {
      reputation: reputationScore,
      heuristics: heuristicsScore,
      identity: Math.round(identityScore),
    },
    tier,
    linkThreats: linkScanResult?.threats,
    blacklistInfo: blacklistResult.isBlacklisted ? {
      fraudType: blacklistResult.fraudType,
      confidence: blacklistResult.confidence,
    } : undefined,
  };
}

/**
 * Fraud Detection Router
 * Provides endpoints for UPI fraud detection and risk assessment
 */
export const fraudDetectionRouter = router({
  /**
   * Scan QR Code
   * Analyzes UPI string and returns risk assessment
   */
  scanQr: publicProcedure
    .input(
      z.object({
        upiString: z.string().min(1, "UPI string is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { upiString } = input;
      
      // Parse UPI string
      const upiParams = parseUpiString(upiString);
      
      if (!upiParams.pa) {
        throw new Error("Invalid UPI string: missing payee VPA");
      }
      
      // Check NPCI compliance
      const npciCheck = checkNpciCompliance(upiParams.am, upiParams.tn);
      
      // Verify VPA and get registered name
      const vpaInfo = await verifyVpa(upiParams.pa);
      
      // Scan for malicious links in transaction note
      const linkScanResult = await scanLinks(upiParams.tn || "");
      
      // Calculate risk score (including link scan results)
      const riskAssessment = await calculateRiskScore(upiParams, vpaInfo, linkScanResult);
      
      // Update scan statistics in Redis
      const threatDetected = riskAssessment.tier === "red";
      await updateScanStats(threatDetected);
      
      // Log scan to database for analytics (DPDP compliant - VPA is hashed)
      await logScan(
        upiParams.pa,
        riskAssessment.score,
        riskAssessment.tier,
        threatDetected,
        linkScanResult?.threats?.length || 0,
        !npciCheck.compliant,
        ctx.req?.headers?.["user-agent"] as string | undefined,
        ctx.req?.ip
      );
      
      // Update merchant reputation if VPA is verified
      if (vpaInfo.valid && vpaInfo.registeredName) {
        await updateMerchantReputation(
          upiParams.pa,
          vpaInfo.registeredName,
          vpaInfo.bankName || undefined,
          riskAssessment.score
        );
      }
      
      return {
        success: true,
        data: {
          upiParams,
          vpaInfo,
          npciCompliance: npciCheck,
          riskAssessment,
          timestamp: new Date().toISOString(),
        },
      };
    }),
  
  /**
   * Verify VPA
   * Standalone endpoint to verify a VPA and get registered name
   */
  verifyVpa: publicProcedure
    .input(
      z.object({
        vpa: z.string().min(1, "VPA is required"),
      })
    )
    .query(async ({ input }) => {
      const vpaInfo = await verifyVpa(input.vpa);
      return {
        success: true,
        data: vpaInfo,
      };
    }),
  
  /**
   * Check Blacklist
   * Check if a VPA is blacklisted (returns boolean only, no VPA exposure)
   */
  checkBlacklist: publicProcedure
    .input(
      z.object({
        vpa: z.string().min(1, "VPA is required"),
      })
    )
    .query(async ({ input }) => {
      const result = await checkBlacklist(input.vpa);
      return {
        success: true,
        data: {
          blacklisted: result.isBlacklisted,
          fraudType: result.fraudType,
        },
      };
    }),
    
  /**
   * Report Fraud
   * Allows users to report a suspicious VPA (added to blacklist after review)
   */
  reportFraud: publicProcedure
    .input(
      z.object({
        vpa: z.string().min(1, "VPA is required"),
        fraudType: z.enum([
          "job_fraud",
          "electricity_scam",
          "lottery_scam",
          "refund_fraud",
          "phishing",
          "other",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { vpa, fraudType, notes } = input;
      
      // Add to blacklist with low confidence (needs admin verification)
      const added = await addToBlacklist(
        vpa,
        fraudType,
        "user_report",
        50, // Low confidence until verified
        notes
      );
      
      return {
        success: added,
        message: added 
          ? "Thank you! Your report has been submitted for review."
          : "Failed to submit report. Please try again.",
      };
    }),
    
  /**
   * Scan Generic URL
   * Scans a URL for malware/phishing using Server Logic (GSB, VT)
   */
  scanUrl: publicProcedure
    .input(
      z.object({
        url: z.string().min(1, "URL is required"),
      })
    )
    .mutation(async ({ input }) => {
       const result = await scanLinks(input.url);
       return {
         success: true,
         data: result
       };
    }),
});
