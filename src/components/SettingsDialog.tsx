import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
  Security,
  DeveloperMode,
  Cloud,
  Hardware,
  Lock,
  LockOpen
} from '@mui/icons-material';
import { useDemoMode } from '../context/DemoModeContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { isDemoMode, setDemoMode, isAuthenticated, authenticate, logout } = useDemoMode();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuthSection, setShowAuthSection] = useState(false);

  const handleAuthenticate = () => {
    if (authenticate(password)) {
      setAuthError('');
      setPassword('');
      setShowAuthSection(false);
    } else {
      setAuthError('Invalid password. Access denied.');
      setPassword('');
    }
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isAuthenticated) {
      setDemoMode(!event.target.checked); // Switch is for "Real Mode", so invert for demo mode
    }
  };

  const handleLogout = () => {
    logout();
    setShowAuthSection(false);
    setAuthError('');
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    setAuthError('');
    setShowAuthSection(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          margin: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' },
          maxHeight: { xs: 'calc(100vh - 32px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
        color: 'white'
      }}>
        <SettingsIcon />
        System Settings
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Current Mode Status */}
        <Card sx={{ 
          mb: 3, 
          background: isDemoMode 
            ? 'linear-gradient(45deg, #ff9800, #ffb74d)' 
            : 'linear-gradient(45deg, #4caf50, #81c784)',
          color: 'white'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isDemoMode ? <DeveloperMode sx={{ fontSize: 32 }} /> : <Hardware sx={{ fontSize: 32 }} />}
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {isDemoMode ? '🎭 DEMO MODE' : '🔴 REAL MODE'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {isDemoMode 
                    ? 'Showing simulated data for demonstration' 
                    : 'Connected to live MQTT and Supabase hardware'
                  }
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Chip 
                  label={isDemoMode ? 'FAKE DATA' : 'LIVE DATA'} 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 'bold'
                  }} 
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Authentication Section */}
        {!isAuthenticated && (
          <Card sx={{ mb: 3, border: '2px solid #f44336' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Lock color="error" />
                <Typography variant="h6" color="error">
                  Settings Locked
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter administrator password to change system mode settings.
              </Typography>
              
              {!showAuthSection ? (
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<Security />}
                  onClick={() => setShowAuthSection(true)}
                >
                  Unlock Settings
                </Button>
              ) : (
                <Box>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Administrator Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
                    sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {authError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {authError}
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      onClick={handleAuthenticate}
                      disabled={!password}
                    >
                      Authenticate
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => setShowAuthSection(false)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mode Control Section */}
        {isAuthenticated && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LockOpen color="success" />
                <Typography variant="h6" color="success.main">
                  Administrator Access
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    System Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Switch between demo data and live hardware connection
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!isDemoMode}
                      onChange={handleModeChange}
                      color="success"
                      size="medium"
                    />
                  }
                  label={!isDemoMode ? 'Real Mode' : 'Demo Mode'}
                  labelPlacement="start"
                />
              </Box>

              <Alert 
                severity={isDemoMode ? 'info' : 'warning'} 
                sx={{ mb: 2 }}
              >
                {isDemoMode ? (
                  <>
                    <strong>Demo Mode:</strong> All data is simulated. Perfect for demonstrations and testing UI without hardware.
                  </>
                ) : (
                  <>
                    <strong>Real Mode:</strong> Connected to live MQTT broker and Supabase database. Hardware commands will be executed.
                  </>
                )}
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  startIcon={<Lock />}
                  onClick={handleLogout}
                  size="small"
                >
                  Lock Settings
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                  Authentication expires in 24 hours
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Information Section */}
        <Card sx={{ background: 'linear-gradient(45deg, #e3f2fd, #f3e5f5)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Cloud />
              Connection Status
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  MQTT Broker
                </Typography>
                <Chip 
                  label={isDemoMode ? 'Simulated' : 'Connected'} 
                  color={isDemoMode ? 'warning' : 'success'} 
                  size="small" 
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Supabase Database
                </Typography>
                <Chip 
                  label={isDemoMode ? 'Simulated' : 'Connected'} 
                  color={isDemoMode ? 'warning' : 'success'} 
                  size="small" 
                />
              </Box>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              System connection status and configuration settings.
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
