-- Migration: Create apikey table for Better Auth apiKey plugin
-- This table is managed by the Better Auth plugin, not by Drizzle schema

CREATE TABLE IF NOT EXISTS "apikey" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"config_id" TEXT NOT NULL DEFAULT 'default',
	"name" TEXT,
	"start" TEXT,
	"prefix" TEXT,
	"key" TEXT NOT NULL,
	"reference_id" TEXT NOT NULL,
	"refill_interval" INTEGER,
	"refill_amount" INTEGER,
	"last_refill_at" INTEGER,
	"enabled" INTEGER DEFAULT 1,
	"rate_limit_enabled" INTEGER DEFAULT 1,
	"rate_limit_time_window" INTEGER,
	"rate_limit_max" INTEGER,
	"request_count" INTEGER DEFAULT 0,
	"remaining" INTEGER,
	"last_request" INTEGER,
	"expires_at" INTEGER,
	"created_at" INTEGER NOT NULL,
	"updated_at" INTEGER NOT NULL,
	"permissions" TEXT,
	"metadata" TEXT
);
