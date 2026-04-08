-- ============================================
-- TTN Integration Migration
-- Adds dev_eui column to measuremates table
-- to link TTN devices to MeasureMate records.
--
-- Run this in your Supabase SQL Editor.
-- ============================================

-- Add a nullable TEXT column for the TTN device EUI.
-- UNIQUE ensures no two measuremates share the same dev_eui.
ALTER TABLE measuremates ADD COLUMN IF NOT EXISTS dev_eui TEXT UNIQUE;

-- Index for fast lookups when a TTN webhook arrives.
CREATE INDEX IF NOT EXISTS idx_measuremates_dev_eui ON measuremates(dev_eui);

-- Allow the service role to query by dev_eui (RLS is already enabled;
-- the service role bypasses it, so no policy changes are needed).
