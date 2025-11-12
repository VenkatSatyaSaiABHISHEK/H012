-- Supabase schema updates for Indian electricity billing calculations
-- Run this in your Supabase SQL Editor

-- Add wattage column to devices table (if it doesn't exist)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS wattage INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(5,2) DEFAULT 7.50;

-- Update existing devices with sample wattage values
UPDATE devices SET 
  wattage = CASE 
    WHEN device_name ILIKE '%light%' OR device_name ILIKE '%bulb%' THEN 60
    WHEN device_name ILIKE '%fan%' THEN 75
    WHEN device_name ILIKE '%ac%' OR device_name ILIKE '%air%' THEN 1500
    WHEN device_name ILIKE '%tv%' THEN 150
    WHEN device_name ILIKE '%fridge%' THEN 200
    ELSE 60
  END,
  unit_price = 7.50
WHERE wattage IS NULL OR wattage = 0;

-- Create daily usage summary table for faster queries
CREATE TABLE IF NOT EXISTS daily_usage_summary (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  usage_date DATE NOT NULL,
  total_runtime_hours DECIMAL(10,2) DEFAULT 0,
  total_units_kwh DECIMAL(10,4) DEFAULT 0,
  total_cost_inr DECIMAL(10,2) DEFAULT 0,
  on_events_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, usage_date)
);

-- Create index for faster daily queries
CREATE INDEX IF NOT EXISTS idx_daily_usage_device_date ON daily_usage_summary(device_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_summary(usage_date);

-- Function to calculate runtime between ON/OFF events
CREATE OR REPLACE FUNCTION calculate_device_runtime(
  p_device_id VARCHAR(255),
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  usage_date DATE,
  total_runtime_hours DECIMAL(10,2),
  total_units_kwh DECIMAL(10,4),
  total_cost_inr DECIMAL(10,2),
  on_events_count INTEGER
) AS $$
DECLARE
  device_wattage INTEGER;
  device_unit_price DECIMAL(5,2);
BEGIN
  -- Get device wattage and unit price
  SELECT wattage, unit_price INTO device_wattage, device_unit_price
  FROM devices WHERE device_id = p_device_id LIMIT 1;
  
  IF device_wattage IS NULL THEN
    device_wattage := 60; -- Default 60W
  END IF;
  
  IF device_unit_price IS NULL THEN
    device_unit_price := 7.50; -- Default ₹7.50 per unit
  END IF;

  RETURN QUERY
  WITH daily_events AS (
    SELECT 
      DATE(event_time AT TIME ZONE 'Asia/Kolkata') as event_date,
      event_time,
      state,
      LAG(event_time) OVER (ORDER BY event_time) as prev_event_time,
      LAG(state) OVER (ORDER BY event_time) as prev_state
    FROM device_events 
    WHERE device_id = p_device_id
      AND DATE(event_time AT TIME ZONE 'Asia/Kolkata') >= p_start_date
      AND (p_end_date IS NULL OR DATE(event_time AT TIME ZONE 'Asia/Kolkata') <= p_end_date)
    ORDER BY event_time
  ),
  runtime_calc AS (
    SELECT 
      event_date,
      CASE 
        WHEN state = 'OFF' AND prev_state = 'ON' THEN
          EXTRACT(EPOCH FROM (event_time - prev_event_time)) / 3600.0
        ELSE 0
      END as runtime_hours,
      CASE WHEN state = 'ON' THEN 1 ELSE 0 END as on_event
    FROM daily_events
    WHERE prev_event_time IS NOT NULL
  )
  SELECT 
    r.event_date,
    COALESCE(SUM(r.runtime_hours), 0)::DECIMAL(10,2) as total_runtime_hours,
    COALESCE(SUM(r.runtime_hours * device_wattage / 1000.0), 0)::DECIMAL(10,4) as total_units_kwh,
    COALESCE(SUM(r.runtime_hours * device_wattage / 1000.0 * device_unit_price), 0)::DECIMAL(10,2) as total_cost_inr,
    SUM(r.on_event)::INTEGER as on_events_count
  FROM runtime_calc r
  GROUP BY r.event_date
  ORDER BY r.event_date;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh daily usage summary
CREATE OR REPLACE FUNCTION refresh_daily_usage_summary(
  p_device_id VARCHAR(255) DEFAULT NULL,
  p_date DATE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  device_record RECORD;
BEGIN
  -- If specific device and date provided
  IF p_device_id IS NOT NULL AND p_date IS NOT NULL THEN
    DELETE FROM daily_usage_summary 
    WHERE device_id = p_device_id AND usage_date = p_date;
    
    INSERT INTO daily_usage_summary (device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count)
    SELECT p_device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count
    FROM calculate_device_runtime(p_device_id, p_date, p_date);
    
  -- If only device provided, refresh all dates for that device
  ELSIF p_device_id IS NOT NULL THEN
    DELETE FROM daily_usage_summary WHERE device_id = p_device_id;
    
    INSERT INTO daily_usage_summary (device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count)
    SELECT p_device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count
    FROM calculate_device_runtime(p_device_id, '2025-08-01', CURRENT_DATE);
    
  -- Refresh all devices and dates
  ELSE
    TRUNCATE daily_usage_summary;
    
    FOR device_record IN SELECT DISTINCT device_id FROM device_events LOOP
      INSERT INTO daily_usage_summary (device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count)
      SELECT device_record.device_id, usage_date, total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count
      FROM calculate_device_runtime(device_record.device_id, '2025-08-01', CURRENT_DATE);
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update daily summary when events are inserted
CREATE OR REPLACE FUNCTION trigger_refresh_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh summary for the affected device and date
  PERFORM refresh_daily_usage_summary(
    NEW.device_id, 
    DATE(NEW.event_time AT TIME ZONE 'Asia/Kolkata')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on device_events table
DROP TRIGGER IF EXISTS auto_refresh_daily_summary ON device_events;
CREATE TRIGGER auto_refresh_daily_summary
  AFTER INSERT OR UPDATE ON device_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_daily_summary();

-- Initial population of daily usage summary
SELECT refresh_daily_usage_summary();