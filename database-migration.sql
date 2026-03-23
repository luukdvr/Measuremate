-- ============================================
-- Measuremate Platform — Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- 4.1 Add location coordinates to measuremates
ALTER TABLE measuremates ADD COLUMN IF NOT EXISTS latitude DECIMAL;
ALTER TABLE measuremates ADD COLUMN IF NOT EXISTS longitude DECIMAL;

-- 4.2 Node status tracking
ALTER TABLE measuremates ADD COLUMN IF NOT EXISTS last_data_received_at TIMESTAMPTZ;

-- 4.3 Sensor unit and type
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS sensor_type TEXT DEFAULT '';

-- 4.4 Manual measurements table
CREATE TABLE IF NOT EXISTS manual_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for manual_measurements
ALTER TABLE manual_measurements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own manual measurements'
    ) THEN
        CREATE POLICY "Users can manage own manual measurements"
            ON manual_measurements FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4.5 Performance indexes
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_timestamp 
    ON sensor_data(sensor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp 
    ON sensor_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_manual_measurements_sensor_id 
    ON manual_measurements(sensor_id);

CREATE INDEX IF NOT EXISTS idx_manual_measurements_timestamp 
    ON manual_measurements(sensor_id, timestamp DESC);
