import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;
  isAuthenticated: boolean;
  authenticate: (password: string) => boolean;
  logout: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

interface DemoModeProviderProps {
  children: ReactNode;
}

const CORRECT_PASSWORD = 'IMAMSSIK';
const DEMO_MODE_KEY = 'home_automation_demo_mode';
const AUTH_KEY = 'home_automation_auth';
const AUTH_EXPIRY_KEY = 'home_automation_auth_expiry';

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true); // Default to demo mode for safety
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is already authenticated and not expired
    const authStatus = localStorage.getItem(AUTH_KEY);
    const authExpiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    if (authStatus === 'true' && authExpiry) {
      const expiryTime = parseInt(authExpiry);
      if (Date.now() < expiryTime) {
        setIsAuthenticated(true);
        // Load demo mode preference
        const savedDemoMode = localStorage.getItem(DEMO_MODE_KEY);
        setIsDemoMode(savedDemoMode === 'true');
      } else {
        // Authentication expired
        logout();
      }
    }
  }, []);

  const authenticate = (password: string): boolean => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      // Set authentication to expire in 24 hours
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsDemoMode(true); // Reset to demo mode for safety
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  };

  const setDemoMode = (isDemo: boolean) => {
    if (isAuthenticated) {
      setIsDemoMode(isDemo);
      localStorage.setItem(DEMO_MODE_KEY, isDemo.toString());
      
      // Show notification about mode change
      if (isDemo) {
        console.log('🎭 DEMO MODE: Switched to fake data for demonstration');
      } else {
        console.log('🔴 REAL MODE: Connected to live MQTT and Supabase');
      }
    }
  };

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      setDemoMode,
      isAuthenticated,
      authenticate,
      logout
    }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

export default DemoModeContext;