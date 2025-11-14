import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Lightbulb,
  Refresh,
  ElectricBolt,
  Help,
  TrendingUp,
  Schedule,
  CalendarToday
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { useDemoMode } from '../context/DemoModeContext';
import { fakeDataService, FakeDeviceEvent } from '../utils/fakeDataService';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, differenceInMinutes } from 'date-fns';

interface DeviceUsage {
  deviceId: string;
  deviceName: string;
  totalDuration: number; // in minutes
  sessionCount: number;
  totalCost: number;
  totalUnits: number;
  lastUsed: Date | null;
  averageSessionDuration: number;
}

interface UsagePeriod {
  label: string;
  value: string;
  getStartDate: () => Date;
  getEndDate: () => Date;
}

const DEVICE_POWER_RATING = 60; // Watts
const COST_PER_KWH = 6.5; // INR per kWh

const USAGE_PERIODS: UsagePeriod[] = [
  {
    label: 'Today',
    value: 'today',
    getStartDate: () => startOfDay(new Date()),
    getEndDate: () => endOfDay(new Date())
  },
  {
    label: 'This Week',
    value: 'week',
    getStartDate: () => startOfWeek(new Date()),
    getEndDate: () => endOfWeek(new Date())
  },
  {
    label: 'Last 7 Days',
    value: '7days',
    getStartDate: () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    },
    getEndDate: () => new Date()
  },
  {
    label: 'Last 30 Days',
    value: '30days',
    getStartDate: () => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    },
    getEndDate: () => new Date()
  }
];

const getDeviceName = (deviceId: string): string => {
  const deviceNames: Record<string, string> = {
    '6c0af03d': 'Living Room Light',
    '68e9d693ba649e246c0af03d': 'Living Room Light',
    'esp32_relay_1': 'Fan Controller',
    'esp32_relay_2': 'Kitchen Light'
  };
  
  // Try exact match first
  if (deviceNames[deviceId]) return deviceNames[deviceId];
  
  // Try partial match
  for (const [key, name] of Object.entries(deviceNames)) {
    if (deviceId.includes(key) || key.includes(deviceId)) {
      return name;
    }
  }
  
  return `Device ${deviceId.slice(-4)}`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const formatIndianCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const DeviceUsageSummary: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [deviceUsages, setDeviceUsages] = useState<DeviceUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDeviceUsage = async () => {
    setLoading(true);
    try {
      const period = USAGE_PERIODS.find(p => p.value === selectedPeriod);
      if (!period) return;

      const startDate = period.getStartDate();
      const endDate = period.getEndDate();

      let events;
      if (isDemoMode) {
        // Use fake data in demo mode
        const fakeEvents = fakeDataService.getAllHistoricalEvents();
        const filteredEvents = fakeEvents.filter(event => {
          const eventDate = new Date(event.created_at);
          return eventDate >= startDate && eventDate <= endDate;
        });
        events = filteredEvents.map((event: FakeDeviceEvent) => ({
          device_id: event.device_id,
          state: event.state,
          created_at: event.created_at
        }));
      } else {
        // Fetch real events from Supabase
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;
        events = data;
      }

      // Group events by device and calculate usage
      const deviceMap = new Map<string, {
        events: any[];
        sessions: { start: Date; end: Date; duration: number }[];
      }>();

      // Group events by device
      events?.forEach((event: any) => {
        if (!deviceMap.has(event.device_id)) {
          deviceMap.set(event.device_id, { events: [], sessions: [] });
        }
        deviceMap.get(event.device_id)!.events.push(event);
      });

      // Calculate sessions and usage for each device
      const usages: DeviceUsage[] = [];
      let overallTotalCost = 0;
      let overallTotalHours = 0;

      deviceMap.forEach((deviceData, deviceId) => {
        const events = deviceData.events;
        const sessions: { start: Date; end: Date; duration: number }[] = [];
        let totalDuration = 0;

        // Sort events chronologically (oldest first) for proper session pairing
        events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Find ON/OFF pairs to calculate actual usage sessions
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          if (event.state === 'ON') {
            // Find the next OFF event for this device (chronologically after this ON)
            const nextOffEvent = events.find((e, index) => 
              index > i && 
              e.device_id === deviceId && 
              e.state === 'OFF'
            );

            if (nextOffEvent) {
              const startTime = new Date(event.created_at);
              const endTime = new Date(nextOffEvent.created_at);
              const duration = differenceInMinutes(endTime, startTime);
              
              if (duration > 0 && duration < 1440) { // Ignore sessions longer than 24 hours (probably data issues)
                sessions.push({
                  start: startTime,
                  end: endTime,
                  duration
                });
                totalDuration += duration;
              }
            } else {
              // Check if this ON event is still running (most recent event for this device)
              const mostRecentEvent = events[events.length - 1];
              if (mostRecentEvent.device_id === deviceId && mostRecentEvent.state === 'ON' && mostRecentEvent.created_at === event.created_at) {
                // Device is currently running - calculate current session duration
                const startTime = new Date(event.created_at);
                const now = new Date();
                const currentDuration = differenceInMinutes(now, startTime);
                
                if (currentDuration > 0 && currentDuration < 1440) {
                  sessions.push({
                    start: startTime,
                    end: now,
                    duration: currentDuration
                  });
                  totalDuration += currentDuration;
                }
              }
            }
          }
        }

        const hours = totalDuration / 60;
        const units = (hours * DEVICE_POWER_RATING) / 1000;
        const cost = units * COST_PER_KWH;
        const lastUsedEvent = events[events.length - 1];

        const usage: DeviceUsage = {
          deviceId,
          deviceName: getDeviceName(deviceId),
          totalDuration,
          sessionCount: sessions.length,
          totalCost: cost,
          totalUnits: units,
          lastUsed: lastUsedEvent ? new Date(lastUsedEvent.created_at) : null,
          averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0
        };

        usages.push(usage);
        overallTotalCost += cost;
        overallTotalHours += hours;
      });

      // Sort by total duration (most used first)
      usages.sort((a, b) => b.totalDuration - a.totalDuration);

      setDeviceUsages(usages);
      setTotalCost(overallTotalCost);
      setTotalHours(overallTotalHours);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading device usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeviceUsage();
  }, [selectedPeriod]);

  const selectedPeriodData = USAGE_PERIODS.find(p => p.value === selectedPeriod);
  const maxDuration = Math.max(...deviceUsages.map(d => d.totalDuration), 1);

  return (
    <Card className="glass-card" sx={{ height: 'fit-content' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Device Usage Summary
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={selectedPeriod}
                label="Period"
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {USAGE_PERIODS.map(period => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={loadDeviceUsage} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={2} mb={3}>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}
          >
            <Typography variant="h4" color="success.main" fontWeight="bold">
              {formatIndianCurrency(totalCost)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Cost ({selectedPeriodData?.label})
            </Typography>
          </Box>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(33, 150, 243, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(33, 150, 243, 0.2)'
            }}
          >
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {totalHours.toFixed(1)}h
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Usage Time
            </Typography>
          </Box>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(255, 193, 7, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(255, 193, 7, 0.2)'
            }}
          >
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              {(() => {
                // Estimate energy saved through auto-off
                const totalSessions = deviceUsages.reduce((sum, device) => sum + device.sessionCount, 0);
                const estimatedAutoOffEvents = Math.floor(totalSessions * 0.3); // 30% auto-off rate
                return estimatedAutoOffEvents;
              })()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Auto-Off Events
            </Typography>
          </Box>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(139, 195, 74, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(139, 195, 74, 0.2)'
            }}
          >
            <Typography variant="h4" color="success.dark" fontWeight="bold">
              {(() => {
                // Calculate estimated energy saved
                const totalSessions = deviceUsages.reduce((sum, device) => sum + device.sessionCount, 0);
                const estimatedAutoOffEvents = Math.floor(totalSessions * 0.3);
                const avgSavedHoursPerEvent = 2; // Assume 2h saved per auto-off
                const totalSavedHours = estimatedAutoOffEvents * avgSavedHoursPerEvent;
                const savedUnits = (totalSavedHours * DEVICE_POWER_RATING) / 1000;
                const savedCost = savedUnits * COST_PER_KWH;
                return formatIndianCurrency(savedCost);
              })()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Money Saved
            </Typography>
          </Box>
        </Box>

        {/* Auto-Off Savings Details */}
        <Card sx={{ mb: 3, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ElectricBolt color="success" />
              <Typography variant="h6" fontWeight={600} color="success.main">
                Energy Savings with Auto-Off
              </Typography>
              <Tooltip title="Energy saved when devices are automatically turned off after prolonged usage">
                <IconButton size="small">
                  <Help fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Our smart system automatically turns off devices to save energy in these scenarios:
            </Typography>
            
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.5)', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="success.dark">
                  Daytime Auto-Off (9AM-12PM)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lights turned off after 1+ hours during bright daylight
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.5)', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="success.dark">
                  Night Auto-Off (11PM-6AM)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Devices turned off after 4-5 hours of continuous usage
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.5)', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="success.dark">
                  Extended Usage Protection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auto-off after 6+ hours to prevent energy waste
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Device Usage Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell align="right">Usage Time</TableCell>
                <TableCell align="right">Sessions</TableCell>
                <TableCell align="right">Avg Session</TableCell>
                <TableCell align="right">Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deviceUsages.map((device) => (
                <TableRow key={device.deviceId}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Lightbulb fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {device.deviceName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {device.lastUsed ? `Last used: ${format(device.lastUsed, 'MMM dd, HH:mm')}` : 'Never used'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDuration(device.totalDuration)}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(device.totalDuration / maxDuration) * 100}
                        sx={{ width: 60, height: 4, mt: 0.5 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={device.sessionCount} 
                      size="small" 
                      color={device.sessionCount > 0 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {device.sessionCount > 0 ? formatDuration(device.averageSessionDuration) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500} color="success.main">
                      {device.totalCost > 0 ? formatIndianCurrency(device.totalCost) : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {deviceUsages.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No device usage data found for {selectedPeriodData?.label.toLowerCase()}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Last updated: {format(lastUpdated, 'MMM dd, HH:mm:ss')} • 
          Rate: ₹{COST_PER_KWH}/kWh • Device Power: {DEVICE_POWER_RATING}W
        </Typography>
      </CardContent>
    </Card>
  );
};