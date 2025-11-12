-- Seed script to insert dummy historical data for testing
-- This creates 3 months of sample ON/OFF events for different devices
-- Run this in Supabase SQL Editor AFTER running the schema update

-- Insert sample devices if they don't exist
INSERT INTO devices (device_id, device_name, wattage, unit_price) VALUES
  ('living_room_light', 'Living Room Light', 60, 7.50),
  ('bedroom_fan', 'Bedroom Fan', 75, 7.50),
  ('kitchen_light', 'Kitchen Light', 40, 7.50),
  ('ac_bedroom', 'Bedroom AC', 1500, 7.50),
  ('tv_hall', 'Hall TV', 150, 7.50)
ON CONFLICT (device_id) DO UPDATE SET
  wattage = EXCLUDED.wattage,
  unit_price = EXCLUDED.unit_price;

-- Function to generate random ON/OFF events for a device
CREATE OR REPLACE FUNCTION generate_device_events(
  p_device_id VARCHAR(255),
  p_start_date DATE,
  p_end_date DATE,
  p_avg_sessions_per_day INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
  current_date DATE;
  session_count INTEGER;
  session_num INTEGER;
  on_time TIMESTAMP WITH TIME ZONE;
  off_time TIMESTAMP WITH TIME ZONE;
  duration_minutes INTEGER;
BEGIN
  current_date := p_start_date;
  
  WHILE current_date <= p_end_date LOOP
    -- Random number of sessions per day (0 to p_avg_sessions_per_day * 2)
    session_count := floor(random() * (p_avg_sessions_per_day * 2 + 1))::INTEGER;
    
    FOR session_num IN 1..session_count LOOP
      -- Random ON time during the day (6 AM to 11 PM)
      on_time := current_date + INTERVAL '6 hours' + 
                 (random() * INTERVAL '17 hours') + 
                 (random() * INTERVAL '60 minutes');
      
      -- Random duration (15 minutes to 4 hours)
      duration_minutes := (15 + random() * 225)::INTEGER;
      off_time := on_time + (duration_minutes || ' minutes')::INTERVAL;
      
      -- Insert ON event
      INSERT INTO device_events (device_id, event_time, state)
      VALUES (p_device_id, on_time, 'ON');
      
      -- Insert OFF event
      INSERT INTO device_events (device_id, event_time, state)
      VALUES (p_device_id, off_time, 'OFF');
    END LOOP;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clear existing events (optional - comment out if you want to keep real data)
-- DELETE FROM device_events WHERE event_time < CURRENT_DATE - INTERVAL '1 day';

-- Generate 3 months of historical data
DO $$
DECLARE
  start_date DATE := CURRENT_DATE - INTERVAL '90 days';
  end_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Living Room Light - used frequently in evenings
  PERFORM generate_device_events('living_room_light', start_date, end_date, 2);
  
  -- Bedroom Fan - used mostly at night
  PERFORM generate_device_events('bedroom_fan', start_date, end_date, 1);
  
  -- Kitchen Light - used during cooking times
  PERFORM generate_device_events('kitchen_light', start_date, end_date, 3);
  
  -- AC - used occasionally (high power consumption)
  PERFORM generate_device_events('ac_bedroom', start_date, end_date, 1);
  
  -- TV - used in evenings
  PERFORM generate_device_events('tv_hall', start_date, end_date, 2);
END $$;

-- Generate some data for current month too
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE := CURRENT_DATE;
BEGIN
  PERFORM generate_device_events('living_room_light', start_date, end_date, 2);
  PERFORM generate_device_events('bedroom_fan', start_date, end_date, 1);
  PERFORM generate_device_events('kitchen_light', start_date, end_date, 3);
  PERFORM generate_device_events('ac_bedroom', start_date, end_date, 1);
  PERFORM generate_device_events('tv_hall', start_date, end_date, 2);
END $$;

-- Refresh the daily usage summary after inserting seed data
SELECT refresh_daily_usage_summary();

-- Clean up the temporary function
DROP FUNCTION generate_device_events(VARCHAR(255), DATE, DATE, INTEGER);

-- Verify the data
SELECT 
  'Total Events' as metric,
  COUNT(*)::text as value
FROM device_events
UNION ALL
SELECT 
  'Date Range' as metric,
  MIN(DATE(event_time))::text || ' to ' || MAX(DATE(event_time))::text as value
FROM device_events
UNION ALL
SELECT 
  'Unique Devices' as metric,
  COUNT(DISTINCT device_id)::text as value
FROM device_events
UNION ALL
SELECT 
  'Daily Summary Records' as metric,
  COUNT(*)::text as value
FROM daily_usage_summary;

-- Show sample usage summary
SELECT 
  device_id,
  usage_date,
  total_runtime_hours,
  total_units_kwh,
  total_cost_inr,
  on_events_count
FROM daily_usage_summary
ORDER BY usage_date DESC, device_id
LIMIT 20;