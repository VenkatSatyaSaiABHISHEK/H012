// Main billing dashboard with calendar, stats, and daily usage table
// src/components/BillingDashboard.tsx

import React, { useState, useEffect } from 'react';
import UsageCalendar from './UsageCalendar';
import { fetchMonthlyUsage, getOverallStats } from '../utils/dailyUsageApi';
import { MonthlyStats, DailyUsageSummary, formatIndianCurrency, formatIndianDateTime, getCurrentIndianTime } from '../utils/billingCalculations';
import styles from './BillingDashboard.module.css';

interface DayEventsModalProps {
  isOpen: boolean;
  date: string;
  events: any[];
  onClose: () => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({ isOpen, date, events, onClose }) => {
  if (!isOpen) return null;

  const groupedEvents = events.reduce((acc, event) => {
    const deviceId = event.device_id;
    if (!acc[deviceId]) {
      acc[deviceId] = {
        device_name: event.device_name || deviceId,
        wattage: event.wattage || 60,
        unit_price: event.unit_price || 7.50,
        events: []
      };
    }
    acc[deviceId].events.push(event);
    return acc;
  }, {});

  return (
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <h3>Events for {new Date(date).toLocaleDateString('en-IN')}</h3>
          <button onClick={onClose} className={styles['close-button']}>×</button>
        </div>
        
        <div className="modal-body">
          {Object.keys(groupedEvents).length === 0 ? (
            <p>No events recorded for this day.</p>
          ) : (
            Object.entries(groupedEvents).map(([deviceId, deviceData]: [string, any]) => (
              <div key={deviceId} className={styles['device-events']}>
                <h4>{deviceData.device_name} ({deviceData.wattage}W)</h4>
                <div className={styles['events-list']}>
                  {deviceData.events.map((event: any, index: number) => (
                    <div key={index} className={styles['event-item']}>
                      <span className={styles['event-time']}>
                        {formatIndianDateTime(event.event_time)}
                      </span>
                      <span className={`${styles['event-state']} ${styles[event.state.toLowerCase()]}`}>
                        {event.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>


      </div>
    </div>
  );
};

const BillingDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(getCurrentIndianTime());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayEvents, setDayEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentDate(getCurrentIndianTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch monthly usage data
      const monthlyData = await fetchMonthlyUsage(selectedYear, selectedMonth);
      setMonthlyStats(monthlyData);

      // Fetch overall stats for the month
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      const statsData = await getOverallStats(startDate, endDate);
      setOverallStats(statsData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string, events: any[]) => {
    setSelectedDate(date);
    setDayEvents(events);
    setShowModal(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  return (
    <div className={styles['billing-dashboard']}>
      {/* Header with current time */}
      <div className={styles['dashboard-header']}>
        <div className={styles['header-content']}>
          <h1>Indian Electricity Billing Dashboard</h1>
          <div className={styles['current-time']}>
            <span className={styles['time-label']}>IST:</span>
            <span className={styles['time-value']}>{formatIndianDateTime(currentDate)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Cards */}
      <div className={styles['stats-grid']}>
        <div className={styles['stat-card']}>
          <div className={styles['stat-value']}>{overallStats?.total_events || 0}</div>
          <div className={styles['stat-label']}>Total Records</div>
        </div>
        <div className={styles['stat-card']}>
          <div className={styles['stat-value']}>{overallStats?.total_on_events || 0}</div>
          <div className={styles['stat-label']}>ON Events</div>
        </div>
        <div className={styles['stat-card']}>
          <div className={styles['stat-value']}>{overallStats?.total_runtime_hours?.toFixed(1) || '0.0'}h</div>
          <div className={styles['stat-label']}>Total Runtime</div>
        </div>
        <div className={styles['stat-card']}>
          <div className={styles['stat-value']}>{overallStats?.total_units_kwh?.toFixed(2) || '0.00'}</div>
          <div className={styles['stat-label']}>Units (kWh)</div>
        </div>
        <div className={`${styles['stat-card']} ${styles['highlight']}`}>
          <div className={styles['stat-value']}>{formatIndianCurrency(overallStats?.total_cost_inr || 0)}</div>
          <div className={styles['stat-label']}>Estimated Cost</div>
        </div>
        <div className={`${styles['stat-card']} ${styles['savings']}`}>
          <div className={styles['stat-value']}>
            {monthlyStats?.total_energy_saved_kwh?.toFixed(2) || '0.00'} kWh
          </div>
          <div className={styles['stat-label']}>Energy Saved</div>
        </div>
        <div className={`${styles['stat-card']} ${styles['savings']}`}>
          <div className={styles['stat-value']}>
            {formatIndianCurrency(monthlyStats?.total_cost_saved_inr || 0)}
          </div>
          <div className={styles['stat-label']}>Cost Saved</div>
        </div>
      </div>

      <div className={styles['dashboard-content']}>
        {/* Calendar Section */}
        <div className={styles['calendar-section']}>
          <div className={styles['section-header']}>
            <h2>Monthly Usage Calendar</h2>
            <div className={styles['month-navigation']}>
              <button onClick={() => navigateMonth('prev')} className={styles['nav-button']}>
                ← Prev Month
              </button>
              <span className={styles['current-month']}>
                {monthNames[selectedMonth]} {selectedYear}
              </span>
              <button onClick={() => navigateMonth('next')} className={styles['nav-button']}>
                Next Month →
              </button>
            </div>
          </div>

          <UsageCalendar
            year={selectedYear}
            month={selectedMonth}
            onDateClick={handleDateClick}
          />
        </div>

        {/* Daily Usage Table */}
        <div className={styles['daily-usage-section']}>
          <h2>Daily Usage Summary</h2>
          {loading ? (
            <div className={styles['loading']}>Loading...</div>
          ) : (
            <div className={styles['usage-table-container']}>
              <table className={styles['usage-table']}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Runtime (h)</th>
                    <th>Units (kWh)</th>
                    <th>Cost (₹)</th>
                    <th>Devices</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats?.daily_summaries?.map((day: DailyUsageSummary) => (
                    <tr key={day.date} className={styles['usage-row']}>
                      <td className={styles['date-cell']}>
                        {new Date(day.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </td>
                      <td className={styles['runtime-cell']}>
                        {day.total_runtime_hours.toFixed(1)}
                      </td>
                      <td className={styles['units-cell']}>
                        {day.total_units_kwh.toFixed(2)}
                      </td>
                      <td className={styles['cost-cell']}>
                        ₹{day.total_cost_inr.toFixed(2)}
                      </td>
                      <td className={styles['devices-cell']}>
                        {day.devices.length} device{day.devices.length !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Energy Savings Section */}
      {monthlyStats?.energy_savings && monthlyStats.energy_savings.length > 0 && (
        <div className={styles['savings-section']}>
          <h2>🌱 Energy Savings (Auto-Off)</h2>
          <div className={styles['savings-info']}>
            <p>Auto-off feature helps save energy when devices are left on too long:</p>
            <ul>
              <li>🌅 <strong>Daytime Lights:</strong> Auto-off after 1 hour (9AM-12PM)</li>
              <li>🌙 <strong>Night Lights:</strong> Auto-off after 4-5 hours (1AM-5AM)</li>
              <li>❄️ <strong>AC Units:</strong> Auto-off after long usage sessions</li>
            </ul>
          </div>
          
          <div className={styles['savings-table-container']}>
            <table className={styles['savings-table']}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Auto-Offs</th>
                  <th>Energy Saved (kWh)</th>
                  <th>Cost Saved (₹)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.energy_savings.map((saving) => (
                  <tr key={saving.device_id} className={styles['savings-row']}>
                    <td className={styles['device-name-cell']}>
                      {saving.device_name}
                    </td>
                    <td className={styles['auto-offs-cell']}>
                      {saving.total_auto_offs}
                    </td>
                    <td className={styles['energy-saved-cell']}>
                      {saving.energy_saved_kwh.toFixed(3)}
                    </td>
                    <td className={styles['cost-saved-cell']}>
                      ₹{saving.cost_saved_inr.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className={styles['savings-total-row']}>
                  <td><strong>Total Savings</strong></td>
                  <td><strong>{monthlyStats.energy_savings.reduce((sum, s) => sum + s.total_auto_offs, 0)}</strong></td>
                  <td><strong>{monthlyStats.total_energy_saved_kwh.toFixed(3)}</strong></td>
                  <td><strong>₹{monthlyStats.total_cost_saved_inr.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day Events Modal */}
      <DayEventsModal
        isOpen={showModal}
        date={selectedDate}
        events={dayEvents}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default BillingDashboard;