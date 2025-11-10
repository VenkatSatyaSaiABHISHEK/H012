import React from 'react'
import mqtt, { MqttClient } from 'mqtt'
import { config } from '../config'

interface MqttHook {
  client: MqttClient | null
  isConnected: boolean
  messages: Record<string, string>
  publish: (topic: string, message: string) => void
  subscribe: (topic: string) => void
  unsubscribe: (topic: string) => void
  connectionError: string | null
  reconnect: () => void
  connectionAttempts: number
}

// EMQX Cloud WebSocket connection configurations
const mqttConfigs = [
  // Try WORKING connections first (based on test results)
  { protocol: 'wss', port: 8084, name: 'EMQX WebSocket SSL (Primary)' },
  { protocol: 'mqtts', port: 8883, name: 'EMQX MQTT SSL' },
  { protocol: 'ws', port: 8083, name: 'EMQX WebSocket (Fallback)' },
  { protocol: 'ws', port: 8080, name: 'WebSocket HTTP Alt' },
]

export const useMQTT = (): MqttHook => {
  // Initialize state with localStorage persistence
  const [client, setClient] = React.useState<MqttClient | null>(null)
  const [isConnected, setIsConnected] = React.useState(() => {
    try {
      return localStorage.getItem('mqtt_connected') === 'true';
    } catch {
      return false;
    }
  })
  const [messages, setMessages] = React.useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('mqtt_messages') || '{}');
    } catch {
      return {};
    }
  })
  const [connectionError, setConnectionError] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem('mqtt_error');
    } catch {
      return null;
    }
  })
  const [connectionAttempts, setConnectionAttempts] = React.useState(() => {
    try {
      return Number(localStorage.getItem('mqtt_attempts') || '0');
    } catch {
      return 0;
    }
  })

  const tryConnection = async (configIndex: number = 0): Promise<MqttClient | null> => {
    if (configIndex >= mqttConfigs.length) {
      console.error('❌ All MQTT configurations failed')
      setConnectionAttempts(prev => prev + 1)
      const attempts = connectionAttempts + 1
      
      if (attempts >= 10) {
        setConnectionError(`❌ Failed after ${attempts} attempts. Please check if your ESP32 device is powered on and connected to WiFi. Click to retry.`)
      } else {
        setConnectionError(`Connection failed (attempt ${attempts}/10). Retrying...`)
      }
      return null
    }

    const mqttConfig = mqttConfigs[configIndex]
    console.log(`🔗 Trying MQTT config ${configIndex + 1}: ${mqttConfig.name}`)

    return new Promise((resolve) => {
      const brokerUrl = (mqttConfig.protocol === 'ws' || mqttConfig.protocol === 'wss')
        ? `${mqttConfig.protocol}://${config.mqtt.broker}:${mqttConfig.port}/mqtt`
        : `${mqttConfig.protocol}://${config.mqtt.broker}:${mqttConfig.port}`;
      console.log(`🌐 Connecting to: ${brokerUrl}`);
      
      const mqttClient = mqtt.connect(brokerUrl, {
        username: config.mqtt.username,
        password: config.mqtt.password,
        clientId: config.mqtt.clientId + '_' + configIndex,
        reconnectPeriod: 0, // Disable auto-reconnect for manual control
        connectTimeout: 10000,
        keepalive: 60,
        clean: true,
        rejectUnauthorized: false, // Allow self-signed certificates
      })

      const timeout = setTimeout(() => {
        console.log(`⏰ MQTT config ${configIndex + 1} timed out, trying next...`)
        mqttClient.end(true)
        tryConnection(configIndex + 1).then(resolve)
      }, 12000)

      mqttClient.on('connect', () => {
        clearTimeout(timeout)
        console.log(`✅ MQTT connected successfully with ${mqttConfig.name}`)
        setConnectionError(null)
        resolve(mqttClient)
      })

      mqttClient.on('error', (error) => {
        clearTimeout(timeout)
        console.log(`❌ MQTT config ${configIndex + 1} failed:`, error.message)
        mqttClient.end(true)
        tryConnection(configIndex + 1).then(resolve)
      })
    })
  }

  const connectMQTT = React.useCallback(async () => {
      try {
        console.log('🚀 Starting MQTT connection attempts...')
        const mqttClient = await tryConnection()
        
        if (!mqttClient) {
          console.error('❌ Failed to connect with any MQTT configuration')
          return
        }

        setClient(mqttClient)
        setIsConnected(true)
        setConnectionError(null)
        setConnectionAttempts(0)
        
        // Subscribe to IP discovery topics for all devices
        mqttClient.subscribe('sinric/+/ip')
        mqttClient.subscribe('sinric/+/status')
        console.log('📡 Subscribed to ESP32 discovery topics')

        mqttClient.on('message', (topic: string, message: Buffer) => {
          const messageStr = message.toString().trim()
          console.log(`📥 MQTT Message - Topic: ${topic}, Message: "${messageStr}"`)
          
          // Auto-discover ESP32 IP addresses
          if (topic.includes('/ip')) {
            console.log(`🔍 ESP32 IP discovered: ${messageStr}`)
            // Save discovered IP to localStorage
            if (messageStr.match(/^\d+\.\d+\.\d+\.\d+$/)) {
              const ipUrl = `http://${messageStr}`
              localStorage.setItem('esp32_ip', ipUrl)
              console.log(`💾 Saved ESP32 IP: ${ipUrl}`)
              
              // Notify user about discovered IP
              if (window.confirm(`ESP32 IP discovered: ${messageStr}\nUpdate dashboard configuration?`)) {
                window.location.reload()
              }
            }
          }
          
          setMessages(prev => ({
            ...prev,
            [topic]: messageStr
          }))
        })

        mqttClient.on('offline', () => {
          console.log('📴 MQTT Client offline')
          setIsConnected(false)
        })

        mqttClient.on('reconnect', () => {
          console.log('🔄 MQTT Reconnecting...')
        })

        mqttClient.on('close', () => {
          console.log('🔌 MQTT Connection closed')
          setIsConnected(false)
        })

        mqttClient.on('error', (error) => {
          console.error('❌ MQTT Runtime Error:', error)
          setConnectionError(error.message)
          setIsConnected(false)
        })

      } catch (error) {
        console.error('❌ MQTT Connection Setup Error:', error)
        setConnectionError(error instanceof Error ? error.message : 'Unknown MQTT error')
      }
    }, [])

  // Persist connection state to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('mqtt_connected', isConnected.toString());
    } catch (e) {
      console.warn('Failed to persist MQTT connection state:', e);
    }
  }, [isConnected]);

  React.useEffect(() => {
    try {
      localStorage.setItem('mqtt_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to persist MQTT messages:', e);
    }
  }, [messages]);

  React.useEffect(() => {
    try {
      if (connectionError) {
        localStorage.setItem('mqtt_error', connectionError);
      } else {
        localStorage.removeItem('mqtt_error');
      }
    } catch (e) {
      console.warn('Failed to persist MQTT error:', e);
    }
  }, [connectionError]);

  React.useEffect(() => {
    try {
      localStorage.setItem('mqtt_attempts', connectionAttempts.toString());
    } catch (e) {
      console.warn('Failed to persist MQTT attempts:', e);
    }
  }, [connectionAttempts]);

  // Initialize connection
  React.useEffect(() => {
    connectMQTT()

    // Handle page visibility changes to refresh connection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('🔄 Page became visible, checking MQTT connection...')
        setTimeout(() => {
          if (!isConnected) {
            connectMQTT()
          }
        }, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (client) {
        console.log('🔌 Cleaning up MQTT connection')
        client.end(true)
      }
    }
  }, [])

  const publish = React.useCallback((topic: string, message: string) => {
    if (client && isConnected) {
      client.publish(topic, message)
      console.log(`📤 Published to ${topic}: ${message}`)
    } else {
      console.warn('⚠️ Cannot publish: MQTT client not connected')
    }
  }, [client, isConnected])

  const subscribe = React.useCallback((topic: string) => {
    if (client && isConnected) {
      client.subscribe(topic)
      console.log(`📡 Subscribed to: ${topic}`)
    } else {
      console.warn('⚠️ Cannot subscribe: MQTT client not connected')
    }
  }, [client, isConnected])

  const unsubscribe = React.useCallback((topic: string) => {
    if (client && isConnected) {
      client.unsubscribe(topic)
      console.log(`📡 Unsubscribed from: ${topic}`)
    }
  }, [client, isConnected])

  const reconnect = React.useCallback(() => {
    console.log('🔄 Manual reconnect triggered')
    setConnectionAttempts(0)
    setConnectionError(null)
    
    if (client) {
      client.end(true)
    }
    
    // Trigger reconnection
    connectMQTT()
  }, [client])

  return {
    client,
    isConnected,
    messages,
    publish,
    subscribe,
    unsubscribe,
    connectionError,
    reconnect,
    connectionAttempts
  }
}