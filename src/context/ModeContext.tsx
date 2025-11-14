import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'demo' | 'real';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isDemo: boolean;
  isReal: boolean;
  toggleMode: (password?: string) => boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

interface ModeProviderProps {
  children: ReactNode;
}

const CORRECT_PASSWORD = 'IMAMSSIK';
const STORAGE_KEY = 'home_automation_mode';

export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setModeState] = useState<AppMode>(() => {
    // Load from localStorage or default to demo for guests
    const savedMode = localStorage.getItem(STORAGE_KEY);
    return (savedMode as AppMode) || 'demo';
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const toggleMode = (password?: string): boolean => {
    if (mode === 'demo') {
      // Switching from demo to real requires password
      if (password === CORRECT_PASSWORD) {
        setMode('real');
        return true;
      }
      return false;
    } else {
      // Switching from real to demo (no password needed)
      setMode('demo');
      return true;
    }
  };

  const value: ModeContextType = {
    mode,
    setMode,
    isDemo: mode === 'demo',
    isReal: mode === 'real',
    toggleMode,
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

// Hook for components to easily check if they should use fake data
export function useDemoData() {
  const { isDemo } = useMode();
  return isDemo;
}