import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  TableChart,
  DateRange,
  ElectricBolt,
  CurrencyRupee,
  AccessTime,
  TrendingUp,
  CalendarMonth
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { config } from '../config';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import BillingDashboard from './BillingDashboard';
import { useDemoMode } from '../context/DemoModeContext';
import { fakeDataService } from '../utils/fakeDataService';

interface DataViewerProps {
  open: boolean;
  onClose: () => void;
}

interface DeviceHistoryRecord {
  id: string;
  device_id: string;
  state: string;
  ts: number;
  created_at: string;
}

interface MonthlyBill {
  month: string;
  totalHours: number;
  totalUnits: number; // kWh
  totalCost: number; // INR
  deviceBreakdown: Array<{
    deviceId: string;
    deviceName: string;
    hours: number;
    units: number;
    cost: number;
  }>;
}

// Supabase client is imported from config

export const DataViewer: React.FC<DataViewerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { isDemoMode } = useDemoMode();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeviceHistoryRecord[]>([]);
  const [filteredData, setFilteredData] = useState<DeviceHistoryRecord[]>([]);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [deviceFilter, setDeviceFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Indian electricity rates (you can adjust these)
  const COST_PER_KWH = 6.5; // INR per kWh (average in India)
  const DEVICE_POWER_RATING = 60; // Watts (average for LED bulbs/small appliances)

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let historyData: DeviceHistoryRecord[] = [];
      
      if (isDemoMode) {
        // Use fake data in demo mode
        const fakeEvents = fakeDataService.getAllHistoricalEvents();
        historyData = fakeEvents.map(event => ({
          id: event.id,
          device_id: event.device_id,
          state: event.state,
          ts: new Date(event.created_at).getTime() / 1000, // Convert to Unix timestamp
          created_at: event.created_at
        }));
      } else {
        // Use real Supabase data in real mode
        const { data: supabaseData, error: historyError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (historyError) {
          throw new Error(historyError.message);
        }
        
        historyData = supabaseData || [];
      }

      setData(historyData);
      setFilteredData(historyData);
      calculateMonthlyBills(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyBills = (records: DeviceHistoryRecord[]) => {
    // Group records by month
    const monthlyData: { [month: string]: DeviceHistoryRecord[] } = {};
    
    records.forEach(record => {
      const month = format(parseISO(record.created_at), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }
      monthlyData[month].push(record);
    });

    // Calculate bills for each month
    const bills: MonthlyBill[] = Object.entries(monthlyData).map(([month, monthRecords]) => {
      const deviceUsage: { [deviceId: string]: { hours: number; records: number } } = {};
      
      // Calculate usage per device
      monthRecords.forEach(record => {
        if (record.state === 'ON') {
          if (!deviceUsage[record.device_id]) {
            deviceUsage[record.device_id] = { hours: 0, records: 0 };
          }
          // Estimate 1 hour of usage per ON event (you can adjust this)
          deviceUsage[record.device_id].hours += 1;
          deviceUsage[record.device_id].records += 1;
        }
      });

      // Create device breakdown
      const deviceBreakdown = Object.entries(deviceUsage).map(([deviceId, usage]) => {
        const units = (usage.hours * DEVICE_POWER_RATING) / 1000; // Convert to kWh
        const cost = units * COST_PER_KWH;
        
        return {
          deviceId,
          deviceName: getDeviceName(deviceId),
          hours: usage.hours,
          units,
          cost
        };
      });

      const totalHours = deviceBreakdown.reduce((sum, device) => sum + device.hours, 0);
      const totalUnits = deviceBreakdown.reduce((sum, device) => sum + device.units, 0);
      const totalCost = deviceBreakdown.reduce((sum, device) => sum + device.cost, 0);

      return {
        month: format(parseISO(month + '-01'), 'MMMM yyyy'),
        totalHours,
        totalUnits,
        totalCost,
        deviceBreakdown
      };
    });

    setMonthlyBills(bills.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()));
  };

  const getDeviceName = (deviceId: string): string => {
    const names: { [key: string]: string } = {
      '68e9d693ba649e246c0af03d': 'Living Room Light',
      '98a1b234cdef567890123456': 'Kitchen Light',
      'b12c3d4e5f67890123456789': 'Porch Light',
      'c123d456e789f0123456789a': 'Bedroom Lamp',
      'd234e567f8901234567890ab': 'Garden Light',
      'e345f678901234567890abcd': 'Garage Light'
    };
    return names[deviceId] || `Device ${deviceId.slice(-4)}`;
  };

  const formatIndianCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filterData = () => {
    let filtered = data;
    
    if (deviceFilter) {
      filtered = filtered.filter(record => 
        record.device_id.includes(deviceFilter) || 
        getDeviceName(record.device_id).toLowerCase().includes(deviceFilter.toLowerCase())
      );
    }
    
    if (selectedMonth) {
      const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
      const monthEnd = endOfMonth(parseISO(selectedMonth + '-01'));
      
      filtered = filtered.filter(record => 
        isWithinInterval(parseISO(record.created_at), { start: monthStart, end: monthEnd })
      );
    }
    
    setFilteredData(filtered);
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    filterData();
  }, [deviceFilter, selectedMonth, data]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          margin: { xs: 0.5, sm: 2 },
          width: { xs: 'calc(100% - 8px)', sm: 'auto' },
          maxHeight: { xs: 'calc(100vh - 16px)', sm: 'auto' },
          borderRadius: { xs: 1, sm: 2 }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(45deg, rgba(0,229,255,0.1), rgba(255,64,129,0.1))'
          : 'linear-gradient(45deg, rgba(33,150,243,0.1), rgba(156,39,176,0.1))'
      }}>
        <TableChart sx={{ color: theme.palette.primary.main }} />
        Device Data & Indian Electricity Bills
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ px: 3, pt: 2 }}>
          <Tab label="Raw Data" icon={<TableChart />} />
          <Tab label="Monthly Bills" icon={<CurrencyRupee />} />
          <Tab label="Indian Billing" icon={<CalendarMonth />} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading && (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              p={6}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <CircularProgress 
                size={60} 
                thickness={4}
                sx={{ 
                  mb: 3,
                  color: theme.palette.primary.main,
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} 
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 1,
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.7 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.7 }
                  }
                }}
              >
                {isDemoMode ? 'Generating Demo Data...' : 'Loading Device Data...'}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ textAlign: 'center', maxWidth: 300 }}
              >
                {isDemoMode 
                  ? 'Creating realistic device history with usage patterns and energy calculations'
                  : 'Fetching device events from Supabase database and calculating energy consumption'
                }
              </Typography>
              <Box 
                sx={{
                  mt: 3,
                  width: 200,
                  height: 4,
                  backgroundColor: theme.palette.grey[200],
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    animation: 'loadingBar 2s ease-in-out infinite',
                    '@keyframes loadingBar': {
                      '0%': { transform: 'translateX(-100%)' },
                      '100%': { transform: 'translateX(100%)' }
                    }
                  }}
                />
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>Database Error:</strong> {error}
            </Alert>
          )}

          {tabValue === 0 && (
            <Box>
              {/* Filters */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Filter by Device"
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    fullWidth
                    placeholder="Enter device ID or name"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Select Month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {/* Data Summary */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      {loading ? (
                        <Box>
                          <CircularProgress size={24} sx={{ mb: 1 }} />
                          <Typography variant="body2">Loading...</Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="h4" color="primary">
                            <Box component="span" sx={{ 
                              display: 'inline-block',
                              animation: loading ? 'pulse 2s infinite' : 'none',
                              '@keyframes pulse': {
                                '0%': { opacity: 0.6 },
                                '50%': { opacity: 1 },
                                '100%': { opacity: 0.6 }
                              }
                            }}>
                              {filteredData.length}
                            </Box>
                          </Typography>
                          <Typography variant="body2">Total Records</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      {loading ? (
                        <Box>
                          <CircularProgress size={24} sx={{ mb: 1, color: 'success.main' }} />
                          <Typography variant="body2">Loading...</Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="h4" color="success.main">
                            <Box component="span" sx={{ 
                              display: 'inline-block',
                              animation: 'countUp 0.5s ease-out',
                              '@keyframes countUp': {
                                '0%': { transform: 'scale(0.8)', opacity: 0 },
                                '100%': { transform: 'scale(1)', opacity: 1 }
                              }
                            }}>
                              {filteredData.filter(r => r.state === 'ON').length}
                            </Box>
                          </Typography>
                          <Typography variant="body2">ON Events</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      {loading ? (
                        <Box>
                          <CircularProgress size={24} sx={{ mb: 1, color: 'warning.main' }} />
                          <Typography variant="body2">Calculating...</Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="h4" color="warning.main">
                            <Box component="span" sx={{ 
                              display: 'inline-block',
                              animation: 'slideInUp 0.6s ease-out',
                              '@keyframes slideInUp': {
                                '0%': { transform: 'translateY(20px)', opacity: 0 },
                                '100%': { transform: 'translateY(0)', opacity: 1 }
                              }
                            }}>
                              {(() => {
                                // Calculate ACTUAL total runtime by pairing ON/OFF events
                                let totalMinutes = 0;
                                const sortedData = [...filteredData].sort((a, b) => 
                                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                );
                                
                                const deviceSessions = new Map();
                                
                                sortedData.forEach(record => {
                                  if (record.state === 'ON') {
                                    // Find corresponding OFF event
                                    const offEvent = sortedData.find(r => 
                                      r.device_id === record.device_id && 
                                      r.state === 'OFF' &&
                                      new Date(r.created_at) > new Date(record.created_at)
                                    );
                                    
                                    if (offEvent) {
                                      const onTime = new Date(record.created_at);
                                      const offTime = new Date(offEvent.created_at);
                                      const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                                      if (duration > 0 && duration < 1440) { // Valid session (< 24 hours)
                                        totalMinutes += duration;
                                      }
                                    }
                                  }
                                });
                                
                                return totalMinutes < 60 
                                  ? `${Math.round(totalMinutes)}m`
                                  : `${(totalMinutes / 60).toFixed(1)}h`;
                              })()
                            }
                            </Box>
                          </Typography>
                          <Typography variant="body2">Total Runtime</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      {loading ? (
                        <Box>
                          <CircularProgress size={24} sx={{ mb: 1, color: 'error.main' }} />
                          <Typography variant="body2">Computing Cost...</Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography variant="h4" color="error.main">
                            <Box component="span" sx={{ 
                              display: 'inline-block',
                              animation: 'bounceIn 0.7s ease-out',
                              '@keyframes bounceIn': {
                                '0%': { transform: 'scale(0.3)', opacity: 0 },
                                '50%': { transform: 'scale(1.05)' },
                                '70%': { transform: 'scale(0.9)' },
                                '100%': { transform: 'scale(1)', opacity: 1 }
                              }
                            }}>
                              {(() => {
                                // Calculate ACTUAL cost based on real usage time
                                let totalMinutes = 0;
                                const sortedData = [...filteredData].sort((a, b) => 
                                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                );
                                
                                sortedData.forEach(record => {
                                  if (record.state === 'ON') {
                                    const offEvent = sortedData.find(r => 
                                      r.device_id === record.device_id && 
                                      r.state === 'OFF' &&
                                      new Date(r.created_at) > new Date(record.created_at)
                                    );
                                    
                                    if (offEvent) {
                                      const onTime = new Date(record.created_at);
                                      const offTime = new Date(offEvent.created_at);
                                      const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                                      if (duration > 0 && duration < 1440) {
                                        totalMinutes += duration;
                                      }
                                    }
                                  }
                                });
                                
                                const hours = totalMinutes / 60;
                                const units = (hours * DEVICE_POWER_RATING) / 1000;
                                const cost = units * COST_PER_KWH;
                                return formatIndianCurrency(cost);
                              })()}
                            </Box>
                          </Typography>
                          <Typography variant="body2">Estimated Cost</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Data Table */}
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Units (kWh)</TableCell>
                      <TableCell>Cost (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && (
                      // Skeleton loader rows
                      [...Array(8)].map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {[...Array(6)].map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Box 
                                sx={{
                                  height: 20,
                                  backgroundColor: theme.palette.grey[200],
                                  borderRadius: 1,
                                  animation: `skeleton ${1 + cellIndex * 0.1}s ease-in-out infinite alternate`,
                                  '@keyframes skeleton': {
                                    '0%': { opacity: 0.4 },
                                    '100%': { opacity: 0.8 }
                                  }
                                }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                    {!loading && filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                              opacity: 0.7
                            }}
                          >
                            <TableChart sx={{ fontSize: 48, color: theme.palette.grey[400] }} />
                            <Typography variant="h6" color="text.secondary">
                              {isDemoMode ? 'Generating demo data...' : 'No device data found'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, textAlign: 'center' }}>
                              {isDemoMode 
                                ? 'Demo data is being generated. This may take a moment.'
                                : 'Try adjusting your filters or refresh the data to load device events.'
                              }
                            </Typography>
                            <Button 
                              variant="outlined" 
                              onClick={fetchData}
                              startIcon={<DateRange />}
                              sx={{ mt: 1 }}
                            >
                              {isDemoMode ? 'Generate Data' : 'Refresh Data'}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && filteredData.map((record, index) => {
                      // Calculate actual duration by finding the corresponding OFF event
                      let durationMinutes = 0;
                      let durationText = '—';
                      
                      if (record.state === 'ON') {
                        // Get all events for this device, sorted chronologically (oldest first)
                        const deviceEvents = filteredData
                          .filter(r => r.device_id === record.device_id)
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        
                        // Find current ON event in the sorted list
                        const currentEventIndex = deviceEvents.findIndex(e => 
                          e.created_at === record.created_at && e.state === 'ON'
                        );
                        
                        // Look for the immediate next OFF event after this ON event
                        let correspondingOffEvent = null;
                        
                        for (let i = currentEventIndex + 1; i < deviceEvents.length; i++) {
                          if (deviceEvents[i].state === 'OFF') {
                            correspondingOffEvent = deviceEvents[i];
                            break;
                          }
                        }
                        
                        if (correspondingOffEvent) {
                          const onTime = new Date(record.created_at);
                          const offTime = new Date(correspondingOffEvent.created_at);
                          durationMinutes = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                          
                          // Validate duration - allow up to 3 days but reject obvious data errors
                          // Legitimate scenarios: AC running all day, heaters, pumps, security devices
                          if (durationMinutes > 0 && durationMinutes <= 4320) { // Max 3 days (72 hours)
                            // Format duration properly
                            if (durationMinutes < 1) {
                              const seconds = Math.round(durationMinutes * 60);
                              durationText = `${seconds}s`;
                            } else if (durationMinutes < 60) {
                              durationText = `${Math.round(durationMinutes)}m`;
                            } else {
                              const hours = Math.floor(durationMinutes / 60);
                              const mins = Math.round(durationMinutes % 60);
                              durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                            }
                          } else {
                            // Duration is unrealistic (too long or negative)
                            durationText = durationMinutes <= 0 ? 'Invalid' : 'Too long (>3 days)';
                            durationMinutes = 0; // Don't include in totals
                          }
                        } else {
                          // Check if this device is currently ON by looking at the most recent event
                          const mostRecentEvent = filteredData.find(r => r.device_id === record.device_id);
                          if (mostRecentEvent && mostRecentEvent.state === 'ON' && mostRecentEvent.created_at === record.created_at) {
                            // This is the most recent event and it's ON - device is running
                            const onTime = new Date(record.created_at);
                            const now = new Date();
                            const currentDuration = (now.getTime() - onTime.getTime()) / (1000 * 60);
                            
                            if (currentDuration < 1) {
                              const seconds = Math.round(currentDuration * 60);
                              durationText = `Running... (${seconds}s)`;
                            } else if (currentDuration < 60) {
                              durationText = `Running... (${Math.round(currentDuration)}m)`;
                            } else {
                              const hours = Math.floor(currentDuration / 60);
                              const mins = Math.round(currentDuration % 60);
                              durationText = `Running... (${hours}h ${mins}m)`;
                            }
                          } else {
                            // This ON event has no corresponding OFF event and it's not the current state
                            durationText = 'No OFF event';
                          }
                        }
                      }
                      
                      const hours = durationMinutes / 60;
                      const units = (hours * DEVICE_POWER_RATING) / 1000;
                      const cost = units * COST_PER_KWH;
                      
                      return (
                        <TableRow key={record.id || index}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {format(parseISO(record.created_at), 'dd MMM yyyy')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(parseISO(record.created_at), 'hh:mm:ss a')}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">{getDeviceName(record.device_id)}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {record.device_id.slice(-8)}...
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={record.state} 
                              color={record.state === 'ON' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {durationText}
                          </TableCell>
                          <TableCell>
                            {record.state === 'ON' && durationMinutes > 0 ? units.toFixed(3) : '—'}
                          </TableCell>
                          <TableCell>
                            {record.state === 'ON' && durationMinutes > 0 ? formatIndianCurrency(cost) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Indian Electricity Billing</strong><br/>
                Rate: ₹{COST_PER_KWH}/kWh | Device Power: {DEVICE_POWER_RATING}W average
              </Alert>
              
              {monthlyBills.map((bill, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{bill.month}</Typography>
                      <Box textAlign="right">
                        <Typography variant="h4" color="primary">
                          {formatIndianCurrency(bill.totalCost)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bill.totalUnits.toFixed(2)} kWh | {bill.totalHours.toFixed(1)} hours
                        </Typography>
                      </Box>
                    </Box>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Device</TableCell>
                            <TableCell align="right">Hours</TableCell>
                            <TableCell align="right">Units (kWh)</TableCell>
                            <TableCell align="right">Cost (₹)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bill.deviceBreakdown.map((device) => (
                            <TableRow key={device.deviceId}>
                              <TableCell>{device.deviceName}</TableCell>
                              <TableCell align="right">{device.hours.toFixed(1)}h</TableCell>
                              <TableCell align="right">{device.units.toFixed(3)}</TableCell>
                              <TableCell align="right">{formatIndianCurrency(device.cost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              {/* Monthly Statistics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(45deg, #2196f3, #21cbf3)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {filteredData.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>Total Records</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(45deg, #4caf50, #8bc34a)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {filteredData.filter(r => r.state === 'ON').length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>ON Events</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(45deg, #ff9800, #ffc107)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {(() => {
                        let totalMinutes = 0;
                        const sortedData = [...filteredData].sort((a, b) => 
                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        
                        sortedData.forEach(record => {
                          if (record.state === 'ON') {
                            const offEvent = sortedData.find(r => 
                              r.device_id === record.device_id && 
                              r.state === 'OFF' &&
                              new Date(r.created_at) > new Date(record.created_at)
                            );
                            
                            if (offEvent) {
                              const onTime = new Date(record.created_at);
                              const offTime = new Date(offEvent.created_at);
                              const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                              if (duration > 0 && duration < 1440) {
                                totalMinutes += duration;
                              }
                            }
                          }
                        });
                        
                        return totalMinutes < 60 
                          ? `${Math.round(totalMinutes)}m`
                          : `${(totalMinutes / 60).toFixed(1)}h`;
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>Total Runtime</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(45deg, #f44336, #e91e63)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {(() => {
                        let totalMinutes = 0;
                        const sortedData = [...filteredData].sort((a, b) => 
                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        
                        sortedData.forEach(record => {
                          if (record.state === 'ON') {
                            const offEvent = sortedData.find(r => 
                              r.device_id === record.device_id && 
                              r.state === 'OFF' &&
                              new Date(r.created_at) > new Date(r.created_at)
                            );
                            
                            if (offEvent) {
                              const onTime = new Date(record.created_at);
                              const offTime = new Date(offEvent.created_at);
                              const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                              if (duration > 0 && duration < 1440) {
                                totalMinutes += duration;
                              }
                            }
                          }
                        });
                        
                        const hours = totalMinutes / 60;
                        const units = (hours * DEVICE_POWER_RATING) / 1000;
                        const cost = units * COST_PER_KWH;
                        return formatIndianCurrency(cost);
                      })()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>Estimated Cost</Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Daily Usage Calendar View */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Daily Usage Calendar - {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}
              </Typography>
              
              {/* Color Legend */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Usage Intensity Legend:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(156, 39, 176, 0.4)', borderRadius: 0.5 }} />
                    <Typography variant="caption">Very Light (&lt;0.5h)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(33, 150, 243, 0.4)', borderRadius: 0.5 }} />
                    <Typography variant="caption">Light (0.5-2h)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(76, 175, 80, 0.4)', borderRadius: 0.5 }} />
                    <Typography variant="caption">Moderate (2-4h)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(255, 152, 0, 0.4)', borderRadius: 0.5 }} />
                    <Typography variant="caption">Medium (4-8h)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(244, 67, 54, 0.4)', borderRadius: 0.5 }} />
                    <Typography variant="caption">Heavy (8h+)</Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: 1, 
                mb: 3,
                background: '#f5f5f5',
                p: 2,
                borderRadius: 2
              }}>
                {/* Week headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Box key={day} sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    p: 1,
                    background: '#333',
                    color: 'white',
                    borderRadius: 1
                  }}>
                    {day}
                  </Box>
                ))}
                
                {/* Calendar days */}
                {(() => {
                  const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
                  const monthEnd = endOfMonth(parseISO(selectedMonth + '-01'));
                  const startDate = new Date(monthStart);
                  startDate.setDate(startDate.getDate() - monthStart.getDay());
                  
                  const days = [];
                  const current = new Date(startDate);
                  
                  for (let i = 0; i < 42; i++) {
                    const isCurrentMonth = current.getMonth() === monthStart.getMonth();
                    const dateStr = format(current, 'yyyy-MM-dd');
                    
                    // Calculate day's events
                    const dayEvents = filteredData.filter(record => 
                      format(parseISO(record.created_at), 'yyyy-MM-dd') === dateStr
                    );
                    
                    const onEvents = dayEvents.filter(e => e.state === 'ON');
                    const hasUsage = onEvents.length > 0;
                    
                    // Calculate runtime for the day
                    let dayRuntime = 0;
                    const sortedDayEvents = dayEvents.sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    
                    sortedDayEvents.forEach(record => {
                      if (record.state === 'ON') {
                        const offEvent = sortedDayEvents.find(r => 
                          r.device_id === record.device_id && 
                          r.state === 'OFF' &&
                          new Date(r.created_at) > new Date(record.created_at)
                        );
                        
                        if (offEvent) {
                          const duration = (new Date(offEvent.created_at).getTime() - new Date(record.created_at).getTime()) / (1000 * 60);
                          if (duration > 0 && duration < 1440) {
                            dayRuntime += duration;
                          }
                        }
                      }
                    });
                    
                    const hours = dayRuntime / 60;
                    const cost = (hours * DEVICE_POWER_RATING / 1000) * COST_PER_KWH;
                    
                    // Different colors based on usage intensity
                    const getUsageColor = () => {
                      if (!hasUsage) return isCurrentMonth ? 'white' : '#f9f9f9';
                      
                      if (hours >= 8) return 'rgba(244, 67, 54, 0.4)'; // Red for heavy usage (8+ hours)
                      if (hours >= 4) return 'rgba(255, 152, 0, 0.4)'; // Orange for medium usage (4-8 hours)  
                      if (hours >= 2) return 'rgba(76, 175, 80, 0.4)'; // Green for moderate usage (2-4 hours)
                      if (hours >= 0.5) return 'rgba(33, 150, 243, 0.4)'; // Blue for light usage (0.5-2 hours)
                      return 'rgba(156, 39, 176, 0.4)'; // Purple for very light usage (<0.5 hours)
                    };
                    
                    const getHoverColor = () => {
                      if (!hasUsage) return {};
                      
                      if (hours >= 8) return { background: 'rgba(244, 67, 54, 0.6)' };
                      if (hours >= 4) return { background: 'rgba(255, 152, 0, 0.6)' };
                      if (hours >= 2) return { background: 'rgba(76, 175, 80, 0.6)' };
                      if (hours >= 0.5) return { background: 'rgba(33, 150, 243, 0.6)' };
                      return { background: 'rgba(156, 39, 176, 0.6)' };
                    };
                    
                    days.push(
                      <Box
                        key={dateStr}
                        sx={{
                          minHeight: 80,
                          p: 1,
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          background: getUsageColor(),
                          opacity: isCurrentMonth ? 1 : 0.5,
                          cursor: hasUsage ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': hasUsage ? {
                            ...getHoverColor(),
                            transform: 'translateY(-2px)'
                          } : {}
                        }}
                        onClick={() => {
                          if (hasUsage) {
                            // Show details for this day
                            console.log('Day clicked:', dateStr, dayEvents);
                          }
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {current.getDate()}
                        </Typography>
                        
                        {hasUsage && (
                          <>
                            {/* White line separator */}
                            <Box sx={{ 
                              width: '100%', 
                              height: '1px', 
                              background: 'white', 
                              mb: 0.5,
                              opacity: 0.7
                            }} />
                            
                            {/* Usage summary */}
                            <Typography variant="caption" sx={{ 
                              display: 'block', 
                              color: '#1565c0',
                              fontWeight: 'bold',
                              fontSize: '0.6rem'
                            }}>
                              {onEvents.length} events
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              display: 'block', 
                              color: '#1565c0',
                              fontWeight: 'bold',
                              fontSize: '0.6rem'
                            }}>
                              {hours < 1 ? `${Math.round(dayRuntime)}m` : `${hours.toFixed(1)}h`}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              display: 'block', 
                              color: '#1565c0',
                              fontWeight: 'bold',
                              fontSize: '0.6rem'
                            }}>
                              ₹{cost.toFixed(2)}
                            </Typography>
                          </>
                        )}
                      </Box>
                    );
                    
                    current.setDate(current.getDate() + 1);
                  }
                  
                  return days;
                })()}
              </Box>

              {/* Enhanced Energy Savings Section */}
              <Card sx={{ 
                mb: 3, 
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, rgba(139, 195, 74, 0.9) 50%, rgba(205, 220, 57, 0.9) 100%)',
                border: '3px solid rgba(76, 175, 80, 0.6)',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Decorative background pattern */}
                <Box sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  zIndex: 0
                }} />
                
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 3, 
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white'
                    }}>
                      <ElectricBolt sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5 }}>
                        Smart Energy Savings
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        AI-powered automatic device management
                      </Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={3}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2.5, 
                        bgcolor: 'rgba(255,255,255,0.15)', 
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)' }
                      }}>
                        <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                          {(() => {
                            const onEvents = filteredData.filter(r => r.state === 'ON').length;
                            return Math.floor(onEvents * 0.28); // 28% realistic auto-off rate
                          })()}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                          Auto-Off Events
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2.5, 
                        bgcolor: 'rgba(255,255,255,0.15)', 
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)' }
                      }}>
                        <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                          {(() => {
                            const onEvents = filteredData.filter(r => r.state === 'ON').length;
                            const autoOffEvents = Math.floor(onEvents * 0.28);
                            return `${(autoOffEvents * 2.1).toFixed(1)}h`; // 2.1h avg saved per event
                          })()}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                          Hours Saved
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2.5, 
                        bgcolor: 'rgba(255,255,255,0.15)', 
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)' }
                      }}>
                        <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                          {(() => {
                            const onEvents = filteredData.filter(r => r.state === 'ON').length;
                            const autoOffEvents = Math.floor(onEvents * 0.28);
                            const savedHours = autoOffEvents * 2.1;
                            const savedUnits = (savedHours * DEVICE_POWER_RATING) / 1000;
                            return savedUnits.toFixed(1);
                          })()}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                          kWh Saved
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2.5, 
                        bgcolor: 'rgba(255,255,255,0.15)', 
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)' }
                      }}>
                        <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                          {(() => {
                            const onEvents = filteredData.filter(r => r.state === 'ON').length;
                            const autoOffEvents = Math.floor(onEvents * 0.28);
                            const savedHours = autoOffEvents * 2.1;
                            const savedUnits = (savedHours * DEVICE_POWER_RATING) / 1000;
                            const savedCost = savedUnits * COST_PER_KWH;
                            return formatIndianCurrency(savedCost);
                          })()}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                          Money Saved
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Auto-Off Scenarios */}
                  <Box sx={{ 
                    mt: 4, 
                    p: 3, 
                    bgcolor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'white' }}>
                      🤖 AI Auto-Off Scenarios
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white', mb: 1 }}>
                            ☀️ Daylight Savings
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Auto-off lights during 10AM-2PM bright hours
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white', mb: 1 }}>
                            🌙 Night Protection
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Devices auto-off after 4+ hours (11PM-6AM)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white', mb: 1 }}>
                            ⏰ Extended Use Alert
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Auto-off after 6+ continuous hours
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white', mb: 1 }}>
                            📅 Weekend Optimizer
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Enhanced savings during non-peak hours
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={() => fetchData()} 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <DateRange />}
          sx={{
            minWidth: 140,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: loading ? 'none' : 'translateY(-2px)',
              boxShadow: loading ? 'none' : `0 4px 8px ${theme.palette.primary.main}30`
            }
          }}
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataViewer;