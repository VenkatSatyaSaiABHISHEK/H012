import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  CloudQueue,
  Cable,
  Wifi,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Settings,
  MonitorHeart,
  Memory,
  Speed,
  Router,
  DeviceHub,
  Message,
  Timeline,
  ExpandMore,
  PlayArrow,
  Stop,
  Visibility,
  Code,
  Storage,
  NetworkCheck
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMQTTContext } from '../context/MQTTContext';
import { config } from '../config';
import mqtt from 'mqtt';

interface ConnectionMetrics {
  uptime: number;
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
  lastHeartbeat: Date;
  bandwidth: number;
}

interface DeviceStatus {
  deviceId: string;
  lastSeen: Date;
  isOnline: boolean;
  messageCount: number;
  topics: string[];
}

interface MQTTBackendPageProps {
  toggleTheme: () => void;
}

const MQTTBackendPage: React.FC<MQTTBackendPageProps> = ({ toggleTheme }) => {
  const navigate = useNavigate();
  const { client, isConnected, messages, connectionError, reconnect, connectionAttempts } = useMQTTContext();
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    uptime: 0,
    messagesReceived: Object.keys(messages).length,
    messagesSent: 0,
    reconnections: connectionAttempts,
    lastHeartbeat: new Date(),
    bandwidth: 0
  });

  const [liveMessages, setLiveMessages] = useState<Array<{
    timestamp: string;
    topic: string;
    message: string;
    direction: 'in' | 'out';
  }>>([]);

  const [showRawData, setShowRawData] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterTopic, setFilterTopic] = useState('');
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});
  const [deviceOfflineThreshold] = useState(30000); // 30 seconds

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        uptime: isConnected ? prev.uptime + 1 : 0,
        messagesReceived: Object.keys(messages).length,
        reconnections: connectionAttempts,
        lastHeartbeat: isConnected ? new Date() : prev.lastHeartbeat,
        bandwidth: Math.random() * 100 // Simulated bandwidth
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, messages, connectionAttempts]);

  // Monitor real-time messages and track device presence
  useEffect(() => {
    Object.entries(messages).forEach(([topic, message]) => {
      const existingMessage = liveMessages.find(msg => 
        msg.topic === topic && msg.message === message
      );
      
      if (!existingMessage) {
        const newMessage = {
          timestamp: new Date().toLocaleTimeString(),
          topic,
          message,
          direction: 'in' as const
        };
        
        setLiveMessages(prev => {
          const updated = [newMessage, ...prev.slice(0, 49)]; // Keep last 50 messages
          return updated;
        });

        // Track device activity for presence detection
        const deviceIdMatch = topic.match(/sinric\/([^\/]+)\//);
        if (deviceIdMatch) {
          const deviceId = deviceIdMatch[1];
          setDeviceStatuses(prev => ({
            ...prev,
            [deviceId]: {
              deviceId,
              lastSeen: new Date(),
              isOnline: true,
              messageCount: (prev[deviceId]?.messageCount || 0) + 1,
              topics: Array.from(new Set([...(prev[deviceId]?.topics || []), topic]))
            }
          }));
        }
      }
    });
  }, [messages]);

  // Check device online status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setDeviceStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(deviceId => {
          const timeSinceLastSeen = now.getTime() - updated[deviceId].lastSeen.getTime();
          updated[deviceId].isOnline = timeSinceLastSeen < deviceOfflineThreshold;
        });
        return updated;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [deviceOfflineThreshold]);

  const getConnectionStatusColor = () => {
    const onlineDevices = Object.values(deviceStatuses).filter(d => d.isOnline).length;
    const totalDevices = Object.keys(deviceStatuses).length;
    
    if (!isConnected) return 'error';
    if (totalDevices === 0) return 'warning';
    if (onlineDevices === totalDevices && onlineDevices > 0) return 'success';
    if (onlineDevices > 0) return 'warning';
    return 'error';
  };

  const getConnectionStatusText = () => {
    const onlineDevices = Object.values(deviceStatuses).filter(d => d.isOnline).length;
    const totalDevices = Object.keys(deviceStatuses).length;
    
    if (!isConnected) return connectionError ? 'Broker Error' : 'Connecting...';
    if (totalDevices === 0) return 'No Devices Detected';
    if (onlineDevices === totalDevices && onlineDevices > 0) return `All Devices Online (${onlineDevices})`;
    if (onlineDevices > 0) return `${onlineDevices}/${totalDevices} Devices Online`;
    return `${totalDevices} Devices Offline`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const filteredMessages = liveMessages.filter(msg => 
    !filterTopic || msg.topic.toLowerCase().includes(filterTopic.toLowerCase())
  );

  const brokerInfo = {
    host: config.mqtt.broker,
    port: config.mqtt.port,
    protocol: config.mqtt.protocol,
    clientId: config.mqtt.clientId,
    username: config.mqtt.username,
    keepAlive: 60,
    cleanSession: true,
    reconnectPeriod: 10000
  };

  const testConnection = async () => {
    // Test multiple connection configurations
    const testConfigs = [
      { protocol: 'wss', port: 8084, name: 'EMQX WSS (Primary)' },
      { protocol: 'ws', port: 8083, name: 'EMQX WS (Fallback)' },
      { protocol: 'ws', port: 8080, name: 'WebSocket Alt' }
    ];

    console.log('🧪 Testing MQTT connections...');
    
    for (const testConfig of testConfigs) {
      try {
        const brokerUrl = `${testConfig.protocol}://${config.mqtt.broker}:${testConfig.port}/mqtt`;
        console.log(`🔍 Testing: ${testConfig.name} - ${brokerUrl}`);
        
        const testClient = mqtt.connect(brokerUrl, {
          username: config.mqtt.username,
          password: config.mqtt.password,
          clientId: 'test_' + Math.random().toString(16).substr(2, 8),
          connectTimeout: 8000,
          rejectUnauthorized: false
        });

        const result = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            testClient.end();
            resolve(false);
          }, 8000);

          testClient.on('connect', () => {
            clearTimeout(timeout);
            console.log(`✅ ${testConfig.name} - Connection successful!`);
            testClient.end();
            resolve(true);
          });

          testClient.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`❌ ${testConfig.name} - Failed: ${error.message}`);
            testClient.end();
            resolve(false);
          });
        });

        if (result) {
          alert(`✅ Connection test successful with ${testConfig.name}!`);
          return;
        }
      } catch (error) {
        console.log(`❌ ${testConfig.name} - Exception: ${error}`);
      }
    }
    
    alert('❌ All connection tests failed. Check console for details.');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #16213E 100%)',
        color: 'white'
      }}
    >
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          onClick={() => navigate('/')}
          variant="contained"
          startIcon={<ArrowBack />}
          sx={{
            minWidth: 120,
            height: 48,
            borderRadius: 3,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 10px 2px rgba(33, 203, 243, .3)',
            }
          }}
        >
          Dashboard
        </Button>
        <CloudQueue sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box flex={1}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            MQTT Backend Monitor
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time MQTT broker connection and message monitoring
          </Typography>
        </Box>
        <Chip 
          label={getConnectionStatusText()}
          color={getConnectionStatusColor()}
          icon={isConnected ? <CheckCircle /> : connectionError ? <Error /> : <Warning />}
          size="medium"
        />
      </Box>

        {/* Connection Status Alert */}
      <Alert 
        severity={getConnectionStatusColor()} 
        sx={{ mb: 3 }}
        action={
          <Box display="flex" gap={1}>
            {!isConnected && (
              <Button color="inherit" size="small" onClick={reconnect}>
                Retry Connection
              </Button>
            )}
            <Button color="inherit" size="small" onClick={testConnection}>
              Test Connection
            </Button>
          </Box>
        }
      >
        <Typography variant="body2">
          {(() => {
            const onlineDevices = Object.values(deviceStatuses).filter(d => d.isOnline).length;
            const totalDevices = Object.keys(deviceStatuses).length;
            
            if (!isConnected) {
              return connectionError 
                ? `❌ MQTT Broker connection failed: ${connectionError}`
                : '🔄 Establishing connection to MQTT broker...';
            }
            
            if (totalDevices === 0) {
              return `✅ Connected to MQTT broker at ${config.mqtt.broker}:${config.mqtt.port} - Waiting for ESP32 devices...`;
            }
            
            if (onlineDevices === totalDevices && onlineDevices > 0) {
              return `✅ Broker connected - All ${onlineDevices} ESP32 devices are online and responding`;
            }
            
            if (onlineDevices > 0) {
              return `⚠️ Broker connected - ${onlineDevices} of ${totalDevices} ESP32 devices are online`;
            }
            
            return `❌ Broker connected but all ${totalDevices} ESP32 devices appear offline (no messages received in last 30 seconds)`;
          })()}
        </Typography>
        {(!isConnected || Object.values(deviceStatuses).every(d => !d.isOnline)) && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              {!isConnected 
                ? `Troubleshooting: Trying multiple ports (8084 WSS, 8083 WS, 8080 WS) | Reconnection attempts: ${metrics.reconnections}`
                : 'Device troubleshooting: Check ESP32 power, WiFi connection, and code is running. Devices become "offline" after 30 seconds without messages.'
              }
            </Typography>
          </Box>
        )}
      </Alert>      <Grid container spacing={3}>
        {/* Connection Metrics */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'rgba(26,26,26,0.9)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <MonitorHeart color="primary" />
                <Typography variant="h6">Connection Metrics</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Uptime:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatUptime(metrics.uptime)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Messages In:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {metrics.messagesReceived}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Messages Out:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="info.main">
                    {metrics.messagesSent}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Reconnections:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    {metrics.reconnections}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Last Heartbeat:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.lastHeartbeat.toLocaleTimeString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Bandwidth:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.bandwidth.toFixed(1)} KB/s
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Broker Information */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'rgba(26,26,26,0.9)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Router color="primary" />
                <Typography variant="h6">Broker Configuration</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Host:</Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                    {brokerInfo.host}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Port:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {brokerInfo.port}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Protocol:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {brokerInfo.protocol?.toUpperCase()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Client ID:</Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                    {brokerInfo.clientId}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Username:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {brokerInfo.username}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Keep Alive:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {brokerInfo.keepAlive}s
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'rgba(26,26,26,0.9)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <DeviceHub color="primary" />
                <Typography variant="h6">ESP32 Devices</Typography>
                <Chip 
                  label={`${Object.values(deviceStatuses).filter(d => d.isOnline).length}/${Object.keys(deviceStatuses).length}`}
                  color={Object.values(deviceStatuses).some(d => d.isOnline) ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Box display="flex" flexDirection="column" gap={1} maxHeight={200} overflow="auto">
                {Object.keys(deviceStatuses).length === 0 ? (
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1} py={2}>
                    <DeviceHub sx={{ fontSize: 32, color: 'grey.600' }} />
                    <Typography variant="body2" color="grey.500" textAlign="center">
                      No ESP32 devices detected yet. Make sure your devices are connected and sending messages.
                    </Typography>
                  </Box>
                ) : (
                  Object.values(deviceStatuses).map((device) => (
                    <Box key={device.deviceId} display="flex" alignItems="center" justifyContent="space-between" p={1}
                         sx={{ bgcolor: device.isOnline ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', borderRadius: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          ESP32 {device.deviceId.slice(-4)}
                        </Typography>
                        <Typography variant="caption" color="grey.400">
                          Last seen: {device.lastSeen.toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={device.isOnline ? 'Online' : 'Offline'}
                          color={device.isOnline ? 'success' : 'error'}
                          size="small"
                        />
                        <Typography variant="caption" color="grey.400">
                          {device.messageCount} msgs
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={12}>
          <Card sx={{ 
            background: 'rgba(26,26,26,0.9)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Settings color="primary" />
                <Typography variant="h6">Quick Actions</Typography>
              </Box>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={reconnect}
                  disabled={isConnected && Object.values(deviceStatuses).some(d => d.isOnline)}
                >
                  Reconnect
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<NetworkCheck />}
                  onClick={() => testConnection()}
                >
                  Test Connection
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setShowSettings(true)}
                >
                  Connection Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Code />}
                  onClick={() => setShowRawData(!showRawData)}
                >
                  {showRawData ? 'Hide' : 'Show'} Raw Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Message Monitor */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Message color="primary" />
                  <Typography variant="h6">Live Message Monitor</Typography>
                  <Chip label={`${filteredMessages.length} messages`} size="small" />
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    size="small"
                    placeholder="Filter by topic..."
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    sx={{ width: 200 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Auto-scroll"
                  />
                </Box>
              </Box>

              <Paper 
                sx={{ 
                  height: 400, 
                  overflow: 'auto', 
                  bgcolor: 'grey.900',
                  p: 1
                }}
              >
                {filteredMessages.length === 0 ? (
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    height="100%"
                    flexDirection="column"
                    gap={2}
                  >
                    <Message sx={{ fontSize: 48, color: 'grey.600' }} />
                    <Typography color="grey.500">
                      No messages received yet. Make sure your ESP32 devices are connected and sending data.
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {filteredMessages.map((msg, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <Chip 
                            label={msg.direction === 'in' ? 'IN' : 'OUT'}
                            color={msg.direction === 'in' ? 'success' : 'info'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'grey.400', fontFamily: 'monospace' }}
                              >
                                [{msg.timestamp}]
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ color: 'white', fontFamily: 'monospace' }}
                              >
                                {msg.topic}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'grey.300', 
                                fontFamily: 'monospace',
                                ml: 2 
                              }}
                            >
                              "{msg.message}"
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Diagnostics */}
        {!isConnected && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <NetworkCheck color="warning" />
                  <Typography variant="h6">Connection Diagnostics</Typography>
                </Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">Connection Issues Detected</Typography>
                  <Typography variant="body2">
                    Your MQTT broker is not connecting. Here are the most common causes:
                  </Typography>
                </Alert>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">🔍 Broker Connection Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Typography variant="body2">
                        <strong>Current Config:</strong> {config.mqtt.protocol}://{config.mqtt.broker}:{config.mqtt.port}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Auth:</strong> {config.mqtt.username} / {config.mqtt.password ? '***' : 'No password'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Client ID:</strong> {config.mqtt.clientId}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">⚠️ Common Issues & Solutions</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Typography variant="body2">
                        <strong>1. Wrong Protocol/Port:</strong> EMQX Cloud uses WSS (port 8084) for secure connections
                      </Typography>
                      <Typography variant="body2">
                        <strong>2. Invalid Credentials:</strong> Check username: {config.mqtt.username} and password
                      </Typography>
                      <Typography variant="body2">
                        <strong>3. Firewall/Network:</strong> Corporate networks may block WebSocket connections
                      </Typography>
                      <Typography variant="body2">
                        <strong>4. Browser Security:</strong> HTTPS sites need WSS, HTTP sites can use WS
                      </Typography>
                      <Typography variant="body2">
                        <strong>5. MQTT Broker Status:</strong> Check if {config.mqtt.broker} is online
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Box mt={2} display="flex" gap={2}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={testConnection}
                    startIcon={<NetworkCheck />}
                  >
                    Run Connection Test
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => window.open('https://www.emqx.com/en/mqtt/public-mqtt5-broker', '_blank')}
                    startIcon={<Code />}
                  >
                    Check Broker Status
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Raw Data View */}
        {showRawData && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Storage color="primary" />
                  <Typography variant="h6">Raw MQTT Data</Typography>
                </Box>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.900', 
                    maxHeight: 300, 
                    overflow: 'auto' 
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      color: 'white',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {JSON.stringify({
                      connection: {
                        isConnected,
                        connectionError,
                        connectionAttempts,
                        brokerConfig: brokerInfo
                      },
                      messages: messages,
                      metrics: metrics
                    }, null, 2)}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>MQTT Connection Settings</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Connection settings are read from the configuration file. 
            To modify these settings, update src/config/index.ts or use environment variables.
          </Alert>
          
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Broker Host"
              value={brokerInfo.host}
              disabled
              fullWidth
            />
            <TextField
              label="Port"
              value={brokerInfo.port}
              disabled
              fullWidth
            />
            <TextField
              label="Protocol"
              value={brokerInfo.protocol}
              disabled
              fullWidth
            />
            <TextField
              label="Username"
              value={brokerInfo.username}
              disabled
              fullWidth
            />
            <TextField
              label="Client ID"
              value={brokerInfo.clientId}
              disabled
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
};

export default MQTTBackendPage;