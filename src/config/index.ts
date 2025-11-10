// Configuration reads from environment variables (create a .env.local at project root)
// For Create React App the env vars must start with REACT_APP_
const env = process.env;

export const config = {
  mqtt: {
    broker: env.REACT_APP_MQTT_BROKER || 'e2a792bf.ala.eu-central-1.emqxsl.com',
    port: Number(env.REACT_APP_MQTT_PORT) || 8084, // Use secure WebSocket port (WSS)
    username: env.REACT_APP_MQTT_USERNAME || 'esp32_1',
    password: env.REACT_APP_MQTT_PASSWORD || '321654987',
    clientId: env.REACT_APP_MQTT_CLIENT_ID || ('dashboard_' + Math.random().toString(16).substr(2, 8)),
    protocol: env.REACT_APP_MQTT_PROTOCOL || 'wss', // Use secure WebSocket first
  },
  supabase: {
    url: env.REACT_APP_SUPABASE_URL || 'https://jiiopewohvvhgmiknpln.supabase.co',
    anonKey: env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaW9wZXdvaHZ2aGdtaWtucGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDI0MjcsImV4cCI6MjA3NzkxODQyN30.FtvZfA9JDHS1ypuZH73_3XdH0XypCk2LkEYh5285Wh4'
  },
  esp32: {
    baseUrl: env.REACT_APP_ESP32_BASE_URL || 'http://[YOUR_ESP32_IP]'
  },
  // Optional: secret used when calling your Supabase Edge function from the device
  edgeSecret: env.REACT_APP_SUPABASE_EDGE_SECRET || ''
};

// Allow runtime overrides via localStorage for quick testing from the UI (settings panel)
try {
  const overrides = JSON.parse(localStorage.getItem('config_overrides') || '{}');
  if (overrides && typeof overrides === 'object') {
    if (overrides.mqtt) {
      config.mqtt.broker = overrides.mqtt.broker || config.mqtt.broker;
      config.mqtt.port = overrides.mqtt.port || config.mqtt.port;
      config.mqtt.username = overrides.mqtt.username || config.mqtt.username;
      config.mqtt.password = overrides.mqtt.password || config.mqtt.password;
    }
    if (overrides.supabase) {
      config.supabase.url = overrides.supabase.url || config.supabase.url;
      config.supabase.anonKey = overrides.supabase.anonKey || config.supabase.anonKey;
    }
    if (overrides.esp32) {
      config.esp32.baseUrl = overrides.esp32.baseUrl || config.esp32.baseUrl;
    }
  }
} catch (e) {
  // ignore parse errors
}