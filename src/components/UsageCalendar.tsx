// Monthly calendar component with usage highlighting
// src/components/UsageCalendar.tsx

import React, { useState, useEffect } from 'react';
import { formatIndianDate, generateCalendarDays } from '../utils/billingCalculations';
import { getUsageDaysInMonth, fetchDayEvents } from '../utils/dailyUsageApi';
import styles from './UsageCalendar.module.css';

interface UsageDay {
  date: string;
  total_runtime_hours: number;
  total_cost_inr: number;
}

interface CalendarDay {
  day: number;
  date: string;
  isCurrentMonth: boolean;
  hasUsage?: boolean;
  usageData?: UsageDay;
}

interface UsageCalendarProps {
  year: number;
  month: number;
  onDateClick: (date: string, events: any[]) => void;
  className?: string;
}

const UsageCalendar: React.FC<UsageCalendarProps> = ({
  year,
  month,
  onDateClick,
  className = ''
}) => {
  const [usageDays, setUsageDays] = useState<UsageDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchUsageDays();
  }, [year, month]);

  const fetchUsageDays = async () => {
    setLoading(true);
    try {
      const data = await getUsageDaysInMonth(year, month);
      setUsageDays(data);
    } catch (error) {
      console.error('Error fetching usage days:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = async (date: string) => {
    if (!date) return;
    
    setSelectedDate(date);
    try {
      const events = await fetchDayEvents(date);
      onDateClick(date, events);
    } catch (error) {
      console.error('Error fetching day events:', error);
      onDateClick(date, []);
    }
  };

  const calendarDays = generateCalendarDays(year, month);
  
  // Create a map of usage data by date for quick lookup
  const usageMap = usageDays.reduce((acc, usage) => {
    acc[usage.date] = usage;
    return acc;
  }, {} as Record<string, UsageDay>);

  // Enhance calendar days with usage data
  const enhancedDays: CalendarDay[] = calendarDays.map(day => ({
    ...day,
    hasUsage: day.date ? !!usageMap[day.date] : false,
    usageData: day.date ? usageMap[day.date] : undefined
  }));

  return (
    <div className={`${styles['usage-calendar']} ${className}`}>
      <div className={styles['calendar-header']}>
        <h3 className={styles['calendar-title']}>
          {monthNames[month]} {year}
        </h3>
        {loading && (
          <div className={styles['loading-indicator']}>
            <span>Loading...</span>
          </div>
        )}
      </div>

      <div className={styles['calendar-grid']}>
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className={styles['calendar-header-cell']}>
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {enhancedDays.map((day, index) => (
          <div
            key={index}
            className={`${styles['calendar-day']} ${
              !day.isCurrentMonth ? styles['other-month'] : ''
            } ${
              day.hasUsage ? styles['has-usage'] : ''
            } ${
              selectedDate === day.date ? styles['selected'] : ''
            } ${
              day.isCurrentMonth && day.day ? styles['clickable'] : ''
            }`}
            onClick={() => day.isCurrentMonth && day.date && handleDateClick(day.date)}
            title={
              day.hasUsage && day.usageData
                ? `Runtime: ${day.usageData.total_runtime_hours}h\nCost: ₹${day.usageData.total_cost_inr}`
                : undefined
            }
          >
            <div className={styles['day-number']}>
              {day.day || ''}
            </div>
            {day.hasUsage && day.usageData && (
              <div className={styles['usage-details']}>
                <div className={styles['daily-summary']}>
                  <div className={styles['usage-bar']}></div>
                  <div className={styles['summary-stats']}>
                    <span className={styles['runtime-text']}>
                      {day.usageData.total_runtime_hours.toFixed(1)}h
                    </span>
                    <span className={styles['cost-text']}>
                      ₹{day.usageData.total_cost_inr.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className={styles['time-indicators']}>
                  <div className={styles['morning-indicator']} title="Morning Usage"></div>
                  <div className={styles['evening-indicator']} title="Evening Usage"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles['calendar-legend']}>
        <div className={styles['legend-item']}>
          <div className={`${styles['legend-color']} ${styles['has-usage']}`}></div>
          <span>Days with usage</span>
        </div>
        <div className={styles['legend-item']}>
          <div className={`${styles['legend-color']} ${styles['no-usage']}`}></div>
          <span>No usage</span>
        </div>
      </div>


    </div>
  );
};

export default UsageCalendar;