import React, { createContext, useContext, ReactNode } from 'react';
import { useMQTT } from '../hooks/useMQTT';

interface MQTTContextType {
  client: any;
  isConnected: boolean;
  messages: Record<string, string>;
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  connectionError: string | null;
  reconnect: () => void;
  connectionAttempts: number;
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

interface MQTTProviderProps {
  children: ReactNode;
}

export const MQTTProvider: React.FC<MQTTProviderProps> = ({ children }) => {
  const mqttData = useMQTT();

  return (
    <MQTTContext.Provider value={mqttData}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTTContext = () => {
  const context = useContext(MQTTContext);
  if (context === undefined) {
    throw new Error('useMQTTContext must be used within a MQTTProvider');
  }
  return context;
};

export default MQTTContext;