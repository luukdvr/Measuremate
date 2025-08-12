-- =====================================================
-- IoT Dashboard Platform - Database Setup Script
-- =====================================================
-- 
-- Voer dit script uit in de Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
--
-- Deze script maakt alle benodigde tabellen, indexes en 
-- security policies aan voor het IoT Dashboard Platform.
--

-- 1. SENSORS TABEL
-- =====================================================

-- Maak sensors tabel aan
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0),
  api_key UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SENSOR_DATA TABEL
-- =====================================================

-- Maak sensor_data tabel aan
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS voor sensors tabel
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- Sensors policies
CREATE POLICY IF NOT EXISTS "Users can view own sensors" ON public.sensors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own sensors" ON public.sensors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own sensors" ON public.sensors
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own sensors" ON public.sensors
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS voor sensor_data tabel
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

-- Sensor_data policies
CREATE POLICY IF NOT EXISTS "Users can view own sensor data" ON public.sensor_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own sensor data" ON public.sensor_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "API can insert sensor data via API key" ON public.sensor_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_data.sensor_id 
      AND sensors.user_id = sensor_data.user_id
    )
  );

-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Indexes voor betere query performance
CREATE INDEX IF NOT EXISTS sensors_user_id_idx ON public.sensors(user_id);
CREATE INDEX IF NOT EXISTS sensors_api_key_idx ON public.sensors(api_key);
CREATE INDEX IF NOT EXISTS sensor_data_sensor_id_timestamp_idx ON public.sensor_data(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS sensor_data_user_id_idx ON public.sensor_data(user_id);
CREATE INDEX IF NOT EXISTS sensor_data_timestamp_idx ON public.sensor_data(timestamp DESC);

-- 5. AUTOMATIC UPDATE TIMESTAMP FUNCTION
-- =====================================================

-- Functie voor automatische update van updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger voor sensors tabel
DROP TRIGGER IF EXISTS update_sensors_updated_at ON public.sensors;
CREATE TRIGGER update_sensors_updated_at
    BEFORE UPDATE ON public.sensors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. REAL-TIME SUBSCRIPTIONS
-- =====================================================

-- Enable real-time voor sensor_data tabel (voor live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_data;

-- 7. TEST DATA (OPTIONEEL)
-- =====================================================

-- Uncomment de volgende regels om test data toe te voegen
-- Let op: Vervang 'YOUR_USER_ID' met je echte user ID na registratie

/*
-- Test sensor toevoegen
INSERT INTO public.sensors (user_id, name) 
VALUES ('YOUR_USER_ID', 'Test Temperatuur Sensor')
ON CONFLICT DO NOTHING;

-- Test data toevoegen
WITH test_sensor AS (
  SELECT id FROM public.sensors WHERE name = 'Test Temperatuur Sensor' LIMIT 1
)
INSERT INTO public.sensor_data (sensor_id, user_id, value, timestamp)
SELECT 
  test_sensor.id,
  'YOUR_USER_ID',
  20 + (random() * 15), -- Random temperatuur tussen 20-35°C
  now() - (interval '1 hour' * generate_series(1, 24))
FROM test_sensor, generate_series(1, 24);
*/

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
--
-- 🎉 Database setup is voltooid!
--
-- Volgende stappen:
-- 1. Controleer of alle tabellen zijn aangemaakt in de Table Editor
-- 2. Test de RLS policies door in te loggen via je app
-- 3. Voeg een sensor toe via het dashboard
-- 4. Test de API met de meegeleverde test scripts
--
-- Voor troubleshooting, check de Supabase logs in:
-- Dashboard > Logs & Analytics
--
