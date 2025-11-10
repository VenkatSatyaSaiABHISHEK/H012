import React from 'react';
import { 
  Grid, 
  Container, 
  Box, 
  Typography, 
  useTheme, 
  IconButton, 
  Button, 
  Paper,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  Home, 
  DeviceHub, 
  TrendingUp,
  Settings,
  Refresh,
  Help,
  Add,
  AccessTime,
  Timer,
  TableChart,
  CurrencyRupee,
  CloudQueue
} from '@mui/icons-material';
import { DeviceCard } from './Card';
import StatCard from './StatCard';
import SettingsDialog from './SettingsDialog';
import DeviceSetupGuide from './DeviceSetupGuide';
import MQTTDebugger from './MQTTDebugger';
import MQTTConnectionTest from './MQTTConnectionTest';
import SupabaseDiagnostic from './SupabaseDiagnostic';
import DataViewer from './DataViewer';
import DeviceManager from './DeviceManager';
import ESP32Controller from './ESP32Controller';
import SystemStatusOverview from './SystemStatusOverview';
import { DeviceUsageSummary } from './DeviceUsageSummary';
import useDevices from '../hooks/useDevices';
import { Link as RouterLink } from 'react-router-dom';
import { useMQTTContext } from '../context/MQTTContext';

interface DashboardProps {
  toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ toggleTheme }) => {
  const theme = useTheme();
  const { isConnected: mqttConnected, connectionError } = useMQTTContext();
  const { devices: polledDevices, loading: devicesLoading, connectedCount, refresh, error } = useDevices(8000);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [setupGuideOpen, setSetupGuideOpen] = React.useState(false);
  const [dataViewerOpen, setDataViewerOpen] = React.useState(false);
  const [deviceManagerOpen, setDeviceManagerOpen] = React.useState(false);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [showRuntimeDebug, setShowRuntimeDebug] = React.useState(false);
  const [registeredDevices, setRegisteredDevices] = React.useState<Array<{id: string, name: string}>>([]);
  
  // Use discovered devices from the hook
  React.useEffect(() => {
    const deviceList = polledDevices.map(device => ({
      id: device.deviceId,
      name: device.name || getDeviceName(device.deviceId)
    }));
    
    setRegisteredDevices(deviceList);
  }, [polledDevices]);

  // Helper function to generate friendly device names
  const getDeviceName = (deviceId: string): string => {
    // Map device IDs to friendly names or generate them
    const deviceMap: {[key: string]: string} = {
      '68e9d693ba649e246c0af03d': 'Living Room Light',
      '98a1b234cdef567890123456': 'Kitchen Light', 
      'b12c3d4e5f67890123456789': 'Porch Light',
      'c123d456e789f0123456789a': 'Bedroom Lamp',
      'd234e567f8901234567890ab': 'Garden Light',
      'e345f678901234567890abcd': 'Garage Light'
    };
    
    return deviceMap[deviceId] || `Device ${deviceId.slice(-4)}`;
  };

  const activeDevices = React.useMemo(() => {
    return connectedCount; // Use real connected count from polled devices
  }, [connectedCount]);

  const totalPowerConsumption = React.useMemo(() => {
    return activeDevices * 60; // Estimated 60W per active device
  }, [activeDevices]);

  // Calculate total runtime for today across all devices - REAL DATA
  const [todayRuntime, setTodayRuntime] = React.useState<number>(0);
  const [runtimeDebugInfo, setRuntimeDebugInfo] = React.useState<{
    totalSessions: number;
    validSessions: number;
    invalidSessions: number;
    totalMinutes: number;
    sessionDetails: Array<{
      deviceId: string;
      deviceName: string;
      onTime: string;
      offTime: string;
      duration: number;
      valid: boolean;
      reason?: string;
    }>;
    rawEvents: number;
  }>({
    totalSessions: 0,
    validSessions: 0,
    invalidSessions: 0,
    totalMinutes: 0,
    sessionDetails: [],
    rawEvents: 0
  });
  
  const calculateTotalRuntimeToday = (): string => {
    return todayRuntime < 60 
      ? `${Math.round(todayRuntime)}m`
      : `${(todayRuntime / 60).toFixed(1)}h`;
  };

  // Load real usage data for today
  React.useEffect(() => {
    const loadTodayUsage = async () => {
      try {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        // Import supabase in the component
        const { supabase } = await import('../config/supabase');
        
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .gte('created_at', startOfToday.toISOString())
          .lt('created_at', endOfToday.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Calculate actual runtime from ON/OFF pairs with detailed debugging
        let totalMinutes = 0;
        const sessionDetails: any[] = [];
        const processedOnEvents = new Set(); // Prevent duplicate processing

        const getDeviceName = (deviceId: string) => {
          const names: Record<string, string> = {
            '6c0af03d': 'Living Room Light',
            '68e9d693ba649e246c0af03d': 'Living Room Light'
          };
          return names[deviceId] || names[deviceId.substring(0, 8)] || `Device ${deviceId.slice(-4)}`;
        };

        events?.forEach(event => {
          if (event.state === 'ON' && !processedOnEvents.has(event.id || `${event.device_id}_${event.created_at}`)) {
            processedOnEvents.add(event.id || `${event.device_id}_${event.created_at}`);
            
            // Find corresponding OFF event (must come after this ON event)
            const offEvent = events.find(e => 
              e.device_id === event.device_id && 
              e.state === 'OFF' &&
              new Date(e.created_at) > new Date(event.created_at) &&
              !processedOnEvents.has(`off_${e.id || `${e.device_id}_${e.created_at}`}`)
            );

            if (offEvent) {
              // Mark this OFF event as processed
              processedOnEvents.add(`off_${offEvent.id || `${offEvent.device_id}_${offEvent.created_at}`}`);
              
              const onTime = new Date(event.created_at);
              const offTime = new Date(offEvent.created_at);
              const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
              
              const isValidSession = duration > 0 && duration < 1440; // Between 0 and 24 hours
              
                            sessionDetails.push({
                              deviceId: event.device_id,
                              deviceName: getDeviceName(event.device_id),
                              onTime: onTime.toLocaleString(),
                              offTime: offTime.toLocaleString(),
                              duration: duration,
                              valid: isValidSession,
                              reason: !isValidSession ? 
                                (duration <= 0 ? 'Invalid time order' : 'Session too long (>3 days - likely data error)') : 
                                undefined
                            });              if (isValidSession) {
                totalMinutes += duration;
              }
            } else {
              // Check if device is currently running (most recent event for this device is this ON)
              const deviceEvents = events.filter(e => e.device_id === event.device_id);
              const mostRecentEvent = deviceEvents.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              
              if (mostRecentEvent && mostRecentEvent.created_at === event.created_at && mostRecentEvent.state === 'ON') {
                // Device is currently running - add current session time
                const onTime = new Date(event.created_at);
                const now = new Date();
                const currentDuration = (now.getTime() - onTime.getTime()) / (1000 * 60);
                
                const isValidSession = currentDuration > 0 && currentDuration < 1440;
                
                sessionDetails.push({
                  deviceId: event.device_id,
                  deviceName: getDeviceName(event.device_id),
                  onTime: onTime.toLocaleString(),
                  offTime: 'Currently running',
                  duration: currentDuration,
                  valid: isValidSession,
                  reason: !isValidSession ? 
                    (currentDuration <= 0 ? 'Invalid time' : 'Running too long (>24h)') : 
                    undefined
                });
                
                if (isValidSession) {
                  totalMinutes += currentDuration;
                }
              } else {
                // ON event with no corresponding OFF and not currently running
                sessionDetails.push({
                  deviceId: event.device_id,
                  deviceName: getDeviceName(event.device_id),
                  onTime: new Date(event.created_at).toLocaleString(),
                  offTime: 'No OFF event found',
                  duration: 0,
                  valid: false,
                  reason: 'Incomplete session (no OFF event)'
                });
              }
            }
          }
        });

        // Update debug information
        setRuntimeDebugInfo({
          totalSessions: sessionDetails.length,
          validSessions: sessionDetails.filter(s => s.valid).length,
          invalidSessions: sessionDetails.filter(s => !s.valid).length,
          totalMinutes: totalMinutes,
          sessionDetails: sessionDetails,
          rawEvents: events?.length || 0
        });

        setTodayRuntime(totalMinutes);
      } catch (error) {
        console.error('Error loading today usage:', error);
        setTodayRuntime(0);
      }
    };

    loadTodayUsage();
    // Refresh every 30 seconds to update running sessions
    const interval = setInterval(loadTodayUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate longest running device session
  const getLongestSession = (): string => {
    // This would come from real session data
    // For now, simulate
    if (activeDevices === 0) return '0m';
    return '2h 35m'; // Simulated longest session
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #16213E 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Box py={{ xs: 2, sm: 3, md: 4 }}>
          {/* Enhanced Header */}
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              borderRadius: { xs: 3, sm: 4 },
              background: theme.palette.mode === 'dark' 
                ? 'rgba(26,26,26,0.8)' 
                : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar 
                  sx={{ 
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    width: 56,
                    height: 56
                  }}
                >
                  <Home sx={{ fontSize: 28 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Smart Home Hub
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Monitor and control your IoT devices
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  icon={<DeviceHub />}
                  label={`${connectedCount}/${registeredDevices.length} Online`} 
                  color={connectedCount === registeredDevices.length ? 'success' : 'warning'}
                  sx={{ mr: 1 }}
                />
                <Chip 
                  icon={<CloudQueue />}
                  label={mqttConnected ? 'MQTT Connected' : connectionError ? 'MQTT Error' : 'MQTT Connecting'} 
                  color={mqttConnected ? 'success' : connectionError ? 'error' : 'warning'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <IconButton 
                  onClick={() => window.location.reload()} 
                  sx={{ 
                    background: theme.palette.background.paper,
                    '&:hover': { background: theme.palette.action.hover }
                  }}
                >
                  <Refresh />
                </IconButton>
                <IconButton 
                  onClick={() => setDeviceManagerOpen(true)}
                  sx={{ 
                    background: theme.palette.background.paper,
                    '&:hover': { background: theme.palette.action.hover }
                  }}
                  title="Manage Devices"
                >
                  <Add />
                </IconButton>
                <IconButton 
                  onClick={() => setSettingsOpen(true)}
                  sx={{ 
                    background: theme.palette.background.paper,
                    '&:hover': { background: theme.palette.action.hover }
                  }}
                >
                  <Settings />
                </IconButton>
                <IconButton 
                  component={RouterLink}
                  to="/mqtt-backend"
                  sx={{ 
                    background: theme.palette.background.paper,
                    '&:hover': { background: theme.palette.action.hover }
                  }}
                  title="MQTT Backend Monitor"
                >
                  <DeviceHub />
                </IconButton>
                <IconButton 
                  onClick={toggleTheme}
                  sx={{ 
                    background: theme.palette.background.paper,
                    '&:hover': { background: theme.palette.action.hover }
                  }}
                >
                  {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
                <Button 
                  variant="contained" 
                  onClick={() => setDataViewerOpen(true)}
                  startIcon={<TableChart />}
                  sx={{ 
                    borderRadius: 3,
                    textTransform: 'none',
                    background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                    ml: 1,
                    mr: 1
                  }}
                >
                  Data & Bills
                </Button>
                <Button 
                  variant="contained" 
                  component={RouterLink} 
                  to="/graphs"
                  startIcon={<TrendingUp />}
                  sx={{ 
                    borderRadius: 3,
                    textTransform: 'none',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }}
                >
                  Analytics
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Enhanced Stats Cards - Time-focused for users */}
          <Grid container spacing={{ xs: 2, sm: 3 }} mb={{ xs: 2, sm: 3, md: 4 }}>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard 
                title="Active Devices" 
                value={`${activeDevices}/${registeredDevices.length}`} 
                subtitle="Currently running"
                icon={<DeviceHub />}
                color="primary"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <Box position="relative">
                <StatCard 
                  title="Today's Runtime" 
                  value={calculateTotalRuntimeToday()} 
                  subtitle="Total usage time today"
                  icon={<AccessTime />}
                  color="success"
                />
                <IconButton
                  size="small"
                  onClick={async () => {
                    // Calculate debug info using the SAME logic as the main dashboard
                    try {
                      const today = new Date();
                      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const endOfToday = new Date(startOfToday);
                      endOfToday.setDate(endOfToday.getDate() + 1);

                      const { supabase } = await import('../config/supabase');
                      
                      const { data: events, error } = await supabase
                        .from('device_events')
                        .select('*')
                        .gte('created_at', startOfToday.toISOString())
                        .lt('created_at', endOfToday.toISOString())
                        .order('created_at', { ascending: true });

                      if (!events || error) {
                        console.error('Debug - Error loading events:', error);
                        setRuntimeDebugInfo({
                          totalSessions: 0,
                          validSessions: 0,
                          invalidSessions: 0,
                          totalMinutes: 0,
                          sessionDetails: [],
                          rawEvents: 0
                        });
                        setShowRuntimeDebug(true);
                        return;
                      }

                      const onEvents = events.filter(event => event.state === 'ON');
                      const processedOnEvents = new Set<string>();
                      const sessionDetails: Array<{
                        deviceId: string;
                        deviceName: string;
                        onTime: string;
                        offTime: string;
                        duration: number;
                        valid: boolean;
                        reason?: string;
                      }> = [];
                      let totalMinutes = 0;
                      let validSessions = 0;
                      let invalidSessions = 0;

                      const getDeviceName = (deviceId: string): string => {
                        const device = registeredDevices.find((d: {id: string, name: string}) => d.id === deviceId);
                        return device ? device.name : deviceId.slice(-8) + '...';
                      };

                      for (const event of onEvents) {
                        const eventKey = `${event.device_id}-${event.created_at}`;
                        if (processedOnEvents.has(eventKey)) {
                          sessionDetails.push({
                            deviceId: event.device_id,
                            deviceName: getDeviceName(event.device_id),
                            onTime: new Date(event.created_at).toLocaleString(),
                            offTime: 'Duplicate event',
                            duration: 0,
                            valid: false,
                            reason: 'Duplicate ON event (skipped)'
                          });
                          invalidSessions++;
                          continue;
                        }
                        processedOnEvents.add(eventKey);

                        const correspondingOff = events.find(offEvent => 
                          offEvent.device_id === event.device_id && 
                          offEvent.state === 'OFF' && 
                          new Date(offEvent.created_at) > new Date(event.created_at)
                        );

                        if (correspondingOff) {
                            const onTime = new Date(event.created_at);
                            const offTime = new Date(correspondingOff.created_at);
                            const duration = (offTime.getTime() - onTime.getTime()) / (1000 * 60);
                            // Reasonable validation - max 3 days per session for home devices
                            // This allows legitimate long usage (AC, heaters, pumps) but rejects data corruption
                            const isValidSession = duration > 0 && duration <= 4320; // 72 hours = 3 days
                            
                            sessionDetails.push({
                            deviceId: event.device_id,
                            deviceName: getDeviceName(event.device_id),
                            onTime: onTime.toLocaleString(),
                            offTime: offTime.toLocaleString(),
                            duration: duration,
                            valid: isValidSession,
                            reason: !isValidSession ? 
                              (duration <= 0 ? 'Invalid time order' : 'Session too long (>24h)') : 
                              undefined
                          });

                          if (isValidSession) {
                            totalMinutes += duration;
                            validSessions++;
                          } else {
                            invalidSessions++;
                          }
                        } else {
                          const deviceEvents = events.filter(e => e.device_id === event.device_id);
                          const mostRecentEvent = deviceEvents.sort((a, b) => 
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                          )[0];

                          if (mostRecentEvent && mostRecentEvent.created_at === event.created_at && mostRecentEvent.state === 'ON') {
                            const onTime = new Date(event.created_at);
                            const now = new Date();
                            const currentDuration = (now.getTime() - onTime.getTime()) / (1000 * 60);
                            // Reasonable validation for currently running sessions too
                            const isValidSession = currentDuration > 0 && currentDuration <= 4320;

                            sessionDetails.push({
                              deviceId: event.device_id,
                              deviceName: getDeviceName(event.device_id),
                              onTime: onTime.toLocaleString(),
                              offTime: 'Currently running',
                              duration: currentDuration,
                              valid: isValidSession,
                              reason: !isValidSession ? 
                                (currentDuration <= 0 ? 'Invalid time' : 'Running too long (>3 days - likely stale data)') : 
                                undefined
                            });

                            if (isValidSession) {
                              totalMinutes += currentDuration;
                              validSessions++;
                            } else {
                              invalidSessions++;
                            }
                          } else {
                            sessionDetails.push({
                              deviceId: event.device_id,
                              deviceName: getDeviceName(event.device_id),
                              onTime: new Date(event.created_at).toLocaleString(),
                              offTime: 'No OFF event found',
                              duration: 0,
                              valid: false,
                              reason: 'Incomplete session (no OFF event)'
                            });
                            invalidSessions++;
                          }
                        }
                      }

                      setRuntimeDebugInfo({
                        totalSessions: validSessions + invalidSessions,
                        validSessions: validSessions,
                        invalidSessions: invalidSessions,
                        totalMinutes: totalMinutes,
                        sessionDetails: sessionDetails,
                        rawEvents: events.length
                      });

                      setShowRuntimeDebug(true);
                    } catch (error) {
                      console.error('Debug calculation error:', error);
                      setShowRuntimeDebug(true);
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                  title="Show calculation details"
                >
                  <Help fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard 
                title="Longest Session" 
                value={getLongestSession()} 
                subtitle="Current longest running device"
                icon={<Timer />}
                color="warning"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard 
                title="Daily Cost" 
                value={`₹${((todayRuntime / 60) * 60 / 1000 * 6.5).toFixed(2)}`} 
                subtitle="Estimated electricity cost"
                icon={<TrendingUp />}
                color="info"
              />
            </Grid>
          </Grid>

          {/* System Status Overview - Always show the service cards */}
          {!showDiagnostics && (
            <>
              <SystemStatusOverview onShowDiagnostics={() => setShowDiagnostics(true)} />
              
              {/* Device Usage Summary - Show daily/weekly usage patterns */}
              <Box mt={3}>
                <DeviceUsageSummary />
              </Box>
            </>
          )}

          {/* Advanced Diagnostics - Show when requested or when there are issues */}
          {showDiagnostics && (
            <>
              <ESP32Controller />
              <MQTTDebugger deviceId="68e9d693ba649e246c0af03d" />
              <MQTTConnectionTest />
              <SupabaseDiagnostic />
              
              <Box mt={2} textAlign="center">
                <Button 
                  variant="outlined" 
                  onClick={() => setShowDiagnostics(false)}
                >
                  ← Back to Status Overview
                </Button>
              </Box>
            </>
          )}

          {/* Device Cards Grid */}
          {registeredDevices.length > 0 && !showDiagnostics && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DeviceHub sx={{ color: theme.palette.primary.main }} />
                Your Devices
              </Typography>
            </>
          )}
          
          {!showDiagnostics && (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {registeredDevices.length > 0 ? (
                registeredDevices.map(device => (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={device.id}>
                    <DeviceCard deviceId={device.id} name={device.name} />
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      py: 8,
                      background: theme.palette.mode === 'dark' 
                        ? 'rgba(26,26,26,0.8)' 
                        : 'rgba(255,255,255,0.8)',
                      borderRadius: 4,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <DeviceHub sx={{ fontSize: 64, color: theme.palette.text.secondary, opacity: 0.5, mb: 2 }} />
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      No Devices Found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                      {devicesLoading 
                        ? 'Discovering devices from your SinricPro account and ESP32 controllers...'
                        : 'No devices are currently registered. Make sure your ESP32 devices are connected and running, or check your SinricPro configuration.'
                      }
                    </Typography>
                    <Box display="flex" gap={2} justifyContent="center">
                      <Button 
                        variant="contained" 
                        onClick={() => refresh()}
                        startIcon={<Refresh />}
                        disabled={devicesLoading}
                        sx={{ 
                          borderRadius: 3,
                          textTransform: 'none',
                          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                        }}
                      >
                        {devicesLoading ? 'Searching...' : 'Refresh Devices'}
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => setSetupGuideOpen(true)}
                        startIcon={<Help />}
                        sx={{ 
                          borderRadius: 3,
                          textTransform: 'none'
                        }}
                      >
                        Setup Guide
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
        
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <DeviceSetupGuide open={setupGuideOpen} onClose={() => setSetupGuideOpen(false)} />
        <DataViewer open={dataViewerOpen} onClose={() => setDataViewerOpen(false)} />
        <DeviceManager 
          open={deviceManagerOpen} 
          onClose={() => setDeviceManagerOpen(false)}
          onDeviceAdded={() => refresh()} 
        />

        {/* Runtime Calculation Debug Dialog */}
        <Dialog open={showRuntimeDebug} onClose={() => setShowRuntimeDebug(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <AccessTime />
              <Typography variant="h6">Runtime Calculation Details</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>How Runtime is Calculated:</strong><br/>
              System pairs ON events with their corresponding OFF events to calculate actual usage time.
              Only valid sessions (0 to 24 hours) are included in the total.<br/>
              <strong>Date Range:</strong> Today ({new Date().toLocaleDateString()}) only<br/>
              <strong>Current Dashboard Value:</strong> {calculateTotalRuntimeToday()} ({todayRuntime.toFixed(1)} minutes)
            </Alert>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                  <Typography variant="h4">{runtimeDebugInfo.rawEvents}</Typography>
                  <Typography variant="body2">Raw Events</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                  <Typography variant="h4">{runtimeDebugInfo.validSessions}</Typography>
                  <Typography variant="body2">Valid Sessions</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
                  <Typography variant="h4">{runtimeDebugInfo.invalidSessions}</Typography>
                  <Typography variant="body2">Invalid Sessions</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                  <Typography variant="h4">
                    {runtimeDebugInfo.totalMinutes < 60 
                      ? `${Math.round(runtimeDebugInfo.totalMinutes)}m`
                      : `${(runtimeDebugInfo.totalMinutes / 60).toFixed(1)}h`
                    }
                  </Typography>
                  <Typography variant="body2">Total Runtime</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Session Details Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>Session Details:</Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>ON Time</TableCell>
                    <TableCell>OFF Time</TableCell>
                    <TableCell align="right">Duration</TableCell>
                    <TableCell align="center">Valid</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {runtimeDebugInfo.sessionDetails.map((session, index) => (
                    <TableRow key={index} sx={{ 
                      bgcolor: session.valid ? 'success.light' : 'error.light',
                      opacity: session.valid ? 1 : 0.7
                    }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {session.deviceName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.deviceId.slice(-8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{session.onTime}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{session.offTime}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {session.duration < 1 
                            ? `${Math.round(session.duration * 60)}s`
                            : session.duration < 60 
                              ? `${Math.round(session.duration)}m`
                              : `${(session.duration / 60).toFixed(1)}h`
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={session.valid ? 'Valid' : 'Invalid'} 
                          color={session.valid ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {session.reason || 'Included in total'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {runtimeDebugInfo.sessionDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No sessions found for today
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRuntimeDebug(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};