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
  TrendingUp
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { config } from '../config';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

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
      const { data: historyData, error: historyError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (historyError) {
        throw new Error(historyError.message);
      }

      setData(historyData || []);
      setFilteredData(historyData || []);
      calculateMonthlyBills(historyData || []);
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
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
                      <Typography variant="h4" color="primary">{filteredData.length}</Typography>
                      <Typography variant="body2">Total Records</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {filteredData.filter(r => r.state === 'ON').length}
                      </Typography>
                      <Typography variant="body2">ON Events</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
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
                        })()}
                      </Typography>
                      <Typography variant="body2">Total Runtime</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
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
                      </Typography>
                      <Typography variant="body2">Estimated Cost</Typography>
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
                    {filteredData.map((record, index) => {
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
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => fetchData()} disabled={loading}>
          Refresh Data
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataViewer;