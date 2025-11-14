# Setup Fake Data for Indian Billing System

## Step 1: Run Database Schema Updates

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase-billing-schema.sql`
4. Click "Run" to execute the schema updates

## Step 2: Generate Fake Historical Data

1. In the same SQL Editor
2. Copy and paste the contents of `supabase-realistic-seed-data.sql`
3. Click "Run" to generate 3 months of realistic device usage data

## What This Will Give You:

- **October 2024**: Full month of realistic device events (10-18 per day)
- **September 2024**: Full month of data
- **August 2024**: Full month of data
- **Realistic patterns**: Morning turn-ons, evening turn-offs, weekend variations
- **Auto-off events**: 30% of sessions have automatic shutdowns for energy savings

## Expected Results After Running:

✅ **Calendar View**: Light blue colored boxes for days with device usage
✅ **Daily Statistics**: Runtime hours, energy units (kWh), costs in ₹
✅ **Energy Savings**: Auto-off events and money saved calculations
✅ **Monthly Totals**: Accurate billing summaries for each month

## Verification:

After running the SQL scripts:
1. Go to your dashboard
2. Open "Data & Bills" dialog
3. Click "Indian Billing" tab
4. Select "October 2024" from the month dropdown
5. You should see colored daily boxes with usage data

## Troubleshooting:

- If you see "0" values, the SQL scripts haven't been run yet
- If calendar boxes aren't colored, check the browser console for errors
- If data looks unrealistic, you can modify the SQL seed script parameters

## Files to Execute (in order):
1. `supabase-billing-schema.sql` - Database structure
2. `supabase-realistic-seed-data.sql` - Fake data generation