import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Notifications } from '@mantine/notifications';
import { MantineProvider } from '@mantine/core';
import { Dashboard } from './components/Dashboard';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GraphsPage from './components/GraphsPage';
import MQTTBackendPage from './components/MQTTBackendPage';
import { MQTTProvider } from './context/MQTTContext';
import { DemoModeProvider } from './context/DemoModeContext';

const App: React.FC = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('dark'); // Default to dark mode

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#00E5FF' : '#2196f3',
        light: mode === 'dark' ? '#4FFFB3' : '#64b5f6',
        dark: mode === 'dark' ? '#00B2CC' : '#1976d2',
      },
      secondary: {
        main: mode === 'dark' ? '#FF4081' : '#f50057',
        light: mode === 'dark' ? '#FF79B0' : '#ff4081',
        dark: mode === 'dark' ? '#F50057' : '#c51162',
      },
      success: {
        main: mode === 'dark' ? '#00E676' : '#4caf50',
      },
      warning: {
        main: mode === 'dark' ? '#FFD54F' : '#ff9800',
      },
      error: {
        main: mode === 'dark' ? '#FF5252' : '#f44336',
      },
      background: {
        default: mode === 'dark' ? '#0A0A0A' : '#f5f5f5',
        paper: mode === 'dark' ? '#1A1A1A' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#000000',
        secondary: mode === 'dark' ? '#B0B0B0' : '#666666',
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
      }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: mode === 'dark' 
              ? 'linear-gradient(145deg, #1A1A1A 0%, #2A2A2A 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: mode === 'dark' 
              ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)',
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                backgroundColor: mode === 'dark' ? '#00E676' : '#4caf50',
              }
            }
          }
        }
      }
    }
  });

  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  return (
    <MantineProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Notifications position="top-right" />
        <DemoModeProvider>
          <MQTTProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Dashboard toggleTheme={toggleTheme} />} />
                <Route path="/graphs" element={<GraphsPage toggleTheme={toggleTheme} />} />
                <Route path="/mqtt-backend" element={<MQTTBackendPage toggleTheme={toggleTheme} />} />
              </Routes>
            </BrowserRouter>
          </MQTTProvider>
        </DemoModeProvider>
      </ThemeProvider>
    </MantineProvider>
  );
};

export default App;