import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  Typography,
  Switch,
  Box,
  CircularProgress,
  IconButton,
  Button,
  Chip,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  PowerSettingsNew,
  Schedule,
  TrendingUp,
  Visibility,
  AccessTime,
  ElectricBolt
} from '@mui/icons-material';
import GraphDialog from './GraphDialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useStats } from '../hooks/useStats';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';

interface DeviceCardProps {
  deviceId: string;
  name: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ deviceId, name }) => {
  const theme = useTheme();
  const { device, stats, history, loading, error, toggleDevice } = useStats(deviceId);
  const [openGraph, setOpenGraph] = React.useState(false);
  const [timeAgo, setTimeAgo] = React.useState('');
  const [currentSessionTime, setCurrentSessionTime] = React.useState('');
  const [isOnline, setIsOnline] = React.useState(true);

  // Prepare chart data with safe date handling
  const chartData = (history || []).map(h => {
    let timeStr = 'N/A';
    try {
      // Handle both timestamp formats from your data
      const date = h.created_at ? new Date(h.created_at) : 
                   h.ts ? new Date(h.ts * 1000) : null; // Convert Unix timestamp
      
      if (date && !isNaN(date.getTime())) {
        timeStr = format(date, 'HH:mm');
      }
    } catch (error) {
      console.warn('Invalid date in history:', h);
      timeStr = 'Invalid';
    }
    
    return {
      time: timeStr,
      duration: h.duration || 5 // Default duration if missing
    };
  });

  // Enhanced card styling with glassmorphism effect
  const cardSx = {
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(145deg, rgba(26,26,26,0.9) 0%, rgba(42,42,42,0.9) 100%)'
      : 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,249,250,0.9) 100%)',
    backdropFilter: 'blur(20px)',
    border: theme.palette.mode === 'dark' 
      ? '1px solid rgba(0,229,255,0.2)' 
      : '1px solid rgba(33,150,243,0.2)',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: device?.state === 'ON' 
        ? 'linear-gradient(90deg, #00E676, #00E5FF)'
        : 'linear-gradient(90deg, #666, #888)',
      opacity: 0.8,
    }
  };

  if (loading) {
    return (
      <MuiCard elevation={8} sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={300} gap={2}>
            <CircularProgress 
              size={40}
              sx={{ 
                color: theme.palette.primary.main,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                }
              }}
            />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Connecting to {name}...
            </Typography>
            <Box width="60%" height={4} sx={{ background: theme.palette.background.paper, borderRadius: 2, overflow: 'hidden' }}>
              <LinearProgress 
                sx={{ 
                  height: '100%',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </MuiCard>
    );
  }

  if (error || !device || !stats) {
    return (
      <MuiCard elevation={8} className="glass-card" sx={{ 
        ...cardSx, 
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(145deg, rgba(244,67,54,0.3) 0%, rgba(255,87,34,0.2) 100%) !important'
          : 'linear-gradient(145deg, rgba(255,245,245,0.95) 0%, rgba(255,235,235,0.95) 100%) !important',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(244,67,54,0.4), rgba(255,87,34,0.3), transparent)',
          pointerEvents: 'none',
          zIndex: 0
        },
        '& > *': {
          position: 'relative',
          zIndex: 1
        }
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} textAlign="center">
            <PowerSettingsNew 
              sx={{ 
                fontSize: 40, 
                color: theme.palette.error.main, 
                alignSelf: 'center',
                opacity: 0.9 
              }} 
            />
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
            }}>
              {name}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 500,
                color: theme.palette.error.main,
                fontSize: '0.95rem'
              }}
            >
              Database Connection Error
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.mode === 'dark' ? '#CCCCCC' : '#666666',
                fontSize: '0.85rem',
                lineHeight: 1.4
              }}
            >
              Unable to connect to device database. Please check your Supabase connection and ensure the device_history table exists.
            </Typography>
            <Box display="flex" gap={1} justifyContent="center" mt={2}>
              <Button 
                size="small" 
                variant="contained" 
                onClick={() => window.location.reload()}
                sx={{ 
                  borderRadius: 3,
                  textTransform: 'none',
                  background: theme.palette.error.main,
                  '&:hover': {
                    background: theme.palette.error.dark
                  },
                  fontWeight: 600
                }}
              >
                RETRY
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => navigator.clipboard && navigator.clipboard.writeText(deviceId)}
                sx={{ 
                  borderRadius: 3,
                  textTransform: 'none',
                  borderColor: theme.palette.error.main,
                  color: theme.palette.error.main,
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: theme.palette.error.dark,
                    background: theme.palette.error.main + '10'
                  }
                }}
              >
                COPY ID
              </Button>
            </Box>
          </Box>
        </CardContent>
      </MuiCard>
    );
  }

  // Update time displays and connection status
  React.useEffect(() => {
    const updateTimeDisplays = () => {
      // Last activity time with safe date handling
      const last = device?.lastUpdate || stats?.lastStateChange;
      if (last) {
        try {
          const lastDate = new Date(last);
          if (!isNaN(lastDate.getTime())) {
            const diff = Date.now() - lastDate.getTime();
            if (diff < 1000 * 60) setTimeAgo(`${Math.floor(diff / 1000)}s ago`);
            else if (diff < 1000 * 60 * 60) setTimeAgo(`${Math.floor(diff / (1000 * 60))}m ago`);
            else if (diff < 1000 * 60 * 60 * 24) setTimeAgo(`${Math.floor(diff / (1000 * 60 * 60))}h ago`);
            else setTimeAgo(lastDate.toLocaleString());
            
            // Consider device offline if no update in 2 minutes
            setIsOnline(diff < 2 * 60 * 1000);
          } else {
            setTimeAgo('Unknown time');
            setIsOnline(false);
          }
        } catch (error) {
          console.warn('Invalid date in lastUpdate:', last);
          setTimeAgo('Invalid time');
          setIsOnline(false);
        }
      }

      // Current session time (if device is ON) with safe date handling
      if (device?.state === 'ON' && stats?.lastStateChange) {
        try {
          const sessionStart = new Date(stats.lastStateChange);
          if (!isNaN(sessionStart.getTime())) {
            const now = new Date();
            const minutes = differenceInMinutes(now, sessionStart);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            
            if (hours > 0) {
              setCurrentSessionTime(`${hours}h ${mins}m`);
            } else {
              setCurrentSessionTime(`${Math.max(0, mins)}m`); // Ensure non-negative
            }
          } else {
            setCurrentSessionTime('Session active');
          }
        } catch (error) {
          console.warn('Invalid session start time:', stats.lastStateChange);
          setCurrentSessionTime('Session active');
        }
      } else {
        setCurrentSessionTime('');
      }
    };

    updateTimeDisplays();
    const id = setInterval(updateTimeDisplays, 1000); // Update every second for live timer
    return () => clearInterval(id);
  }, [device?.lastUpdate, device?.state, stats?.lastStateChange]);

  return (
    <>
    <MuiCard elevation={8} sx={cardSx}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* Header Section */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="flex-start" 
          mb={{ xs: 2, sm: 3 }}
          flexWrap="wrap"
          gap={{ xs: 0.5, sm: 1 }}
        >
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <PowerSettingsNew 
                sx={{ 
                  color: device?.state === 'ON' ? theme.palette.success.main : theme.palette.text.secondary,
                  fontSize: 20 
                }} 
              />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {name}
              </Typography>
              <Chip 
                size="small" 
                label={isOnline ? 'Online' : 'Offline'} 
                color={isOnline ? 'success' : 'error'}
                sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
              ID: {deviceId.slice(-8)}...
            </Typography>
            {timeAgo && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                <AccessTime sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                {timeAgo}
              </Typography>
            )}
          </Box>

          <Box display="flex" flexDirection="column" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
            <Switch
              checked={device?.state === 'ON'}
              onChange={() => toggleDevice(device?.state === 'ON' ? 'OFF' : 'ON')}
              sx={{
                transform: { xs: 'scale(0.8)', sm: 'scale(1)' },
                '& .MuiSwitch-thumb': {
                  background: device?.state === 'ON' 
                    ? 'linear-gradient(45deg, #00E676, #00E5FF)'
                    : theme.palette.text.secondary
                }
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 600, 
                fontSize: { xs: '0.65rem', sm: '0.7rem' }
              }}
            >
              {device?.state || 'OFF'}
            </Typography>
          </Box>
        </Box>

        {/* Live Timer for ON state - Make it more prominent */}
        {device?.state === 'ON' && currentSessionTime && (
          <Box 
            sx={{ 
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(135deg, rgba(0,230,118,0.15), rgba(0,229,255,0.15))'
                : 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(33,150,243,0.15))',
              borderRadius: 3,
              p: 2.5,
              mb: 3,
              border: theme.palette.mode === 'dark'
                ? '2px solid rgba(0,230,118,0.4)'
                : '2px solid rgba(76,175,80,0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Schedule sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  RUNNING
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 800, 
                color: theme.palette.success.main,
                fontFamily: 'monospace'
              }}>
                {currentSessionTime}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Current session duration
            </Typography>
            <LinearProgress 
              variant="indeterminate" 
              sx={{ 
                height: 4, 
                borderRadius: 2,
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #00E676, #00E5FF)',
                  animation: 'pulse 2s infinite'
                }
              }} 
            />
            
            {/* Animated background effect */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 80% 20%, rgba(0,230,118,0.1), transparent)',
                pointerEvents: 'none',
                animation: 'float 3s ease-in-out infinite'
              }}
            />
          </Box>
        )}

        {/* Stats Grid - Focus on Time Information */}
        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} mb={3}>
          <Box textAlign="center" sx={{ p: 1.5, borderRadius: 2, background: theme.palette.background.paper }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>Today's Usage</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: theme.palette.primary.main }}>
              {stats?.dailyHours.toFixed(1) || '0.0'}h
            </Typography>
          </Box>
          
          <Box textAlign="center" sx={{ p: 1.5, borderRadius: 2, background: theme.palette.background.paper }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>This Week</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: theme.palette.secondary.main }}>
              {stats?.weeklyHours.toFixed(1) || '0.0'}h
            </Typography>
          </Box>
          
          <Box textAlign="center" sx={{ p: 1.5, borderRadius: 2, background: theme.palette.background.paper }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>Daily Cost</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: theme.palette.success.main }}>
              ${((stats?.dailyHours || 0) * 0.15 * 0.06).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2, opacity: 0.3 }} />

        {/* Mini Chart */}
        <Box height={120}>
          <Typography variant="body2" color="text.secondary" mb={1} sx={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: 16 }} />
            Recent Usage Pattern
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.slice(-12)}> {/* Show last 12 data points */}
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: '0.8rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="duration" 
                stroke={theme.palette.primary.main}
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, fill: theme.palette.primary.main }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Action Button */}
        <Box display="flex" justifyContent="center" mt={2}>
          <Button 
            size="small" 
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => setOpenGraph(true)}
            sx={{ 
              borderRadius: 3,
              textTransform: 'none',
              borderColor: theme.palette.primary.main + '40',
              '&:hover': {
                background: theme.palette.primary.main + '10'
              }
            }}
          >
            View Analytics
          </Button>
        </Box>
      </CardContent>
    </MuiCard>

    <GraphDialog open={openGraph} onClose={() => setOpenGraph(false)} deviceName={name} history={history || []} />
    </>
  );
};