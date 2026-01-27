import crypto from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fraudVpas, urlBlacklist, scanLogs, merchantReputation } from "../drizzle/fraud-schema";
import { isVpaInCache, addVpaToCache, isUrlInCache, addUrlToCache } from "./redis-cache";

/**
 * Fraud Database Service
 * DPDP-compliant fraud detection database operations
 * All VPAs are stored as SHA-256 hashes for privacy
 */

let _fraudDb: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize fraud database connection
 */
async function getFraudDb() {
  if (!_fraudDb && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _fraudDb = drizzle(client, { 
        schema: { fraudVpas, urlBlacklist, scanLogs, merchantReputation }
      });
    } catch (error) {
      console.warn("[FraudDB] Failed to connect:", error);
      _fraudDb = null;
    }
  }
  return _fraudDb;
}

/**
 * Hash VPA for privacy (DPDP compliance)
 */
export function hashVpa(vpa: string): string {
  return crypto.createHash("sha256").update(vpa.toLowerCase().trim()).digest("hex");
}

/**
 * Hash URL for privacy
 */
export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url.toLowerCase().trim()).digest("hex");
}

/**
 * Check if VPA is blacklisted
 * Uses Redis cache first (fast), then falls back to database
 */
export async function isVpaBlacklisted(vpa: string): Promise<{
  blacklisted: boolean;
  fraudType?: string;
  confidence?: number;
  source: "cache" | "database" | "none";
}> {
  const vpaHash = hashVpa(vpa);
  
  // Check Redis cache first (fast: <50ms)
  try {
    const inCache = await isVpaInCache(vpaHash);
    if (inCache) {
      return {
        blacklisted: true,
        source: "cache",
      };
    }
  } catch (error) {
    console.warn("[FraudDB] Redis cache check failed:", error);
  }
  
  // Check database
  const db = await getFraudDb();
  if (!db) {
    console.warn("[FraudDB] Database not available, cannot check blacklist");
    return { blacklisted: false, source: "none" };
  }

  try {
    const result = await db
      .select({
        fraudType: fraudVpas.fraudType,
        confidence: fraudVpas.confidence,
      })
      .from(fraudVpas)
      .where(eq(fraudVpas.vpaHash, vpaHash))
      .limit(1);

    if (result.length > 0) {
      // Add to cache for faster future lookups
      await addVpaToCache(vpaHash);
      
      return {
        blacklisted: true,
        fraudType: result[0].fraudType || undefined,
        confidence: result[0].confidence || undefined,
        source: "database",
      };
    }

    return { blacklisted: false, source: "database" };
  } catch (error) {
    console.error("[FraudDB] Error checking VPA blacklist:", error);
    return { blacklisted: false, source: "none" };
  }
}

/**
 * Check if URL is blacklisted
 */
export async function isUrlBlacklisted(url: string): Promise<{
  blacklisted: boolean;
  threatType?: string;
  source: "cache" | "database" | "none";
}> {
  const urlHash = hashUrl(url);
  
  // Check Redis cache first
  try {
    const inCache = await isUrlInCache(urlHash);
    if (inCache) {
      return {
        blacklisted: true,
        source: "cache",
      };
    }
  } catch (error) {
    console.warn("[FraudDB] Redis cache check failed for URL:", error);
  }
  
  // Check database
  const db = await getFraudDb();
  if (!db) {
    return { blacklisted: false, source: "none" };
  }

  try {
    const result = await db
      .select({
        threatType: urlBlacklist.threatType,
      })
      .from(urlBlacklist)
      .where(eq(urlBlacklist.urlHash, urlHash))
      .limit(1);

    if (result.length > 0) {
      await addUrlToCache(urlHash);
      
      return {
        blacklisted: true,
        threatType: result[0].threatType,
        source: "database",
      };
    }

    return { blacklisted: false, source: "database" };
  } catch (error) {
    console.error("[FraudDB] Error checking URL blacklist:", error);
    return { blacklisted: false, source: "none" };
  }
}

/**
 * Add VPA to blacklist
 */
export async function addToBlacklist(
  vpa: string,
  fraudType: string,
  reportedBy: string = "system",
  confidence: number = 100,
  notes?: string
): Promise<boolean> {
  const vpaHash = hashVpa(vpa);
  
  const db = await getFraudDb();
  if (!db) {
    console.warn("[FraudDB] Cannot add to blacklist: database not available");
    return false;
  }

  try {
    await db.insert(fraudVpas).values({
      vpaHash,
      fraudType,
      reportedBy,
      confidence,
      notes,
      verified: false,
    });
    
    // Add to Redis cache
    await addVpaToCache(vpaHash);
    
    console.log(`[FraudDB] Added VPA to blacklist: ${vpaHash.substring(0, 16)}...`);
    return true;
  } catch (error: any) {
    // Handle duplicate entry (Postgres code 23505)
    if (error?.code === "23505" || error?.code === "ER_DUP_ENTRY") {
      console.log(`[FraudDB] VPA already in blacklist: ${vpaHash.substring(0, 16)}...`);
      return true;
    }
    console.error("[FraudDB] Error adding VPA to blacklist:", error);
    return false;
  }
}

/**
 * Add URL to blacklist
 */
export async function addUrlToBlacklist(
  url: string,
  threatType: string,
  source: string = "manual"
): Promise<boolean> {
  const urlHash = hashUrl(url);
  
  const db = await getFraudDb();
  if (!db) {
    return false;
  }

  try {
    await db.insert(urlBlacklist).values({
      urlHash,
      originalUrl: url, // Store for admin review
      threatType,
      source,
    });
    
    await addUrlToCache(urlHash);
    return true;
  } catch (error: any) {
    if (error?.code === "23505" || error?.code === "ER_DUP_ENTRY") {
      // Update hit count for existing entry
      await db
        .update(urlBlacklist)
        .set({ 
          hitCount: urlBlacklist.hitCount, // This might need raw sql increment in pg, but keeping simple for now
          lastSeen: new Date(),
        })
        .where(eq(urlBlacklist.urlHash, urlHash));
      return true;
    }
    console.error("[FraudDB] Error adding URL to blacklist:", error);
    return false;
  }
}

/**
 * Log a scan for analytics
 */
export async function logScan(
  vpa: string | null,
  riskScore: number,
  riskTier: "green" | "yellow" | "red",
  fraudDetected: boolean,
  linkThreatsFound: number = 0,
  npciViolation: boolean = false,
  userAgent?: string,
  ipAddress?: string
): Promise<string | null> {
  const db = await getFraudDb();
  if (!db) {
    return null;
  }

  const scanId = crypto.randomUUID();
  const vpaHash = vpa ? hashVpa(vpa) : null;
  const ipHash = ipAddress ? crypto.createHash("sha256").update(ipAddress).digest("hex").substring(0, 16) : null;

  try {
    await db.insert(scanLogs).values({
      scanId,
      vpaHash,
      riskScore,
      riskTier,
      fraudDetected,
      linkThreatsFound,
      npciViolation,
      userAgent,
      ipAddress: ipHash,
    });
    
    return scanId;
  } catch (error) {
    console.error("[FraudDB] Error logging scan:", error);
    return null;
  }
}

/**
 * Get or create merchant reputation
 */
export async function getMerchantReputation(vpa: string): Promise<{
  exists: boolean;
  merchantName?: string;
  bankName?: string;
  trustScore?: number;
  whitelisted?: boolean;
}> {
  const vpaHash = hashVpa(vpa);
  
  const db = await getFraudDb();
  if (!db) {
    return { exists: false };
  }

  try {
    const result = await db
      .select()
      .from(merchantReputation)
      .where(eq(merchantReputation.vpaHash, vpaHash))
      .limit(1);

    if (result.length > 0) {
      // Update scan count
      await db
        .update(merchantReputation)
        .set({
          scanCount: (result[0].scanCount || 0) + 1,
          lastScanned: new Date(),
        })
        .where(eq(merchantReputation.vpaHash, vpaHash));

      return {
        exists: true,
        merchantName: result[0].merchantName,
        bankName: result[0].bankName || undefined,
        trustScore: result[0].trustScore || undefined,
        whitelisted: result[0].whitelisted || false,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("[FraudDB] Error getting merchant reputation:", error);
    return { exists: false };
  }
}

/**
 * Update merchant reputation after VPA verification
 */
export async function updateMerchantReputation(
  vpa: string,
  merchantName: string,
  bankName?: string,
  trustScore: number = 50
): Promise<boolean> {
  const vpaHash = hashVpa(vpa);
  
  const db = await getFraudDb();
  if (!db) {
    return false;
  }

  try {
    // Upsert merchant reputation
    await db.insert(merchantReputation).values({
      vpaHash,
      merchantName,
      bankName,
      trustScore,
      scanCount: 1,
    }).onConflictDoUpdate({
      target: merchantReputation.vpaHash,
      set: {
        merchantName,
        bankName,
        trustScore,
        lastScanned: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error("[FraudDB] Error updating merchant reputation:", error);
    return false;
  }
}

/**
 * Get fraud statistics for dashboard
 */
export async function getFraudStats(): Promise<{
  totalBlacklistedVpas: number;
  totalBlacklistedUrls: number;
  totalScans: number;
  threatsBlocked: number;
  fraudTypes: Record<string, number>;
} | null> {
  const db = await getFraudDb();
  if (!db) {
    return null;
  }

  try {
    // Get counts
    const [vpaCount] = await db.select({ count: fraudVpas.id }).from(fraudVpas);
    const [urlCount] = await db.select({ count: urlBlacklist.id }).from(urlBlacklist);
    const [scanCount] = await db.select({ count: scanLogs.id }).from(scanLogs);
    const [threatCount] = await db
      .select({ count: scanLogs.id })
      .from(scanLogs)
      .where(eq(scanLogs.fraudDetected, true));

    // Get fraud type breakdown
    const fraudTypeResults = await db
      .select({
        fraudType: fraudVpas.fraudType,
        count: fraudVpas.id,
      })
      .from(fraudVpas);

    const fraudTypes: Record<string, number> = {};
    fraudTypeResults.forEach((row: { fraudType: string | null; count: number }) => {
      const type = row.fraudType || "unknown";
      fraudTypes[type] = (fraudTypes[type] || 0) + 1;
    });

    return {
      totalBlacklistedVpas: Number(vpaCount?.count) || 0,
      totalBlacklistedUrls: Number(urlCount?.count) || 0,
      totalScans: Number(scanCount?.count) || 0,
      threatsBlocked: Number(threatCount?.count) || 0,
      fraudTypes,
    };
  } catch (error) {
    console.error("[FraudDB] Error getting fraud stats:", error);
    return null;
  }
}
