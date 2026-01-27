import {
  parseUPIString,
  detectFraud,
  type RiskAssessment,
} from "./offline-fraud-detection";

/**
 * Backend connection status
 */
let backendAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 60000; // Re-check every 60 seconds

// Get backend API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000";

/**
 * Check if backend is available
 */
async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (backendAvailable !== null && now - lastCheckTime < CHECK_INTERVAL) {
    return backendAvailable;
  }
  
  try {
    // Try to reach backend with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${API_URL}/api/trpc/system.health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    backendAvailable = response.ok;
    lastCheckTime = now;
    return response.ok;
  } catch (error) {
    backendAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Call backend API using tRPC HTTP protocol
 */
async function callBackendAPI(procedure: string, input: any): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${API_URL}/api/trpc/${procedure}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.result?.data;
  } catch (error) {
    console.error("Backend API call failed:", error);
    throw error;
  }
}

/**
 * Hybrid UPI fraud detection
 * Tries backend first, falls back to offline detection
 */
export async function checkUPIFraudHybrid(
  upiString: string
): Promise<RiskAssessment & { source: "backend" | "offline" }> {
  // Try backend first
  const hasBackend = await isBackendAvailable();
  
  if (hasBackend) {
    try {
      const result = await callBackendAPI("fraud.scanQr", { upiString });
      
      // Check if result is successful
      if (!result.success) {
        throw new Error("Backend scan failed");
      }
      
      const data = result.data;
      
      // Convert backend response to RiskAssessment format
      return {
        source: "backend",
        paymentDetails: {
          vpa: data.upiParams.pa || "",
          payeeName: data.upiParams.pn || "",
          amount: parseFloat(data.upiParams.am || "0"),
          currency: data.upiParams.cu || "INR",
          transactionNote: data.upiParams.tn || "",
          mode: "pay",
          merchantCode: data.upiParams.mc || "",
          referenceId: data.upiParams.tr || "",
          rawString: upiString,
        },
        riskScore: data.riskAssessment.score,
        riskTier: data.riskAssessment.tier as "green" | "yellow" | "red",
        warnings: data.riskAssessment.warnings || [],
        isBlacklisted: data.riskAssessment.isBlacklisted || false,
        hasNameMismatch: data.vpaInfo.nameMismatch || false,
        isCollectRequest: data.riskAssessment.isCollectRequest || false,
        isNPCINonCompliant: !data.npciCompliance.compliant,
        hasSuspiciousNote: data.riskAssessment.hasSuspiciousNote || false,
        verifiedName: data.vpaInfo.registeredName || "",
        breakdown: {
          reputation: Math.round(data.riskAssessment.score * 0.4),
          heuristics: Math.round(data.riskAssessment.score * 0.3),
          identity: Math.round(data.riskAssessment.score * 0.3),
        },
      };
    } catch (error) {
      console.log("Backend verification failed, using offline mode:", error);
      // Fall through to offline mode
    }
  }
  
  // Fallback to offline detection
  const offlineResult = await detectFraud(upiString);
  return {
    ...offlineResult,
    source: "offline",
  };
}

/**
 * Get backend connection status for UI display
 */
export async function getBackendStatus(): Promise<{
  available: boolean;
  lastChecked: number;
  mode: "online" | "offline";
}> {
  const available = await isBackendAvailable();
  return {
    available,
    lastChecked: lastCheckTime,
    mode: available ? "online" : "offline",
  };
}

/**
 * Force refresh backend connection status
 */
export async function refreshBackendStatus(): Promise<boolean> {
  backendAvailable = null;
  return await isBackendAvailable();
}
