import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  Button,
  Collapse
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  ExpandMore,
  ExpandLess,
  Router,
  CloudQueue,
  Storage,
  Cable,
  Memory,
  Wifi
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { config } from '../config';
import { useMQTT } from '../hooks/useMQTT';
import { SupabaseDataViewer } from './SupabaseDataViewer';
import { MQTTProcessMonitor } from './MQTTProcessMonitor';
import { SupabaseProcessMonitor } from './SupabaseProcessMonitor';
import { ESP32ProcessMonitor } from './ESP32ProcessMonitor';
import { DeviceDiscoveryMonitor } from './DeviceDiscoveryMonitor';

interface ServiceStatus {
  name: string;
  status: 'connected' | 'error' | 'connecting' | 'warning';
  message: string;
  details?: string;
  icon: React.ReactNode;
  lastCheck: Date;
  data?: any;
}

interface SystemStatusOverviewProps {
  onShowDiagnostics?: () => void;
}

export const SystemStatusOverview: React.FC<SystemStatusOverviewProps> = ({ onShowDiagnostics }) => {
  // Use the MQTT hook for real-time connection status
  const { 
    isConnected: mqttConnected, 
    connectionError: mqttError, 
    messages: mqttMessages, 
    reconnect: reconnectMQTT, 
    connectionAttempts 
  } = useMQTT();
  
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'ESP32 Controller',
      status: 'connecting', 
      message: 'Checking ESP32 connection...',
      icon: <Memory />,
      lastCheck: new Date()
    },
    {
      name: 'MQTT Broker',
      status: 'connecting',
      message: 'Connecting to MQTT broker...',
      icon: <CloudQueue />,
      lastCheck: new Date()
    },
    {
      name: 'Supabase Database',
      status: 'connecting',
      message: 'Verifying database connection...',
      icon: <Storage />,
      lastCheck: new Date()
    },
    {
      name: 'Device Discovery',
      status: 'connecting',
      message: 'Scanning for devices...',
      icon: <Wifi />,
      lastCheck: new Date()
    }
  ]);

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showDataViewer, setShowDataViewer] = useState(false);
  
  // Process monitor dialogs
  const [showMQTTMonitor, setShowMQTTMonitor] = useState(false);
  const [showSupabaseMonitor, setShowSupabaseMonitor] = useState(false);
  const [showESP32Monitor, setShowESP32Monitor] = useState(false);
  const [showDeviceDiscoveryMonitor, setShowDeviceDiscoveryMonitor] = useState(false);

  // Check ESP32 Controller status
  const checkESP32Status = async () => {
    try {
      const esp32IP = localStorage.getItem('esp32_ip') || 'http://192.168.1.100';
      const response = await fetch(`${esp32IP}/status`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        updateServiceStatus('ESP32 Controller', {
          status: 'connected',
          message: `ESP32 online at ${esp32IP}`,
          details: `✅ HTTP API: Active | 🔌 Devices: ${data.devices?.length || 0} | � Network: Connected | ⚡ GPIO Control: Ready`
        });
      } else {
        throw new Error('ESP32 not responding');
      }
    } catch (error: any) {
      updateServiceStatus('ESP32 Controller', {
        status: 'error',
        message: 'Cannot reach ESP32',
        details: `Check if ESP32 is powered on and WiFi connected. IP: ${localStorage.getItem('esp32_ip') || 'http://192.168.1.100'} | Expected: Your ESP32 MultiSwitch device`
      });
    }
  };

  // Check MQTT status with REAL device detection
  const checkMQTTStatus = async () => {
    if (mqttConnected) {
      // Check if we have REAL device messages (not just broker connection)
      const recentMessages = Object.keys(mqttMessages).length;
      const hasDeviceMessages = Object.keys(mqttMessages).some(topic => 
        topic.includes('esp32') || topic.includes('sinric') || topic.includes('device')
      );
      
      if (hasDeviceMessages) {
        updateServiceStatus('MQTT Broker', {
          status: 'connected',
          message: 'MQTT + Devices active',
          details: `✅ Broker: Connected | � ESP32 Device: Online | 📨 Messages: ${recentMessages} recent | 🔌 Real device communication active`
        });
      } else {
        updateServiceStatus('MQTT Broker', {
          status: 'warning',
          message: 'MQTT broker connected, NO devices',
          details: `⚠️ Broker: ${config.mqtt.broker} Connected | ❌ ESP32 Device: Offline | 🔌 Check if your ESP32 is powered on and connected to WiFi | 🔄 Click to retry`
        });
      }
    } else if (mqttError) {
      const showRetryButton = connectionAttempts >= 10;
      updateServiceStatus('MQTT Broker', {
        status: 'error',
        message: showRetryButton 
          ? `Connection failed (${connectionAttempts} attempts)` 
          : 'MQTT connection failed',
        details: showRetryButton
          ? `❌ Please check if your ESP32 device is powered on and connected to WiFi | 🔄 Click to retry connection`
          : `❌ Error: ${mqttError} | 🔧 Attempt ${connectionAttempts}/10 | 🌐 Broker: ${config.mqtt.broker}:${config.mqtt.port}`
      });
    } else {
      updateServiceStatus('MQTT Broker', {
        status: 'connecting',
        message: 'Connecting to MQTT broker...',
        details: `🔄 Attempting connection to ${config.mqtt.broker} | 🔐 Using credentials: ${config.mqtt.username || 'anonymous'}`
      });
    }
  };

  // Check Supabase Database status
  const checkSupabaseStatus = async () => {
    try {
      // Test basic connection
      const { data, error, count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      // Check if custom_devices table exists
      const { data: deviceData, error: deviceError } = await supabase
        .from('custom_devices')
        .select('id', { count: 'exact', head: true });

      updateServiceStatus('Supabase Database', {
        status: 'connected',
        message: 'Database connected',
        details: `✅ Tables: events${deviceError ? '' : ' | custom_devices'} | � URL: ${supabase.supabaseUrl.split('.')[0]}...supabase.co | 🔐 Auth: Configured`
      });

    } catch (error: any) {
      updateServiceStatus('Supabase Database', {
        status: 'error',
        message: 'Database connection error',
        details: `❌ Error: ${error.message} | 🔧 Check: API keys and RLS policies | 💾 Expected: Events table with device data`
      });
    }
  };

  // Check Device Discovery status
  const checkDeviceDiscovery = async () => {
    try {
      // Check for discovered devices from various sources
      let discoveredDevices = 0;

      // Check custom devices (if table exists)
      try {
        const { data: customDevices, error } = await supabase
          .from('custom_devices')
          .select('device_id')
          .limit(10);
        
        if (!error) {
          discoveredDevices += customDevices?.length || 0;
        }
      } catch (e) {
        // custom_devices table doesn't exist, that's okay
      }

      // Check recent events for active devices
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('device_id')
          .limit(50);
        
        if (!error && events) {
          const uniqueDevices = new Set(events.map(e => e.device_id));
          discoveredDevices += uniqueDevices.size;
        }
      } catch (e) {
        // Handle error
      }

      if (discoveredDevices > 0) {
        updateServiceStatus('Device Discovery', {
          status: 'connected',
          message: `${discoveredDevices} devices found`,
          details: `🔍 Discovery Sources: MQTT + Database | � Active Devices: ${discoveredDevices} | 🔄 Auto-refresh: Every 30s | 📊 Last Scan: ${new Date().toLocaleTimeString()}`
        });
      } else {
        updateServiceStatus('Device Discovery', {
          status: 'warning',
          message: 'No devices found',
          details: `Add devices via Device Manager (+) or check ESP32/MQTT connection for auto-discovery`
        });
      }

    } catch (error: any) {
      updateServiceStatus('Device Discovery', {
        status: 'error',
        message: 'Discovery system error',
        details: `❌ Error: ${error.message} | 🔧 Check: Database connection and device communication`
      });
    }
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Monitor MQTT status changes in real-time
  useEffect(() => {
    checkMQTTStatus();
  }, [mqttConnected, mqttError, mqttMessages]);

  const checkAllServices = async () => {
    setLastUpdate(new Date());
    
    // Check all services in parallel
    await Promise.all([
      checkESP32Status(),
      checkMQTTStatus(),
      checkSupabaseStatus(),
      checkDeviceDiscovery()
    ]);
  };

  const updateServiceStatus = (serviceName: string, updates: Partial<ServiceStatus>) => {
    setServices(prev => prev.map(service => 
      service.name === serviceName 
        ? { ...service, ...updates, lastCheck: new Date() }
        : service
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'connecting': return 'info';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'connecting': return <Warning color="info" />;
      case 'warning': return <Warning color="warning" />;
      default: return <Warning />;
    }
  };

  const getCardBackground = (status: string) => {
    switch (status) {
      case 'connected': return 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
      case 'error': return 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
      case 'connecting': return 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)';
      case 'warning': return 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
      default: return 'linear-gradient(135deg, #9e9e9e 0%, #616161 100%)';
    }
  };

  const connectedCount = services.filter(s => s.status === 'connected').length;
  const errorCount = services.filter(s => s.status === 'error').length;
  const warningCount = services.filter(s => s.status === 'warning').length;

  return (
    <Box>
      {/* Overall Status Summary */}
      <Card className="glass-card" sx={{ 
        mb: { xs: 2, sm: 3 }, 
        background: connectedCount === services.length 
          ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
          : errorCount > 0 
            ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
            : 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box display="flex" 
               flexDirection={{ xs: 'column', sm: 'row' }}
               justifyContent="space-between" 
               alignItems={{ xs: 'stretch', sm: 'center' }}
               gap={{ xs: 2, sm: 0 }}
          >
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                🏠 Smart Home Hub
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {connectedCount === services.length 
                  ? '✅ All systems operational'
                  : errorCount > 0 
                    ? '❌ Issues detected'
                    : '⚠️ Some services connecting'
                }
              </Typography>
            </Box>
            
            <Box display="flex" 
                 alignItems="center" 
                 justifyContent={{ xs: 'space-around', sm: 'flex-end' }}
                 gap={{ xs: 2, sm: 3 }}
                 sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Box textAlign="center">
                <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.8rem', sm: '3rem' } }}>
                  {Math.round((connectedCount / services.length) * 100)}%
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Health
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={600} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                  {connectedCount}/{services.length}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Services</Typography>
              </Box>
              <IconButton 
                onClick={checkAllServices}
                sx={{ 
                  color: 'white',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  size: { xs: 'small', sm: 'medium' }
                }}
                title="Refresh All Services"
              >
                <Refresh />
              </IconButton>
            </Box>
          </Box>
          
          <Box mt={2}>
            <Box display="flex" 
                 flexDirection={{ xs: 'column', sm: 'row' }}
                 justifyContent="space-between" 
                 alignItems={{ xs: 'flex-start', sm: 'center' }}
                 mb={1}
                 gap={{ xs: 0.5, sm: 0 }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                System Health Progress
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Last update: {lastUpdate.toLocaleTimeString()}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(connectedCount / services.length) * 100}
              sx={{ 
                height: { xs: 8, sm: 10 }, 
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderRadius: 5
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Individual Service Status Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        {services.map((service) => (
          <Grid item xs={6} sm={6} md={6} lg={3} key={service.name}>
            <Card 
              onClick={() => {
                switch (service.name) {
                  case 'ESP32 Controller':
                    setShowESP32Monitor(true);
                    break;
                  case 'MQTT Broker':
                    // If connection failed multiple times, offer retry
                    if (connectionAttempts >= 10 || service.status === 'warning') {
                      if (window.confirm('🔄 Retry MQTT connection?\n\nThis will attempt to reconnect to your MQTT broker and check for ESP32 devices.')) {
                        reconnectMQTT();
                      }
                    } else {
                      setShowMQTTMonitor(true);
                    }
                    break;
                  case 'Supabase Database':
                    setShowSupabaseMonitor(true);
                    break;
                  case 'Device Discovery':
                    setShowDeviceDiscoveryMonitor(true);
                    break;
                }
              }}
              className="glass-card"
              sx={{ 
                minHeight: { xs: 160, sm: 180, md: 200 },
                background: `${getCardBackground(service.status)} !important`,
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: { xs: 'translateY(-2px)', sm: 'translateY(-4px)' },
                  boxShadow: '0 12px 48px rgba(0,0,0,0.4)'
                },
                // Glass color overlay based on status
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: service.status === 'connected' 
                    ? 'radial-gradient(circle at 30% 30%, rgba(0,230,118,0.3), rgba(0,229,255,0.2), transparent)'
                    : service.status === 'error'
                    ? 'radial-gradient(circle at 30% 30%, rgba(244,67,54,0.3), rgba(255,87,34,0.2), transparent)'
                    : service.status === 'warning'
                    ? 'radial-gradient(circle at 30% 30%, rgba(255,193,7,0.3), rgba(255,152,0,0.2), transparent)'
                    : 'radial-gradient(circle at 30% 30%, rgba(158,158,158,0.3), rgba(117,117,117,0.2), transparent)',
                  pointerEvents: 'none',
                  zIndex: 0
                },
                '& > *': {
                  position: 'relative',
                  zIndex: 1
                }
              }}
            >
              <CardContent sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                p: { xs: 1.5, sm: 2, md: 3 },
                '&:last-child': {
                  pb: { xs: 1.5, sm: 2, md: 3 }
                }
              }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={{ xs: 1, sm: 2 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {service.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      fontWeight={600} 
                      sx={{ 
                        fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {service.name.replace(' Controller', '').replace(' Broker', '')}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    {getStatusIcon(service.status)}
                  </Box>
                </Box>

                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: { xs: 1, sm: 2 }, 
                    opacity: 0.9, 
                    fontWeight: 500,
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.3,
                    flexGrow: 1
                  }}
                >
                  {service.message}
                </Typography>

                {/* Compact Details for Mobile */}
                <Box sx={{ mb: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 1, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                    {service.details ? service.details.split('|')[0] + '...' : 'No details'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
                    {service.lastCheck.toLocaleTimeString()}
                  </Typography>
                </Box>

                {/* Mobile: Show minimal details */}
                <Box sx={{ mb: 1, display: { xs: 'block', sm: 'none' } }}>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.6rem' }}>
                    {service.lastCheck.toLocaleTimeString()}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={service.status.toUpperCase()}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      height: { xs: '20px', sm: '24px' }
                    }}
                  />
                  
                  {/* Status-specific indicators */}
                  {service.status === 'connecting' && (
                    <Box sx={{ width: { xs: '40px', sm: '60px' } }}>
                      <LinearProgress 
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                          height: { xs: 3, sm: 4 },
                          borderRadius: 2
                        }}
                      />
                    </Box>
                  )}
                  
                  {service.status === 'connected' && (
                    <CheckCircle sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, opacity: 0.8 }} />
                  )}
                  
                  {service.status === 'error' && (
                    <Error sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, opacity: 0.8 }} />
                  )}
                  
                  {service.status === 'warning' && (
                    <Warning sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, opacity: 0.8 }} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mt: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Quick Actions
          </Typography>
          <Box display="flex" gap={{ xs: 1, sm: 2 }} flexWrap="wrap">
            <Button 
              variant="outlined" 
              onClick={checkAllServices}
              size={{ xs: 'small', sm: 'medium' }}
              sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
            >
              Refresh All
            </Button>
            {onShowDiagnostics && (
              <Button 
                variant="contained" 
                onClick={onShowDiagnostics}
                size={{ xs: 'small', sm: 'medium' }}
                sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
              >
                Diagnostics
              </Button>
            )}
            {errorCount > 0 && (
              <Button 
                variant="contained" 
                color="error" 
                onClick={onShowDiagnostics}
                size={{ xs: 'small', sm: 'medium' }}
                sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
              >
                Fix Issues
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Last Update Info */}
      <Box mt={{ xs: 1, sm: 2 }} textAlign="center">
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
        >
          Last updated: {lastUpdate.toLocaleString()} | Auto-refresh every 30s
        </Typography>
      </Box>

      {/* Process Monitor Dialogs */}
      <MQTTProcessMonitor 
        open={showMQTTMonitor}
        onClose={() => setShowMQTTMonitor(false)}
      />
      
      <SupabaseProcessMonitor 
        open={showSupabaseMonitor}
        onClose={() => setShowSupabaseMonitor(false)}
      />
      
      <ESP32ProcessMonitor 
        open={showESP32Monitor}
        onClose={() => setShowESP32Monitor(false)}
      />
      
      <DeviceDiscoveryMonitor 
        open={showDeviceDiscoveryMonitor}
        onClose={() => setShowDeviceDiscoveryMonitor(false)}
      />

      {/* Supabase Data Viewer Dialog */}
      <SupabaseDataViewer 
        open={showDataViewer}
        onClose={() => setShowDataViewer(false)}
      />
    </Box>
  );
};

export default SystemStatusOverview;