// Indian electricity billing calculation utilities
// src/utils/billingCalculations.ts

export interface DeviceUsage {
  device_id: string;
  device_name?: string;
  usage_date: string;
  total_runtime_hours: number;
  total_units_kwh: number;
  total_cost_inr: number;
  on_events_count: number;
  wattage?: number;
  unit_price?: number;
}

export interface DailyUsageSummary {
  date: string;
  total_runtime_hours: number;
  total_units_kwh: number;
  total_cost_inr: number;
  total_on_events: number;
  devices: DeviceUsage[];
}

export interface EnergySavings {
  device_id: string;
  device_name: string;
  total_auto_offs: number;
  energy_saved_kwh: number;
  cost_saved_inr: number;
}

export interface MonthlyStats {
  month: string;
  total_records: number;
  total_on_events: number;
  total_runtime_hours: number;
  total_units_kwh: number;
  total_cost_inr: number;
  days_with_usage: number;
  energy_savings: EnergySavings[];
  total_energy_saved_kwh: number;
  total_cost_saved_inr: number;
  daily_summaries: DailyUsageSummary[];
}

/**
 * Calculate energy consumption and cost for a device
 */
export function calculateDeviceConsumption(
  runtimeHours: number,
  wattage: number,
  unitPrice: number = 7.50
) {
  const kw = wattage / 1000; // Convert watts to kilowatts
  const units = kw * runtimeHours; // kWh
  const cost = units * unitPrice; // ₹
  
  return {
    kw,
    units: parseFloat(units.toFixed(4)),
    cost: parseFloat(cost.toFixed(2))
  };
}

/**
 * Calculate runtime from ON/OFF event pairs
 */
export function calculateRuntimeFromEvents(events: Array<{
  event_time: string;
  state: 'ON' | 'OFF';
}>): number {
  let totalRuntimeHours = 0;
  let lastOnTime: Date | null = null;

  // Sort events by time
  const sortedEvents = events.sort((a, b) => 
    new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  );

  for (const event of sortedEvents) {
    const eventTime = new Date(event.event_time);

    if (event.state === 'ON') {
      lastOnTime = eventTime;
    } else if (event.state === 'OFF' && lastOnTime) {
      const runtimeMs = eventTime.getTime() - lastOnTime.getTime();
      const runtimeHours = runtimeMs / (1000 * 60 * 60);
      totalRuntimeHours += runtimeHours;
      lastOnTime = null;
    }
  }

  return parseFloat(totalRuntimeHours.toFixed(2));
}

/**
 * Format Indian currency
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format Indian date and time
 */
export function formatIndianDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);
}

/**
 * Format date for display
 */
export function formatIndianDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(d);
}

/**
 * Get current Indian time
 */
export function getCurrentIndianTime(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
}

/**
 * Get month boundaries in IST
 */
export function getMonthBoundaries(year: number, month: number) {
  // month is 0-indexed (0 = January)
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of the month
  
  return {
    start: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Generate calendar days for a month
 */
export function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push({ day: 0, date: '', isCurrentMonth: false });
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      day,
      date: date.toISOString().split('T')[0],
      isCurrentMonth: true
    });
  }
  
  return days;
}

/**
 * Aggregate daily usage data by month
 */
export function aggregateMonthlyUsage(dailyUsages: DeviceUsage[]): MonthlyStats {
  if (dailyUsages.length === 0) {
    return {
      month: '',
      total_records: 0,
      total_on_events: 0,
      total_runtime_hours: 0,
      total_units_kwh: 0,
      total_cost_inr: 0,
      days_with_usage: 0,
      energy_savings: [],
      total_energy_saved_kwh: 0,
      total_cost_saved_inr: 0,
      daily_summaries: []
    };
  }

  // Group by date
  const dailyGroups = dailyUsages.reduce((acc, usage) => {
    const date = usage.usage_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(usage);
    return acc;
  }, {} as Record<string, DeviceUsage[]>);

  // Create daily summaries
  const daily_summaries: DailyUsageSummary[] = Object.entries(dailyGroups).map(([date, devices]) => ({
    date,
    total_runtime_hours: devices.reduce((sum, d) => sum + d.total_runtime_hours, 0),
    total_units_kwh: devices.reduce((sum, d) => sum + d.total_units_kwh, 0),
    total_cost_inr: devices.reduce((sum, d) => sum + d.total_cost_inr, 0),
    total_on_events: devices.reduce((sum, d) => sum + d.on_events_count, 0),
    devices
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Calculate totals
  const totals = dailyUsages.reduce((acc, usage) => ({
    total_records: acc.total_records + 1,
    total_on_events: acc.total_on_events + usage.on_events_count,
    total_runtime_hours: acc.total_runtime_hours + usage.total_runtime_hours,
    total_units_kwh: acc.total_units_kwh + usage.total_units_kwh,
    total_cost_inr: acc.total_cost_inr + usage.total_cost_inr
  }), {
    total_records: 0,
    total_on_events: 0,
    total_runtime_hours: 0,
    total_units_kwh: 0,
    total_cost_inr: 0
  });

  const firstDate = dailyUsages[0]?.usage_date;
  const monthName = firstDate ? formatIndianDate(firstDate).slice(-8) : '';

  return {
    month: monthName,
    ...totals,
    total_runtime_hours: parseFloat(totals.total_runtime_hours.toFixed(2)),
    total_units_kwh: parseFloat(totals.total_units_kwh.toFixed(4)),
    total_cost_inr: parseFloat(totals.total_cost_inr.toFixed(2)),
    days_with_usage: Object.keys(dailyGroups).length,
    energy_savings: [], // Will be populated by API call
    total_energy_saved_kwh: 0,
    total_cost_saved_inr: 0,
    daily_summaries
  };
}