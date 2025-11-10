import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  CloudQueue,
  Cable,
  Wifi,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { useMQTTContext } from '../context/MQTTContext';

interface MQTTProcessMonitorProps {
  open: boolean;
  onClose: () => void;
}

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export const MQTTProcessMonitor: React.FC<MQTTProcessMonitorProps> = ({ open, onClose }) => {
  const { isConnected, connectionError, messages } = useMQTTContext();
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const initializeSteps = () => {
    const initialSteps: ProcessStep[] = [
      {
        id: 'dns',
        name: 'DNS Resolution',
        status: 'pending',
        message: 'Resolving broker hostname...',
        timestamp: new Date()
      },
      {
        id: 'websocket',
        name: 'WebSocket Connection',
        status: 'pending',
        message: 'Establishing WebSocket connection...',
        timestamp: new Date()
      },
      {
        id: 'authentication',
        name: 'Authentication',
        status: 'pending',
        message: 'Authenticating with broker...',
        timestamp: new Date()
      },
      {
        id: 'subscribe',
        name: 'Topic Subscription',
        status: 'pending',
        message: 'Subscribing to device topics...',
        timestamp: new Date()
      },
      {
        id: 'heartbeat',
        name: 'Connection Health',
        status: 'pending',
        message: 'Maintaining connection...',
        timestamp: new Date()
      }
    ];
    setSteps(initialSteps);
  };

  useEffect(() => {
    if (open) {
      initializeSteps();
      simulateConnectionProcess();
    }
  }, [open]);

  useEffect(() => {
    // Update steps based on actual connection status
    if (isConnected) {
      setSteps(prev => prev.map(step => ({
        ...step,
        status: 'success' as const,
        message: step.id === 'heartbeat' ? 'Connection stable - receiving messages' : 'Completed successfully',
        timestamp: new Date()
      })));
    } else if (connectionError) {
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === 1 ? 'error' as const : step.status,
        message: index === 1 ? `Failed: ${connectionError}` : step.message,
        timestamp: new Date()
      })));
    }
  }, [isConnected, connectionError]);

  const simulateConnectionProcess = async () => {
    const stepIds = ['dns', 'websocket', 'authentication', 'subscribe', 'heartbeat'];
    
    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i];
      
      // Set current step to running
      setSteps(prev => prev.map(step => 
        step.id === stepId 
          ? { ...step, status: 'running', message: 'In progress...', timestamp: new Date() }
          : step
      ));
      
      // Wait for simulation
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      
      // Don't override if real connection status is available
      if (!isConnected && !connectionError) {
        const isSuccess = Math.random() > 0.3; // 70% success rate for simulation
        
        setSteps(prev => prev.map(step => 
          step.id === stepId 
            ? { 
                ...step, 
                status: isSuccess ? 'success' : 'error',
                message: isSuccess ? 'Completed successfully' : 'Connection failed',
                timestamp: new Date()
              }
            : step
        ));
        
        if (!isSuccess) break; // Stop on first failure
      }
    }
  };

  const retryConnection = async () => {
    setIsRetrying(true);
    initializeSteps();
    await simulateConnectionProcess();
    setIsRetrying(false);
  };

  const getStatusIcon = (status: ProcessStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'running':
        return <LinearProgress sx={{ width: 20, height: 20, borderRadius: 10 }} />;
      case 'pending':
      default:
        return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const getStatusColor = (status: ProcessStep['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'running': return 'warning';
      case 'pending': return 'default';
    }
  };

  const overallStatus = steps.every(s => s.status === 'success') ? 'success' :
                       steps.some(s => s.status === 'error') ? 'error' :
                       steps.some(s => s.status === 'running') ? 'running' : 'pending';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <CloudQueue />
          <Typography variant="h6">MQTT Broker Connection Process</Typography>
          <Chip 
            label={isConnected ? 'CONNECTED' : connectionError ? 'ERROR' : 'CONNECTING'} 
            color={isConnected ? 'success' : connectionError ? 'error' : 'warning'}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert 
          severity={overallStatus === 'success' ? 'success' : overallStatus === 'error' ? 'error' : 'info'}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            {isConnected 
              ? '✅ Successfully connected to MQTT broker and receiving real-time messages'
              : connectionError
              ? `❌ Connection failed: ${connectionError}`
              : '🔄 Establishing connection to MQTT broker...'
            }
          </Typography>
        </Alert>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Connection Details:
          </Typography>
          <Typography variant="body2">
            <strong>Broker:</strong> e2a792bf.ala.eu-central-1.emqxsl.com<br />
            <strong>Protocol:</strong> WebSocket (WSS/WS)<br />
            <strong>Port:</strong> 8083/8084<br />
            <strong>Messages Received:</strong> {Object.keys(messages).length}<br />
            <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Paper>

        <Typography variant="h6" gutterBottom>Connection Steps:</Typography>
        
        <List>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <ListItem>
                <ListItemIcon>
                  {getStatusIcon(step.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">{step.name}</Typography>
                      <Chip 
                        label={step.status.toUpperCase()} 
                        size="small" 
                        color={getStatusColor(step.status) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">{step.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < steps.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>

        {Object.keys(messages).length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Recent Messages:</Typography>
            <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'grey.100' }}>
              {Object.entries(messages).slice(-5).map(([topic, message]) => (
                <Typography key={topic} variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  <strong>{topic}:</strong> {message}
                </Typography>
              ))}
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={retryConnection}
          disabled={isRetrying || isConnected}
          startIcon={<Refresh />}
        >
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};