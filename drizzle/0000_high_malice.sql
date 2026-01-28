CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "fraud_vpas" (
	"id" serial PRIMARY KEY NOT NULL,
	"vpa_hash" varchar(64) NOT NULL,
	"reported_by" varchar(255),
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"fraud_type" varchar(100),
	"confidence" integer DEFAULT 100,
	"verified" boolean DEFAULT false,
	"notes" text,
	CONSTRAINT "fraud_vpas_vpa_hash_unique" UNIQUE("vpa_hash")
);
--> statement-breakpoint
CREATE TABLE "merchant_reputation" (
	"id" serial PRIMARY KEY NOT NULL,
	"vpa_hash" varchar(64) NOT NULL,
	"merchant_name" varchar(255) NOT NULL,
	"bank_name" varchar(255),
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"trust_score" integer DEFAULT 50,
	"scan_count" integer DEFAULT 0,
	"last_scanned" timestamp DEFAULT now() NOT NULL,
	"whitelisted" boolean DEFAULT false,
	CONSTRAINT "merchant_reputation_vpa_hash_unique" UNIQUE("vpa_hash")
);
--> statement-breakpoint
CREATE TABLE "scan_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" varchar(36) NOT NULL,
	"vpa_hash" varchar(64),
	"risk_score" integer NOT NULL,
	"risk_tier" varchar(10) NOT NULL,
	"fraud_detected" boolean DEFAULT false,
	"link_threats_found" integer DEFAULT 0,
	"npci_violation" boolean DEFAULT false,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" varchar(255),
	"ip_address" varchar(64),
	CONSTRAINT "scan_logs_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "url_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"original_url" text,
	"threat_type" varchar(100) NOT NULL,
	"source" varchar(50) NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 1,
	"verified" boolean DEFAULT false,
	CONSTRAINT "url_blacklist_url_hash_unique" UNIQUE("url_hash")
);
--> statement-breakpoint
CREATE INDEX "vpa_hash_idx" ON "fraud_vpas" USING btree ("vpa_hash");--> statement-breakpoint
CREATE INDEX "reported_at_idx" ON "fraud_vpas" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "merchant_vpa_hash_idx" ON "merchant_reputation" USING btree ("vpa_hash");--> statement-breakpoint
CREATE INDEX "trust_score_idx" ON "merchant_reputation" USING btree ("trust_score");--> statement-breakpoint
CREATE INDEX "whitelisted_idx" ON "merchant_reputation" USING btree ("whitelisted");--> statement-breakpoint
CREATE INDEX "scan_vpa_hash_idx" ON "scan_logs" USING btree ("vpa_hash");--> statement-breakpoint
CREATE INDEX "risk_tier_idx" ON "scan_logs" USING btree ("risk_tier");--> statement-breakpoint
CREATE INDEX "scanned_at_idx" ON "scan_logs" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "fraud_detected_idx" ON "scan_logs" USING btree ("fraud_detected");--> statement-breakpoint
CREATE INDEX "url_hash_idx" ON "url_blacklist" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "threat_type_idx" ON "url_blacklist" USING btree ("threat_type");--> statement-breakpoint
CREATE INDEX "detected_at_idx" ON "url_blacklist" USING btree ("detected_at");