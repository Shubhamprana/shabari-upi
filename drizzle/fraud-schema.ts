import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Fraud VPAs Table
 * Stores blacklisted VPAs with SHA-256 hashing (DPDP compliant)
 */
export const fraudVpas = pgTable(
  "fraud_vpas",
  {
    id: serial("id").primaryKey(),
    vpaHash: varchar("vpa_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of VPA
    reportedBy: varchar("reported_by", { length: 255 }), // Source of report (user, admin, api)
    reportedAt: timestamp("reported_at").defaultNow().notNull(),
    fraudType: varchar("fraud_type", { length: 100 }), // e.g., "job_fraud", "electricity_scam", "phishing"
    confidence: integer("confidence").default(100), // 0-100 confidence score
    verified: boolean("verified").default(false), // Admin verified
    notes: text("notes"), // Additional context
  },
  (table) => ({
    vpaHashIdx: index("vpa_hash_idx").on(table.vpaHash),
    reportedAtIdx: index("reported_at_idx").on(table.reportedAt),
  })
);

/**
 * URL Blacklist Table
 * Stores malicious URLs detected by Safe Browsing / VirusTotal
 */
export const urlBlacklist = pgTable(
  "url_blacklist",
  {
    id: serial("id").primaryKey(),
    urlHash: varchar("url_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of URL
    originalUrl: text("original_url"), // Stored for admin review only
    threatType: varchar("threat_type", { length: 100 }).notNull(), // "phishing", "malware", "social_engineering"
    source: varchar("source", { length: 50 }).notNull(), // "google_safe_browsing", "virustotal", "manual"
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    hitCount: integer("hit_count").default(1), // Number of times detected
    verified: boolean("verified").default(false),
  },
  (table) => ({
    urlHashIdx: index("url_hash_idx").on(table.urlHash),
    threatTypeIdx: index("threat_type_idx").on(table.threatType),
    detectedAtIdx: index("detected_at_idx").on(table.detectedAt),
  })
);

/**
 * Scan Logs Table
 * Stores server-side scan history for analytics and threat intelligence
 */
export const scanLogs = pgTable(
  "scan_logs",
  {
    id: serial("id").primaryKey(),
    scanId: varchar("scan_id", { length: 36 }).notNull().unique(), // UUID for tracking
    vpaHash: varchar("vpa_hash", { length: 64 }), // SHA-256 hash of scanned VPA
    riskScore: integer("risk_score").notNull(), // 0-100
    riskTier: varchar("risk_tier", { length: 10 }).notNull(), // "green", "yellow", "red"
    fraudDetected: boolean("fraud_detected").default(false),
    linkThreatsFound: integer("link_threats_found").default(0),
    npciViolation: boolean("npci_violation").default(false),
    scannedAt: timestamp("scanned_at").defaultNow().notNull(),
    userAgent: varchar("user_agent", { length: 255 }), // For analytics
    ipAddress: varchar("ip_address", { length: 64 }), // Hashed for privacy
  },
  (table) => ({
    vpaHashIdx: index("scan_vpa_hash_idx").on(table.vpaHash),
    riskTierIdx: index("risk_tier_idx").on(table.riskTier),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
    fraudDetectedIdx: index("fraud_detected_idx").on(table.fraudDetected),
  })
);

/**
 * Merchant Reputation Table
 * Stores verified merchant information for faster lookups
 */
export const merchantReputation = pgTable(
  "merchant_reputation",
  {
    id: serial("id").primaryKey(),
    vpaHash: varchar("vpa_hash", { length: 64 }).notNull().unique(),
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    bankName: varchar("bank_name", { length: 255 }),
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    trustScore: integer("trust_score").default(50), // 0-100
    scanCount: integer("scan_count").default(0),
    lastScanned: timestamp("last_scanned").defaultNow().notNull(),
    whitelisted: boolean("whitelisted").default(false),
  },
  (table) => ({
    vpaHashIdx: index("merchant_vpa_hash_idx").on(table.vpaHash),
    trustScoreIdx: index("trust_score_idx").on(table.trustScore),
    whitelistedIdx: index("whitelisted_idx").on(table.whitelisted),
  })
);

/**
 * Type exports for TypeScript
 */
export type FraudVpa = typeof fraudVpas.$inferSelect;
export type NewFraudVpa = typeof fraudVpas.$inferInsert;

export type UrlBlacklist = typeof urlBlacklist.$inferSelect;
export type NewUrlBlacklist = typeof urlBlacklist.$inferInsert;

export type ScanLog = typeof scanLogs.$inferSelect;
export type NewScanLog = typeof scanLogs.$inferInsert;

export type MerchantReputation = typeof merchantReputation.$inferSelect;
export type NewMerchantReputation = typeof merchantReputation.$inferInsert;

// Need to import serial for the code above to work
import { serial } from "drizzle-orm/pg-core";
