CREATE TABLE `fraud_vpas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vpa_hash` varchar(64) NOT NULL,
	`reported_by` varchar(255),
	`reported_at` timestamp NOT NULL DEFAULT (now()),
	`fraud_type` varchar(100),
	`confidence` int DEFAULT 100,
	`verified` boolean DEFAULT false,
	`notes` text,
	CONSTRAINT `fraud_vpas_id` PRIMARY KEY(`id`),
	CONSTRAINT `fraud_vpas_vpa_hash_unique` UNIQUE(`vpa_hash`)
);
--> statement-breakpoint
CREATE TABLE `merchant_reputation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vpa_hash` varchar(64) NOT NULL,
	`merchant_name` varchar(255) NOT NULL,
	`bank_name` varchar(255),
	`verified_at` timestamp NOT NULL DEFAULT (now()),
	`trust_score` int DEFAULT 50,
	`scan_count` int DEFAULT 0,
	`last_scanned` timestamp NOT NULL DEFAULT (now()),
	`whitelisted` boolean DEFAULT false,
	CONSTRAINT `merchant_reputation_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_reputation_vpa_hash_unique` UNIQUE(`vpa_hash`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scan_id` varchar(36) NOT NULL,
	`vpa_hash` varchar(64),
	`risk_score` int NOT NULL,
	`risk_tier` varchar(10) NOT NULL,
	`fraud_detected` boolean DEFAULT false,
	`link_threats_found` int DEFAULT 0,
	`npci_violation` boolean DEFAULT false,
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`user_agent` varchar(255),
	`ip_address` varchar(64),
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_logs_scan_id_unique` UNIQUE(`scan_id`)
);
--> statement-breakpoint
CREATE TABLE `url_blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url_hash` varchar(64) NOT NULL,
	`original_url` text,
	`threat_type` varchar(100) NOT NULL,
	`source` varchar(50) NOT NULL,
	`detected_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen` timestamp NOT NULL DEFAULT (now()),
	`hit_count` int DEFAULT 1,
	`verified` boolean DEFAULT false,
	CONSTRAINT `url_blacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `url_blacklist_url_hash_unique` UNIQUE(`url_hash`)
);
--> statement-breakpoint
CREATE INDEX `vpa_hash_idx` ON `fraud_vpas` (`vpa_hash`);--> statement-breakpoint
CREATE INDEX `reported_at_idx` ON `fraud_vpas` (`reported_at`);--> statement-breakpoint
CREATE INDEX `merchant_vpa_hash_idx` ON `merchant_reputation` (`vpa_hash`);--> statement-breakpoint
CREATE INDEX `trust_score_idx` ON `merchant_reputation` (`trust_score`);--> statement-breakpoint
CREATE INDEX `whitelisted_idx` ON `merchant_reputation` (`whitelisted`);--> statement-breakpoint
CREATE INDEX `scan_vpa_hash_idx` ON `scan_logs` (`vpa_hash`);--> statement-breakpoint
CREATE INDEX `risk_tier_idx` ON `scan_logs` (`risk_tier`);--> statement-breakpoint
CREATE INDEX `scanned_at_idx` ON `scan_logs` (`scanned_at`);--> statement-breakpoint
CREATE INDEX `fraud_detected_idx` ON `scan_logs` (`fraud_detected`);--> statement-breakpoint
CREATE INDEX `url_hash_idx` ON `url_blacklist` (`url_hash`);--> statement-breakpoint
CREATE INDEX `threat_type_idx` ON `url_blacklist` (`threat_type`);--> statement-breakpoint
CREATE INDEX `detected_at_idx` ON `url_blacklist` (`detected_at`);