// API functions for daily usage and billing data
// src/utils/dailyUsageApi.ts

import { supabase } from '../config/supabase';
import { DeviceUsage, MonthlyStats, EnergySavings, aggregateMonthlyUsage, getMonthBoundaries } from './billingCalculations';

/**
 * Fetch daily usage summary from Supabase
 */
export async function fetchDailyUsageSummary(
  startDate: string,
  endDate: string,
  deviceId?: string
) {
  try {
    let query = supabase
      .from('daily_usage_summary')
      .select(`
        *,
        devices!daily_usage_summary_device_id_fkey (
          device_name,
          wattage,
          unit_price
        )
      `)
      .gte('usage_date', startDate)
      .lte('usage_date', endDate)
      .order('usage_date', { ascending: false });

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily usage:', error);
      throw error;
    }

    // Transform data to match our interface
    const transformedData: DeviceUsage[] = data?.map(item => ({
      device_id: item.device_id,
      device_name: item.devices?.device_name || item.device_id,
      usage_date: item.usage_date,
      total_runtime_hours: parseFloat(item.total_runtime_hours || '0'),
      total_units_kwh: parseFloat(item.total_units_kwh || '0'),
      total_cost_inr: parseFloat(item.total_cost_inr || '0'),
      on_events_count: item.on_events_count || 0,
      wattage: item.devices?.wattage || 60,
      unit_price: parseFloat(item.devices?.unit_price || '7.50')
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Failed to fetch daily usage summary:', error);
    throw error;
  }
}

/**
 * Fetch monthly usage statistics
 */
export async function fetchMonthlyUsage(year: number, month: number): Promise<MonthlyStats> {
  try {
    const { start, end } = getMonthBoundaries(year, month);
    const dailyUsages = await fetchDailyUsageSummary(start, end);
    const energySavings = await fetchEnergySavings(start, end);
    
    const monthlyStats = aggregateMonthlyUsage(dailyUsages);
    
    // Add energy savings data
    monthlyStats.energy_savings = energySavings;
    monthlyStats.total_energy_saved_kwh = energySavings.reduce((sum: number, saving: EnergySavings) => sum + saving.energy_saved_kwh, 0);
    monthlyStats.total_cost_saved_inr = energySavings.reduce((sum: number, saving: EnergySavings) => sum + saving.cost_saved_inr, 0);
    
    return monthlyStats;
  } catch (error) {
    console.error('Failed to fetch monthly usage:', error);
    throw error;
  }
}

/**
 * Fetch device events for a specific day
 */
export async function fetchDayEvents(date: string, deviceId?: string) {
  try {
    let query = supabase
      .from('device_events')
      .select(`
        *,
        devices!device_events_device_id_fkey (
          device_name,
          wattage,
          unit_price
        )
      `)
      .gte('event_time', `${date}T00:00:00.000Z`)
      .lt('event_time', `${date}T23:59:59.999Z`)
      .order('event_time', { ascending: true });

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching day events:', error);
      throw error;
    }

    return data?.map(event => ({
      ...event,
      device_name: event.devices?.device_name || event.device_id,
      wattage: event.devices?.wattage || 60,
      unit_price: parseFloat(event.devices?.unit_price || '7.50')
    })) || [];
  } catch (error) {
    console.error('Failed to fetch day events:', error);
    throw error;
  }
}

/**
 * Get days with usage for a month (for calendar highlighting)
 */
export async function getUsageDaysInMonth(year: number, month: number) {
  try {
    const { start, end } = getMonthBoundaries(year, month);
    
    const { data, error } = await supabase
      .from('daily_usage_summary')
      .select('usage_date, total_runtime_hours, total_cost_inr')
      .gte('usage_date', start)
      .lte('usage_date', end)
      .gt('total_runtime_hours', 0)
      .order('usage_date');

    if (error) {
      console.error('Error fetching usage days:', error);
      throw error;
    }

    // Group by date and sum up totals
    const dailyTotals = data?.reduce((acc, item) => {
      const date = item.usage_date;
      if (!acc[date]) {
        acc[date] = { runtime: 0, cost: 0 };
      }
      acc[date].runtime += parseFloat(item.total_runtime_hours || '0');
      acc[date].cost += parseFloat(item.total_cost_inr || '0');
      return acc;
    }, {} as Record<string, { runtime: number; cost: number }>) || {};

    return Object.entries(dailyTotals).map(([date, totals]) => ({
      date,
      total_runtime_hours: parseFloat(totals.runtime.toFixed(2)),
      total_cost_inr: parseFloat(totals.cost.toFixed(2))
    }));
  } catch (error) {
    console.error('Failed to fetch usage days:', error);
    throw error;
  }
}

/**
 * Refresh daily usage summary for a specific device and date
 */
export async function refreshDailyUsage(deviceId?: string, date?: string) {
  try {
    const { data, error } = await supabase.rpc('refresh_daily_usage_summary', {
      p_device_id: deviceId || null,
      p_date: date || null
    });

    if (error) {
      console.error('Error refreshing daily usage:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to refresh daily usage:', error);
    throw error;
  }
}

/**
 * Fetch energy savings data
 */
export async function fetchEnergySavings(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase.rpc('calculate_energy_savings', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching energy savings:', error);
      throw error;
    }

    return data?.map((item: any) => ({
      device_id: item.device_id,
      device_name: item.device_name,
      total_auto_offs: item.total_auto_offs || 0,
      energy_saved_kwh: parseFloat(item.energy_saved_kwh || '0'),
      cost_saved_inr: parseFloat(item.cost_saved_inr || '0')
    })) || [];
  } catch (error) {
    console.error('Failed to fetch energy savings:', error);
    return [];
  }
}

/**
 * Get overall statistics for a date range
 */
export async function getOverallStats(startDate: string, endDate: string) {
  try {
    // Get total events count
    const { data: eventsData, error: eventsError } = await supabase
      .from('device_events')
      .select('id, state')
      .gte('event_time', `${startDate}T00:00:00.000Z`)
      .lt('event_time', `${endDate}T23:59:59.999Z`);

    if (eventsError) throw eventsError;

    // Get usage summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('daily_usage_summary')
      .select('total_runtime_hours, total_units_kwh, total_cost_inr, on_events_count')
      .gte('usage_date', startDate)
      .lte('usage_date', endDate);

    if (summaryError) throw summaryError;

    const totalEvents = eventsData?.length || 0;
    const totalOnEvents = eventsData?.filter(e => e.state === 'ON').length || 0;
    
    const totals = summaryData?.reduce((acc, item) => ({
      runtime: acc.runtime + parseFloat(item.total_runtime_hours || '0'),
      units: acc.units + parseFloat(item.total_units_kwh || '0'),
      cost: acc.cost + parseFloat(item.total_cost_inr || '0')
    }), { runtime: 0, units: 0, cost: 0 }) || { runtime: 0, units: 0, cost: 0 };

    return {
      total_events: totalEvents,
      total_on_events: totalOnEvents,
      total_runtime_hours: parseFloat(totals.runtime.toFixed(2)),
      total_units_kwh: parseFloat(totals.units.toFixed(4)),
      total_cost_inr: parseFloat(totals.cost.toFixed(2))
    };
  } catch (error) {
    console.error('Failed to fetch overall stats:', error);
    throw error;
  }
}