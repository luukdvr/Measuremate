-- Migration: Add measuremates table and update sensors table
-- Run this in your Supabase SQL editor

-- Create measuremates table
CREATE TABLE IF NOT EXISTS measuremates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add measuremate_id to sensors table
ALTER TABLE sensors 
ADD COLUMN IF NOT EXISTS measuremate_id UUID REFERENCES measuremates(id) ON DELETE CASCADE;

-- Update existing sensors to have a default measuremate
-- First, create a default measuremate for each user who has sensors
INSERT INTO measuremates (user_id, name, description)
SELECT DISTINCT user_id, 'Standaard Measuremate', 'Automatisch aangemaakt bij migratie'
FROM sensors
WHERE NOT EXISTS (
    SELECT 1 FROM measuremates WHERE measuremates.user_id = sensors.user_id
);

-- Assign existing sensors to the default measuremate of their user
UPDATE sensors 
SET measuremate_id = (
    SELECT id FROM measuremates 
    WHERE measuremates.user_id = sensors.user_id 
    LIMIT 1
)
WHERE measuremate_id IS NULL;

-- Make measuremate_id NOT NULL after data migration
ALTER TABLE sensors 
ALTER COLUMN measuremate_id SET NOT NULL;

-- Enable RLS on measuremates table
ALTER TABLE measuremates ENABLE ROW LEVEL SECURITY;

-- RLS policies for measuremates
CREATE POLICY "Users can view their own measuremates" ON measuremates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own measuremates" ON measuremates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measuremates" ON measuremates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measuremates" ON measuremates
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for measuremates updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_measuremates_updated_at 
    BEFORE UPDATE ON measuremates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_measuremates_user_id ON measuremates(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_measuremate_id ON sensors(measuremate_id);
