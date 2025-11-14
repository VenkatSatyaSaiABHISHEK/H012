import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Button,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  DonutLarge,
  Timeline,
  Analytics,
  Refresh,
  Devices,
  PowerSettingsNew,
  Schedule,
  Speed,
  Add,
  DataUsage
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../config/supabase';
import { addSampleDataToDatabase } from '../utils/sampleData';
import { useDemoMode } from '../context/DemoModeContext';
import { fakeDataService } from '../utils/fakeDataService';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  BarChart, 
  Bar,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#9C27B0', '#E91E63', '#FF5722'];

interface EventData {
  id: number;
  device_id: string;
  event_type: string;
  value: string;
  created_at: string;
  ts?: string;
}

interface ChartData {
  time: string;
  value: number;
  device: string;
  event: string;
}

interface GraphsPageProps {
  toggleTheme?: () => void;
}

export const GraphsPage: React.FC<GraphsPageProps> = ({ toggleTheme }) => {
  const theme = useTheme();
  const { isDemoMode } = useDemoMode();
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [devices, setDevices] = useState<string[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [showSampleData, setShowSampleData] = useState(false);
  const [addingData, setAddingData] = useState(false);

  // Add sample data to database
  const addRealSampleData = async () => {
    try {
      setAddingData(true);
      const result = await addSampleDataToDatabase();
      
      if (result.success) {
        alert(`✅ Success! Added ${result.eventsAdded} sample events to your database. Refreshing data...`);
        await fetchData(); // Refresh data
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Failed to add sample data: ${error.message}`);
    } finally {
      setAddingData(false);
    }
  };

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const sampleDevices = ['ESP32_Living_Room', 'ESP32_Kitchen', 'ESP32_Bedroom', 'ESP32_Office'];
    const sampleEvents: EventData[] = [];
    const now = new Date();
    
    sampleDevices.forEach((device, deviceIndex) => {
      for (let i = 0; i < 50; i++) {
        const eventTime = new Date(now.getTime() - (i * 30 * 60 * 1000)); // Every 30 minutes
        const isOn = Math.random() > 0.5;
        
        sampleEvents.push({
          id: deviceIndex * 50 + i,
          device_id: device,
          event_type: 'switch',
          value: isOn ? 'ON' : 'OFF',
          created_at: eventTime.toISOString()
        });
      }
    });
    
    setEvents(sampleEvents);
    setDevices(sampleDevices);
    setShowSampleData(true);
    setLoading(false);
    setError(null);
  };

  // Fetch device events from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let eventData: EventData[] = [];

      if (isDemoMode) {
        // Use fake data in demo mode
        const now = new Date();
        const timeLimit = new Date();
        switch (timeRange) {
          case '1h':
            timeLimit.setHours(now.getHours() - 1);
            break;
          case '24h':
            timeLimit.setDate(now.getDate() - 1);
            break;
          case '7d':
            timeLimit.setDate(now.getDate() - 7);
            break;
          case '30d':
            timeLimit.setDate(now.getDate() - 30);
            break;
        }

        // Get fake historical events
        const fakeEvents = fakeDataService.getAllHistoricalEvents();
        eventData = fakeEvents
          .filter(event => {
            const eventDate = new Date(event.created_at);
            return eventDate >= timeLimit && eventDate <= now;
          })
          .map((event, index) => ({
            id: index,
            device_id: event.device_id,
            event_type: event.state,
            value: event.state,
            created_at: event.created_at,
            ts: event.created_at
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 1000);
      } else {
        // Calculate time range for real data
        const now = new Date();
        const timeLimit = new Date();
        switch (timeRange) {
          case '1h':
            timeLimit.setHours(now.getHours() - 1);
            break;
          case '24h':
            timeLimit.setDate(now.getDate() - 1);
            break;
          case '7d':
            timeLimit.setDate(now.getDate() - 7);
            break;
          case '30d':
            timeLimit.setDate(now.getDate() - 30);
            break;
        }

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('created_at', timeLimit.toISOString())
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        eventData = data || [];
      }

      setEvents(eventData);

      // Extract unique device IDs
      const deviceSet = new Set(eventData.map(e => e.device_id));
      const uniqueDevices = Array.from(deviceSet).filter(Boolean);
      setDevices(uniqueDevices);

      // Set default device if none selected
      if (selectedDevice === 'all' && uniqueDevices.length > 0) {
        // Keep 'all' selected by default
      }

    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError(err.message || 'Failed to fetch data');
      
      // If real data fails, offer sample data
      if (events.length === 0) {
        setError(err.message + ' - Click "Load Sample Data" to see demo visualization');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Process data for charts
  const chartData = React.useMemo((): ChartData[] => {
    const filteredEvents = selectedDevice === 'all' 
      ? events 
      : events.filter(e => e.device_id === selectedDevice);

    return filteredEvents
      .map(event => ({
        time: new Date(event.created_at || event.ts || Date.now()).toLocaleTimeString(),
        value: parseFloat(event.value) || (event.value === 'ON' ? 1 : 0),
        device: event.device_id,
        event: event.event_type
      }))
      .reverse();
  }, [events, selectedDevice]);

  const deviceStats = React.useMemo(() => {
    const stats: Record<string, { on: number; off: number; total: number }> = {};
    
    events.forEach(event => {
      if (!stats[event.device_id]) {
        stats[event.device_id] = { on: 0, off: 0, total: 0 };
      }
      stats[event.device_id].total++;
      if (event.value === 'ON' || event.value === '1') {
        stats[event.device_id].on++;
      } else {
        stats[event.device_id].off++;
      }
    });

    return Object.entries(stats).map(([device, data]) => ({
      name: device,
      on: data.on,
      off: data.off,
      total: data.total,
      onPercentage: Math.round((data.on / data.total) * 100) || 0
    }));
  }, [events]);

  const pieData = React.useMemo(() => {
    if (selectedDevice === 'all') {
      return deviceStats.map((device, index) => ({
        name: device.name,
        value: device.total,
        fill: COLORS[index % COLORS.length]
      }));
    } else {
      const deviceData = deviceStats.find(d => d.name === selectedDevice);
      if (!deviceData) return [];
      return [
        { name: 'ON', value: deviceData.on, fill: '#00C49F' },
        { name: 'OFF', value: deviceData.off, fill: '#FF8042' }
      ];
    }
  }, [deviceStats, selectedDevice]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Card sx={{ p: 4, minWidth: 300, textAlign: 'center' }}>
          <Analytics sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>Loading Analytics...</Typography>
          <LinearProgress />
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pb: 4
    }}>
      {/* Header */}
      <Paper sx={{ 
        background: theme.palette.mode === 'dark' 
          ? 'rgba(26,26,26,0.95)' 
          : 'rgba(255,255,255,0.95)', 
        backdropFilter: 'blur(10px)',
        borderRadius: 0,
        borderBottom: theme.palette.mode === 'dark' 
          ? '1px solid rgba(255,255,255,0.1)' 
          : '1px solid rgba(255,255,255,0.2)'
      }}>
        <Container maxWidth="xl">
          <Box py={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ 
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  width: 56,
                  height: 56
                }}>
                  <Analytics />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="text.primary">
                    📊 Graphs & Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Real-time device data visualization • {events.length} events loaded
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" gap={2} alignItems="center">
                {/* Demo Mode Indicator */}
                {isDemoMode && (
                  <Chip 
                    label="Demo Mode" 
                    color="info" 
                    size="small"
                    sx={{ 
                      background: 'linear-gradient(45deg, #00E5FF, #00B2CC)',
                      color: 'white'
                    }}
                  />
                )}
                
                {/* Data Control Buttons */}
                {!isDemoMode && events.length === 0 && !loading && (
                  <>
                    <Button 
                      onClick={generateSampleData} 
                      size="small" 
                      startIcon={<DataUsage />}
                      variant="outlined"
                      color="info"
                    >
                      Demo Data
                    </Button>
                    <Button 
                      onClick={addRealSampleData} 
                      size="small" 
                      startIcon={<Add />}
                      disabled={addingData}
                      variant="contained"
                      color="success"
                    >
                      {addingData ? 'Adding...' : 'Add Real Sample Data'}
                    </Button>
                  </>
                )}
                
                <IconButton onClick={fetchData} color="primary" title="Refresh Data">
                  <Refresh />
                </IconButton>
                {toggleTheme && (
                  <IconButton onClick={toggleTheme} color="primary" title="Toggle Theme">
                    {theme.palette.mode === 'dark' ? '☀️' : '🌙'}
                  </IconButton>
                )}
                <Button 
                  startIcon={<ArrowBack />}
                  variant="contained"
                  href="/"
                  sx={{
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(45deg, #00E5FF, #00B2CC)'
                      : 'linear-gradient(45deg, #667eea, #764ba2)',
                    color: 'white',
                    '&:hover': {
                      background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(45deg, #00B2CC, #0097A7)'
                        : 'linear-gradient(45deg, #5a67d8, #6b46c1)',
                    }
                  }}
                >
                  Back to Dashboard
                </Button>
              </Box>
            </Box>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {/* Info Bar - matching the screenshot */}
        {!isDemoMode && events.length === 0 && !loading && !error && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              background: theme.palette.mode === 'dark' 
                ? 'rgba(3, 165, 251, 0.1)' 
                : 'rgba(3, 165, 251, 0.1)',
              borderLeft: '4px solid #03A5FB'
            }}
            action={
              <Box display="flex" gap={1}>
                <Button 
                  onClick={generateSampleData} 
                  size="small" 
                  startIcon={<DataUsage />}
                  variant="outlined"
                  color="info"
                >
                  Demo Data
                </Button>
                <Button 
                  onClick={addRealSampleData} 
                  size="small" 
                  startIcon={<Add />}
                  disabled={addingData}
                  variant="contained"
                  color="success"
                >
                  {addingData ? 'Adding...' : 'Add Real Sample Data'}
                </Button>
              </Box>
            }
          >
            No device data found. Try: <strong>Demo Data</strong> (temporary) or <strong>Add Real Sample Data</strong> (permanent to database).
          </Alert>
        )}

        {error && (
          <Alert 
            severity={showSampleData ? "info" : "error"} 
            sx={{ mb: 3 }}
            action={
              <Box display="flex" gap={1}>
                <Button onClick={fetchData} size="small">Retry</Button>
                {!showSampleData && (
                  <Button onClick={generateSampleData} size="small" startIcon={<Add />}>
                    Load Sample Data
                  </Button>
                )}
              </Box>
            }
          >
            {showSampleData ? "📊 Showing sample data for demonstration" : error}
          </Alert>
        )}
        
        {events.length === 0 && !loading && !error && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              !isDemoMode && (
                <Box display="flex" gap={1}>
                  <Button 
                    onClick={generateSampleData} 
                    size="small" 
                    startIcon={<DataUsage />}
                  >
                    Demo Data
                  </Button>
                  <Button 
                    onClick={addRealSampleData} 
                    size="small" 
                    startIcon={<Add />}
                    disabled={addingData}
                    variant="contained"
                  >
                    {addingData ? 'Adding...' : 'Add Real Sample Data'}
                  </Button>
                </Box>
              )
            }
          >
            {isDemoMode 
              ? "📊 No data available for the selected time range. Try selecting a different time period." 
              : "📊 No device data found. Try: Demo Data (temporary) or Add Real Sample Data (permanent to database)."
            }
          </Alert>
        )}

        {/* Controls */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel>Device Filter</InputLabel>
                  <Select 
                    value={selectedDevice} 
                    label="Device Filter"
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    startAdornment={<Devices sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value="all">📊 All Devices ({devices.length})</MenuItem>
                    {devices.map(device => (
                      <MenuItem key={device} value={device}>
                        🔌 {device}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel>Time Range</InputLabel>
                  <Select 
                    value={timeRange} 
                    label="Time Range"
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    startAdornment={<Schedule sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value="1h">⏰ Last Hour</MenuItem>
                    <MenuItem value="24h">📅 Last 24 Hours</MenuItem>
                    <MenuItem value="7d">📊 Last 7 Days</MenuItem>
                    <MenuItem value="30d">📈 Last 30 Days</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {events.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Events
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <Speed sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {devices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Devices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Charts */}
        <Grid container spacing={3}>
          {/* Usage Distribution */}
          <Grid item xs={12} lg={6}>
            <Card className="glass-card" sx={{ height: '400px' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <DonutLarge color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    {selectedDevice === 'all' ? 'Device Activity Distribution' : `${selectedDevice} ON/OFF Usage`}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {pieData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'text.secondary'
                  }}>
                    <DonutLarge sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">No data available</Typography>
                    <Typography variant="body2">Try a different time range or device filter</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline Chart */}
          <Grid item xs={12} lg={6}>
            <Card className="glass-card" sx={{ height: '400px' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Timeline color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Activity Timeline
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {chartData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => `Time: ${value}`}
                          formatter={(value, name) => [value, 'Value']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#667eea" 
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'text.secondary'
                  }}>
                    <Timeline sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">No timeline data</Typography>
                    <Typography variant="body2">Events will appear here when devices are active</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Device Statistics */}
          <Grid item xs={12}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Analytics color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Device Performance Summary
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                {deviceStats.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceStats}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="on" name="ON Events" stackId="a" fill="#00C49F" />
                        <Bar dataKey="off" name="OFF Events" stackId="a" fill="#FF8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'text.secondary'
                  }}>
                    <Analytics sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">No device statistics</Typography>
                    <Typography variant="body2">Device activity data will be displayed here</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Device Cards */}
          {deviceStats.map((device, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={device.name}>
              <Card className="glass-card" sx={{
                background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}20, ${COLORS[index % COLORS.length]}10)`,
                border: `1px solid ${COLORS[index % COLORS.length]}40`
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      🔌 {device.name}
                    </Typography>
                    <Chip 
                      label={`${device.onPercentage}% ON`}
                      color={device.onPercentage > 50 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main" fontWeight={700}>
                        {device.on}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ON Events
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main" fontWeight={700}>
                        {device.off}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        OFF Events
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main" fontWeight={700}>
                        {device.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total
                      </Typography>
                    </Box>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={device.onPercentage} 
                    sx={{ 
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})`
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Box mt={4} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            📊 Analytics powered by Supabase • Last updated: {new Date().toLocaleString()} • {events.length} events processed
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default GraphsPage;
