-- Enhanced seed script with realistic data patterns and energy savings
-- This creates realistic usage data for October, September, and current month
-- Run this in Supabase SQL Editor AFTER running the schema update

-- Clear existing seed data (keep real data)
DELETE FROM device_events WHERE device_id IN (
  'living_room_light', 'bedroom_fan', 'kitchen_light', 'ac_bedroom', 'tv_hall'
) AND created_at < CURRENT_DATE;

DELETE FROM daily_usage_summary WHERE device_id IN (
  'living_room_light', 'bedroom_fan', 'kitchen_light', 'ac_bedroom', 'tv_hall'
);

-- Insert realistic sample devices
INSERT INTO devices (device_id, device_name, wattage, unit_price) VALUES
  ('living_room_light', 'Living Room Light', 12, 7.50),  -- LED bulb
  ('bedroom_fan', 'Bedroom Fan', 75, 7.50),              -- Ceiling fan
  ('kitchen_light', 'Kitchen Light', 9, 7.50),           -- LED strip
  ('ac_bedroom', 'Bedroom AC', 1500, 8.50),              -- Air conditioner (higher rate)
  ('tv_hall', 'Hall TV', 120, 7.50),                     -- LED TV
  ('porch_light', 'Porch Light', 15, 7.50),              -- Outdoor LED
  ('water_heater', 'Water Heater', 2000, 8.00)           -- Geyser
ON CONFLICT (device_id) DO UPDATE SET
  wattage = EXCLUDED.wattage,
  unit_price = EXCLUDED.unit_price;

-- Function to generate realistic device events with energy savings
CREATE OR REPLACE FUNCTION generate_realistic_events(
  p_device_id VARCHAR(255),
  p_device_type VARCHAR(50),
  p_start_date DATE,
  p_end_date DATE
)
RETURNS VOID AS $$
DECLARE
  current_date DATE;
  events_count INTEGER;
  session_num INTEGER;
  on_time TIMESTAMP WITH TIME ZONE;
  off_time TIMESTAMP WITH TIME ZONE;
  duration_minutes INTEGER;
  auto_off_chance FLOAT;
  is_auto_off BOOLEAN;
  base_duration INTEGER;
BEGIN
  current_date := p_start_date;
  
  WHILE current_date <= p_end_date LOOP
    -- Realistic events per day based on device type
    events_count := CASE p_device_type
      WHEN 'light' THEN (3 + random() * 8)::INTEGER      -- 3-11 sessions
      WHEN 'fan' THEN (2 + random() * 6)::INTEGER        -- 2-8 sessions  
      WHEN 'ac' THEN (1 + random() * 3)::INTEGER         -- 1-4 sessions
      WHEN 'tv' THEN (2 + random() * 5)::INTEGER         -- 2-7 sessions
      WHEN 'heater' THEN (1 + random() * 2)::INTEGER     -- 1-3 sessions
      ELSE (2 + random() * 6)::INTEGER
    END;
    
    FOR session_num IN 1..events_count LOOP
      -- Generate realistic ON times based on device type
      on_time := CASE p_device_type
        WHEN 'light' THEN 
          -- Lights: Morning (6-9), Evening (17-23)
          CASE WHEN random() < 0.3 THEN
            current_date + INTERVAL '6 hours' + (random() * INTERVAL '3 hours')
          ELSE
            current_date + INTERVAL '17 hours' + (random() * INTERVAL '6 hours')
          END
        WHEN 'fan' THEN
          -- Fan: Day time and night (8-23)
          current_date + INTERVAL '8 hours' + (random() * INTERVAL '15 hours')
        WHEN 'ac' THEN
          -- AC: Hot hours (11-16) and night (21-02)
          CASE WHEN random() < 0.6 THEN
            current_date + INTERVAL '11 hours' + (random() * INTERVAL '5 hours')
          ELSE
            current_date + INTERVAL '21 hours' + (random() * INTERVAL '5 hours')
          END
        WHEN 'tv' THEN
          -- TV: Evening entertainment (18-23)
          current_date + INTERVAL '18 hours' + (random() * INTERVAL '5 hours')
        WHEN 'heater' THEN
          -- Water heater: Morning (5-8) and evening (18-20)
          CASE WHEN random() < 0.7 THEN
            current_date + INTERVAL '5 hours' + (random() * INTERVAL '3 hours')
          ELSE
            current_date + INTERVAL '18 hours' + (random() * INTERVAL '2 hours')
          END
        ELSE
          current_date + INTERVAL '8 hours' + (random() * INTERVAL '14 hours')
      END;
      
      -- Calculate base duration based on device type
      base_duration := CASE p_device_type
        WHEN 'light' THEN (15 + random() * 180)::INTEGER    -- 15min - 3hrs
        WHEN 'fan' THEN (30 + random() * 300)::INTEGER      -- 30min - 5hrs
        WHEN 'ac' THEN (60 + random() * 240)::INTEGER       -- 1hr - 4hrs
        WHEN 'tv' THEN (45 + random() * 180)::INTEGER       -- 45min - 3hrs
        WHEN 'heater' THEN (10 + random() * 30)::INTEGER    -- 10-40min
        ELSE (20 + random() * 120)::INTEGER
      END;
      
      -- Determine if auto-off should trigger (energy saving)
      auto_off_chance := 0;
      is_auto_off := false;
      
      -- Light auto-off logic
      IF p_device_type = 'light' THEN
        -- Daytime auto-off (9AM-12PM) if ON > 60 minutes  
        IF EXTRACT(HOUR FROM on_time) BETWEEN 9 AND 12 AND base_duration > 60 THEN
          auto_off_chance := 0.7;  -- 70% chance of auto-off
        -- Night auto-off (after 1AM) if ON > 240 minutes
        ELSIF EXTRACT(HOUR FROM on_time) >= 1 AND EXTRACT(HOUR FROM on_time) <= 5 AND base_duration > 240 THEN
          auto_off_chance := 0.8;  -- 80% chance of auto-off
        END IF;
      END IF;
      
      -- AC auto-off logic (energy saving)
      IF p_device_type = 'ac' THEN
        -- Auto-off if running > 4 hours
        IF base_duration > 240 THEN
          auto_off_chance := 0.6;  -- 60% chance
        END IF;
      END IF;
      
      -- Apply auto-off
      IF random() < auto_off_chance THEN
        is_auto_off := true;
        -- Reduce duration for auto-off (energy saved)
        duration_minutes := CASE p_device_type
          WHEN 'light' THEN 
            CASE WHEN EXTRACT(HOUR FROM on_time) BETWEEN 9 AND 12 THEN 45  -- Daytime: max 45min
            ELSE 180 END  -- Night: max 3hr
          WHEN 'ac' THEN 180  -- AC: max 3hr
          ELSE base_duration
        END;
      ELSE
        duration_minutes := base_duration;
      END IF;
      
      off_time := on_time + (duration_minutes || ' minutes')::INTERVAL;
      
      -- Insert ON event
      INSERT INTO device_events (device_id, event_time, state, created_at)
      VALUES (p_device_id, on_time, 'ON', on_time);
      
      -- Insert OFF event with auto_off flag if applicable
      INSERT INTO device_events (device_id, event_time, state, created_at)
      VALUES (
        p_device_id, 
        off_time, 
        CASE WHEN is_auto_off THEN 'AUTO_OFF' ELSE 'OFF' END,
        off_time
      );
      
    END LOOP;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate realistic data for 4 months (June, Sept, Oct, Nov)
DO $$
DECLARE
  start_date DATE := '2024-06-01';  -- Start from June 2024
  end_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Living Room Light - frequent evening use
  PERFORM generate_realistic_events('living_room_light', 'light', start_date, end_date);
  
  -- Bedroom Fan - day and night use
  PERFORM generate_realistic_events('bedroom_fan', 'fan', start_date, end_date);
  
  -- Kitchen Light - cooking times
  PERFORM generate_realistic_events('kitchen_light', 'light', start_date, end_date);
  
  -- AC - hot weather usage
  PERFORM generate_realistic_events('ac_bedroom', 'ac', start_date, end_date);
  
  -- TV - entertainment hours
  PERFORM generate_realistic_events('tv_hall', 'tv', start_date, end_date);
  
  -- Porch Light - security lighting
  PERFORM generate_realistic_events('porch_light', 'light', start_date, end_date);
  
  -- Water Heater - bath times
  PERFORM generate_realistic_events('water_heater', 'heater', start_date, end_date);
END $$;

-- Add current month data with some events
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE := CURRENT_DATE;
BEGIN
  PERFORM generate_realistic_events('living_room_light', 'light', start_date, end_date);
  PERFORM generate_realistic_events('bedroom_fan', 'fan', start_date, end_date);
  PERFORM generate_realistic_events('kitchen_light', 'light', start_date, end_date);
  PERFORM generate_realistic_events('ac_bedroom', 'ac', start_date, end_date);
  PERFORM generate_realistic_events('tv_hall', 'tv', start_date, end_date);
END $$;

-- Create energy savings calculation function
CREATE OR REPLACE FUNCTION calculate_energy_savings(
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_device_id VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  total_auto_offs INTEGER,
  energy_saved_kwh DECIMAL(10,4),
  cost_saved_inr DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH auto_off_events AS (
    SELECT 
      de.device_id,
      d.device_name,
      d.wattage,
      d.unit_price,
      de.event_time as off_time,
      LAG(de.event_time) OVER (PARTITION BY de.device_id ORDER BY de.event_time) as on_time,
      LAG(de.state) OVER (PARTITION BY de.device_id ORDER BY de.event_time) as prev_state
    FROM device_events de
    JOIN devices d ON de.device_id = d.device_id
    WHERE de.state = 'AUTO_OFF'
      AND DATE(de.event_time AT TIME ZONE 'Asia/Kolkata') >= p_start_date
      AND (p_end_date IS NULL OR DATE(de.event_time AT TIME ZONE 'Asia/Kolkata') <= p_end_date)
      AND (p_device_id IS NULL OR de.device_id = p_device_id)
  ),
  savings_calc AS (
    SELECT 
      aoe.device_id,
      aoe.device_name,
      COUNT(*) as auto_off_count,
      -- Estimate energy saved: assume 2 extra hours would have run without auto-off
      SUM(2.0 * aoe.wattage / 1000.0) as energy_saved_kwh,
      SUM(2.0 * aoe.wattage / 1000.0 * aoe.unit_price) as cost_saved
    FROM auto_off_events aoe
    WHERE aoe.prev_state = 'ON' AND aoe.on_time IS NOT NULL
    GROUP BY aoe.device_id, aoe.device_name
  )
  SELECT 
    sc.device_id,
    sc.device_name,
    sc.auto_off_count::INTEGER,
    sc.energy_saved_kwh::DECIMAL(10,4),
    sc.cost_saved::DECIMAL(10,2)
  FROM savings_calc sc
  ORDER BY sc.cost_saved DESC;
END;
$$ LANGUAGE plpgsql;

-- Refresh daily usage summary with new data
SELECT refresh_daily_usage_summary();

-- Clean up temporary function
DROP FUNCTION generate_realistic_events(VARCHAR(255), VARCHAR(50), DATE, DATE);

-- Show verification data
SELECT 
  'Total Events (Since June 2024)' as metric,
  COUNT(*)::text as value
FROM device_events 
WHERE created_at >= '2024-06-01'
UNION ALL
SELECT 
  'Auto-Off Events' as metric,
  COUNT(*)::text as value
FROM device_events 
WHERE state = 'AUTO_OFF' AND created_at >= '2024-06-01'
UNION ALL
SELECT 
  'June 2024 Events' as metric,
  COUNT(*)::text as value
FROM device_events 
WHERE created_at >= '2024-06-01' AND created_at < '2024-07-01'
UNION ALL
SELECT 
  'September 2024 Events' as metric,
  COUNT(*)::text as value
FROM device_events 
WHERE created_at >= '2024-09-01' AND created_at < '2024-10-01'
UNION ALL
SELECT 
  'October 2024 Events' as metric,
  COUNT(*)::text as value
FROM device_events 
WHERE created_at >= '2024-10-01' AND created_at < '2024-11-01'
UNION ALL
SELECT 
  'Devices with Data' as metric,
  COUNT(DISTINCT device_id)::text as value
FROM device_events 
WHERE created_at >= '2024-06-01';

-- Show energy savings summary
SELECT * FROM calculate_energy_savings('2024-06-01', CURRENT_DATE);

-- Show daily pattern sample (October first week)
SELECT 
  DATE(event_time AT TIME ZONE 'Asia/Kolkata') as date,
  device_id,
  COUNT(*) as events_count,
  COUNT(*) FILTER (WHERE state = 'ON') as on_events,
  COUNT(*) FILTER (WHERE state = 'AUTO_OFF') as auto_off_events
FROM device_events 
WHERE event_time >= '2025-10-01' AND event_time < '2025-10-08'
GROUP BY DATE(event_time AT TIME ZONE 'Asia/Kolkata'), device_id
ORDER BY date, device_id;