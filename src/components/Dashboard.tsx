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
  Avatar
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
  CurrencyRupee
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
import useDevices from '../hooks/useDevices';
import { Link as RouterLink } from 'react-router-dom';

interface DashboardProps {
  toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ toggleTheme }) => {
  const theme = useTheme();
  const { devices: polledDevices, loading: devicesLoading, connectedCount, refresh, error } = useDevices(8000);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [setupGuideOpen, setSetupGuideOpen] = React.useState(false);
  const [dataViewerOpen, setDataViewerOpen] = React.useState(false);
  const [deviceManagerOpen, setDeviceManagerOpen] = React.useState(false);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
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

  // Calculate total runtime for today across all devices
  const calculateTotalRuntimeToday = (): string => {
    // This would normally come from your device usage data
    // For now, simulate based on active devices
    const estimatedHours = activeDevices * 2.5; // Assume 2.5 hours average per active device
    return estimatedHours.toFixed(1);
  };

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
              <StatCard 
                title="Today's Runtime" 
                value={`${calculateTotalRuntimeToday()}h`} 
                subtitle="Total usage time today"
                icon={<AccessTime />}
                color="success"
              />
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
                value={`$${(totalPowerConsumption * 0.15 / 1000 * parseFloat(calculateTotalRuntimeToday())).toFixed(2)}`} 
                subtitle="Estimated electricity cost"
                icon={<TrendingUp />}
                color="info"
              />
            </Grid>
          </Grid>

          {/* System Status Overview - Always show the service cards */}
          {!showDiagnostics && (
            <SystemStatusOverview onShowDiagnostics={() => setShowDiagnostics(true)} />
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
      </Container>
    </Box>
  );
};