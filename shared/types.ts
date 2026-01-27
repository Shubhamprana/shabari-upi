/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * Shabari App Types
 * Scan records and risk assessment data structures
 */

/**
 * Risk tier classification
 */
export type RiskTier = "green" | "yellow" | "red";

/**
 * UPI payment parameters parsed from upi://pay string
 */
export interface UpiParams {
  pa: string | null; // Payee VPA
  pn: string | null; // Payee name
  am: string | null; // Amount
  tn: string | null; // Transaction note
  cu: string; // Currency (default: INR)
  mc: string | null; // Merchant code
  tr: string | null; // Transaction reference
}

/**
 * VPA verification information
 */
export interface VpaInfo {
  valid: boolean;
  registeredName: string | null;
  bankName: string | null;
}

/**
 * Risk assessment breakdown
 */
export interface RiskBreakdown {
  reputation: number; // 0-40 points
  heuristics: number; // 0-30 points
  identity: number; // 0-30 points
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  score: number; // 0-100 (higher = safer)
  breakdown: RiskBreakdown;
  tier: RiskTier;
}

/**
 * NPCI compliance check result
 */
export interface NpciCompliance {
  compliant: boolean;
  violation: string | null;
}

/**
 * Complete scan result from backend
 */
export interface ScanResult {
  upiParams: UpiParams;
  vpaInfo: VpaInfo;
  npciCompliance: NpciCompliance;
  riskAssessment: RiskAssessment;
  timestamp: string;
}

/**
 * Scan record stored in AsyncStorage
 */
export interface ScanRecord {
  id: string; // Unique identifier (UUID)
  upiString: string; // Original UPI string
  merchantName: string; // Display name (from pn or registeredName)
  vpa: string; // Payee VPA
  amount: string | null; // Amount (if present)
  riskScore: number; // 0-100
  riskTier: RiskTier; // green/yellow/red
  timestamp: number; // Unix timestamp (ms)
  scanResult: ScanResult; // Full scan result for detail view
}

/**
 * Scan history statistics
 */
export interface ScanStats {
  totalScans: number;
  scansToday: number;
  threatsBlocked: number; // Red tier scans
  greenScans: number;
  yellowScans: number;
  redScans: number;
}
