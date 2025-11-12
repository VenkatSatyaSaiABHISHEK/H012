# Indian Electricity Billing System Setup Guide

This guide will help you set up the complete Indian electricity billing system for your IoT energy usage dashboard.

## 🎯 What You'll Get

- ✅ Automatic calculation of device runtime, kWh units, and Indian electricity costs
- ✅ Monthly calendar view with usage highlights
- ✅ Daily usage summaries and statistics
- ✅ Indian date/time format (IST)
- ✅ Configurable electricity rates (₹6-₹9 per unit)
- ✅ 3 months of dummy historical data for testing
- ✅ Real-time updates when new events are inserted

## 🗂️ Files Created

### 1. Database Schema & Seed Data
- `supabase-billing-schema.sql` - Database schema updates
- `supabase-seed-data.sql` - 3 months of dummy historical data

### 2. Utility Functions
- `src/utils/billingCalculations.ts` - Core billing calculations
- `src/utils/dailyUsageApi.ts` - API functions for data fetching

### 3. React Components
- `src/components/BillingDashboard.tsx` - Main billing dashboard
- `src/components/UsageCalendar.tsx` - Monthly calendar with highlights
- `src/components/BillingDashboard.module.css` - Dashboard styles
- `src/components/UsageCalendar.module.css` - Calendar styles

## 🚀 Setup Instructions

### Step 1: Update Database Schema

1. Open your **Supabase SQL Editor**
2. Run the contents of `supabase-billing-schema.sql`
3. This will:
   - Add `wattage` and `unit_price` columns to your devices table
   - Create `daily_usage_summary` table for fast queries
   - Add calculation functions and triggers

### Step 2: Insert Historical Test Data

1. In Supabase SQL Editor, run the contents of `supabase-seed-data.sql`
2. This will create 3 months of sample ON/OFF events for testing
3. **Note**: This won't affect your real device data

### Step 3: Update Your Device Configuration

Update your devices table with correct wattage values:

```sql
-- Update with your actual device wattages
UPDATE devices SET 
  wattage = 60,   -- Watts for LED bulb
  unit_price = 7.50  -- ₹ per kWh
WHERE device_id = 'your_device_id_here';

-- Examples:
UPDATE devices SET wattage = 60 WHERE device_name ILIKE '%light%';
UPDATE devices SET wattage = 75 WHERE device_name ILIKE '%fan%';
UPDATE devices SET wattage = 1500 WHERE device_name ILIKE '%ac%';
```

### Step 4: Access the Billing Dashboard

1. Build and start your React app:
   ```bash
   npm run build
   npm start
   ```

2. Navigate to the billing dashboard:
   - **URL**: `http://localhost:3000/billing`
   - **Or**: Click the "Indian Billing" button on the main dashboard

## 📊 Features Breakdown

### 1. Monthly Statistics Cards
- **Total Records**: Count of all ON/OFF events
- **ON Events**: Count of device activations
- **Total Runtime**: Sum of all device runtime in hours
- **Units (kWh)**: Total energy consumption
- **Estimated Cost**: Total electricity cost in ₹

### 2. Monthly Calendar
- **Blue highlights**: Days with device usage
- **Runtime badges**: Hours of usage per day
- **Cost badges**: Daily electricity cost
- **Click any day**: View detailed ON/OFF events

### 3. Daily Usage Table
- **Date**: In Indian format (DD MMM)
- **Runtime**: Total hours of usage
- **Units**: kWh consumed
- **Cost**: Electricity bill in ₹
- **Devices**: Number of active devices

### 4. Indian Time Format
- **IST (GMT +5:30)** timezone
- **Format**: DD MMM YYYY, hh:mm:ss AM/PM
- **Real-time clock** in dashboard header

## 🔧 Configuration Options

### Electricity Rates
You can adjust the unit price per device:

```sql
-- Set different rates for different devices
UPDATE devices SET unit_price = 6.50 WHERE device_id = 'residential_device';
UPDATE devices SET unit_price = 8.00 WHERE device_id = 'commercial_device';
```

### Device Wattage
Update wattage based on your actual devices:

```sql
-- Common Indian appliances
UPDATE devices SET wattage = 60 WHERE device_name ILIKE '%led%';      -- LED bulb
UPDATE devices SET wattage = 100 WHERE device_name ILIKE '%cfl%';     -- CFL bulb
UPDATE devices SET wattage = 75 WHERE device_name ILIKE '%fan%';      -- Ceiling fan
UPDATE devices SET wattage = 1500 WHERE device_name ILIKE '%ac%';     -- Air conditioner
UPDATE devices SET wattage = 150 WHERE device_name ILIKE '%tv%';      -- LED TV
UPDATE devices SET wattage = 200 WHERE device_name ILIKE '%fridge%';  -- Refrigerator
```

## 🧮 Billing Calculations

### Formula Used
```
kW = wattage / 1000
units (kWh) = kW × runtime_hours
cost (₹) = units × unit_price
```

### Example Calculation
- **Device**: 60W LED bulb
- **Runtime**: 5 hours
- **Rate**: ₹7.50 per unit

```
kW = 60 / 1000 = 0.06 kW
kWh = 0.06 × 5 = 0.3 units
Cost = 0.3 × 7.50 = ₹2.25
```

## 📱 Navigation

### Access Points
1. **Main Dashboard**: Click "Indian Billing" button
2. **Direct URL**: `/billing`
3. **Existing "Data & Bills"**: Opens the original data viewer

### Month Navigation
- **Prev Month** / **Next Month** buttons
- **Calendar automatically updates** with usage data
- **Statistics recalculate** for selected month

## 🎨 Visual Design

- **Glass-morphism UI** with modern cards
- **Gradient backgrounds** for statistics
- **Color-coded calendar** days (blue = usage)
- **Responsive design** for mobile/desktop
- **Indian rupee (₹) formatting**

## 🔄 Real-time Updates

The system automatically:
- **Triggers calculations** when new events are inserted
- **Updates daily summaries** via database triggers
- **Refreshes calendar** when month changes
- **Recalculates statistics** in real-time

## 🐛 Troubleshooting

### No Data Showing?
1. Check if `device_events` table has data
2. Verify devices have `wattage` and `unit_price` set
3. Run: `SELECT refresh_daily_usage_summary();` in Supabase

### Calendar Not Loading?
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure `daily_usage_summary` table exists

### Wrong Calculations?
1. Verify device wattage values
2. Check unit price configuration
3. Validate ON/OFF event pairs

## 📊 Sample Data Structure

The system creates these sample devices:
- **Living Room Light** (60W)
- **Bedroom Fan** (75W)
- **Kitchen Light** (40W)
- **Bedroom AC** (1500W)
- **Hall TV** (150W)

Each device gets 90 days of historical ON/OFF events with realistic usage patterns.

## 🚀 Next Steps

1. **Customize device wattages** for your actual appliances
2. **Adjust electricity rates** based on your local tariff
3. **Configure ESP32 devices** to send real events
4. **Set up alerts** for high usage days
5. **Export data** for electricity bill verification

---

🎉 **You're all set!** Your Indian electricity billing system is ready to track and calculate your IoT device energy consumption costs.