// Fake data service for demo mode
export interface FakeDevice {
  id: string;
  name: string;
  state: 'ON' | 'OFF';
  lastChanged: Date;
  powerRating: number; // watts
  location: string;
  type: 'light' | 'fan' | 'ac' | 'tv' | 'heater' | 'other';
}

export interface FakeDeviceEvent {
  id: string;
  device_id: string;
  state: 'ON' | 'OFF' | 'AUTO_OFF';
  created_at: string;
  duration?: number; // minutes
}

export interface FakeStats {
  totalDevices: number;
  activeDevices: number;
  totalEnergyToday: number; // kWh
  costToday: number; // INR
  monthlyCost: number; // INR
  energySaved: number; // kWh through auto-off
  moneySaved: number; // INR saved through auto-off
  autoOffEvents: number; // Number of auto-off events
}

class FakeDataService {
  private devices: FakeDevice[] = [
    {
      id: '68e9d693ba649e246c0af03d',
      name: 'Living Room Light',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      powerRating: 12,
      location: 'Living Room',
      type: 'light'
    },
    {
      id: '98a1b234cdef567890123456',
      name: 'Kitchen Light',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
      powerRating: 9,
      location: 'Kitchen',
      type: 'light'
    },
    {
      id: 'b12c3d4e5f67890123456789',
      name: 'Porch Light',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
      powerRating: 15,
      location: 'Porch',
      type: 'light'
    },
    {
      id: 'c123d456e789f0123456789a',
      name: 'Bedroom Lamp',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      powerRating: 8,
      location: 'Bedroom',
      type: 'light'
    },
    {
      id: 'd234e567f890123456789abc',
      name: 'Bathroom Light',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
      powerRating: 10,
      location: 'Bathroom',
      type: 'light'
    },
    {
      id: 'e345f678901234567890bcde',
      name: 'Study Light',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
      powerRating: 14,
      location: 'Study',
      type: 'light'
    },
    {
      id: 'f456789012345678901cdefg',
      name: 'Garage Light',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 480), // 8 hours ago
      powerRating: 18,
      location: 'Garage',
      type: 'light'
    },
    {
      id: 'bedroom_fan_001',
      name: 'Bedroom Fan',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      powerRating: 75,
      location: 'Bedroom',
      type: 'fan'
    },
    {
      id: 'living_fan_001',
      name: 'Living Room Fan',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
      powerRating: 70,
      location: 'Living Room',
      type: 'fan'
    },
    {
      id: 'ac_bedroom_001',
      name: 'Bedroom AC',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
      powerRating: 1500,
      location: 'Bedroom',
      type: 'ac'
    },
    {
      id: 'ac_living_001',
      name: 'Living Room AC',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
      powerRating: 1800,
      location: 'Living Room',
      type: 'ac'
    },
    {
      id: 'tv_hall_001',
      name: 'Hall TV',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      powerRating: 120,
      location: 'Hall',
      type: 'tv'
    },
    {
      id: 'tv_bedroom_001',
      name: 'Bedroom TV',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 480), // 8 hours ago
      powerRating: 95,
      location: 'Bedroom',
      type: 'tv'
    },
    {
      id: 'water_heater_001',
      name: 'Water Heater',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      powerRating: 2000,
      location: 'Bathroom',
      type: 'heater'
    },
    {
      id: 'washing_machine_001',
      name: 'Washing Machine',
      state: 'OFF',
      lastChanged: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
      powerRating: 500,
      location: 'Utility',
      type: 'other'
    },
    {
      id: 'refrigerator_001',
      name: 'Refrigerator',
      state: 'ON',
      lastChanged: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
      powerRating: 150,
      location: 'Kitchen',
      type: 'other'
    }
  ];

  private mqttConnected = true;
  private supabaseConnected = true;
  private eventListeners: ((event: any) => void)[] = [];

  // Simulate real-time device state changes
  constructor() {
    this.startDeviceSimulation();
    // Generate massive historical data on first load
    setTimeout(() => this.generateMassiveHistoricalData(), 100);
  }

  private startDeviceSimulation() {
    // Simulate device state changes every 30 seconds to 5 minutes
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of state change
        const randomDevice = this.devices[Math.floor(Math.random() * this.devices.length)];
        const newState = randomDevice.state === 'ON' ? 'OFF' : 'ON';
        this.updateDeviceState(randomDevice.id, newState);
      }
    }, 30000 + Math.random() * 270000); // 30s to 5min

    // Simulate occasional connection issues
    setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance of temporary disconnection
        this.mqttConnected = false;
        setTimeout(() => {
          this.mqttConnected = true;
          this.notifyListeners({
            type: 'mqtt_reconnected',
            message: 'MQTT connection restored'
          });
        }, 2000 + Math.random() * 8000); // 2-10 seconds
      }
    }, 60000); // Check every minute
  }

  private updateDeviceState(deviceId: string, newState: 'ON' | 'OFF') {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.state = newState;
      device.lastChanged = new Date();
      
      // Notify listeners about state change
      this.notifyListeners({
        type: 'device_state_changed',
        device_id: deviceId,
        state: newState,
        timestamp: new Date().toISOString(),
        device_name: device.name
      });
    }
  }

  private notifyListeners(event: any) {
    this.eventListeners.forEach(listener => listener(event));
  }

  // Public API methods
  getDevices(): FakeDevice[] {
    return [...this.devices];
  }

  getDevice(deviceId: string): FakeDevice | undefined {
    return this.devices.find(d => d.id === deviceId);
  }

  toggleDevice(deviceId: string): boolean {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      const newState = device.state === 'ON' ? 'OFF' : 'ON';
      this.updateDeviceState(deviceId, newState);
      return true;
    }
    return false;
  }

  getStats(): FakeStats {
    // Make it look more realistic - show 6-8 active devices out of 16
    const activeDevices = 7;
    
    // Generate realistic daily energy consumption (3-6 kWh for a typical home)
    const dailyBaseConsumption = 4.2; // kWh base consumption
    const variableConsumption = Math.sin(Date.now() / (1000 * 60 * 60 * 24)) * 1.5; // Daily variation
    const finalEnergyToday = dailyBaseConsumption + Math.abs(variableConsumption);
    
    // Calculate realistic costs
    const costToday = finalEnergyToday * 6.5; // ₹6.5 per kWh (realistic Indian rate)
    const monthlyCost = costToday * 30; // Estimate monthly
    
    // Generate convincing auto-off statistics
    this.generateMassiveHistoricalData(); // Ensure we have data
    const autoOffEventsCount = Math.floor(this.historicalEvents.filter(e => e.state === 'AUTO_OFF').length / 30) || 8; // Default to 8 if no data
    const energySaved = autoOffEventsCount * 0.45; // More realistic: 0.45 kWh saved per auto-off event
    const moneySaved = energySaved * 6.5; // INR saved (energy saved * rate per kWh)

    return {
      totalDevices: this.devices.length,
      activeDevices,
      totalEnergyToday: Math.round(finalEnergyToday * 100) / 100,
      costToday: Math.round(costToday * 100) / 100,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      energySaved: Math.round(energySaved * 100) / 100,
      moneySaved: Math.round(moneySaved * 100) / 100,
      autoOffEvents: autoOffEventsCount
    };
  }

  getMQTTStatus(): { connected: boolean; lastUpdate: Date } {
    return {
      connected: this.mqttConnected,
      lastUpdate: new Date()
    };
  }

  getSupabaseStatus(): { connected: boolean; lastUpdate: Date } {
    return {
      connected: this.supabaseConnected,
      lastUpdate: new Date()
    };
  }

  // Generate massive realistic historical data
  private historicalEvents: FakeDeviceEvent[] = [];
  
  // Initialize with 3 months of historical data
  private generateMassiveHistoricalData() {
    if (this.historicalEvents.length > 0) return; // Already generated
    
    const events: FakeDeviceEvent[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    
    const current = new Date(startDate);
    let eventId = 1;
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const month = current.getMonth() + 1;
      
      // Seasonal patterns
      let baseEventsPerDay = 25;
      if (month >= 6 && month <= 8) baseEventsPerDay = 35; // Summer - more AC usage
      if (month >= 11 || month <= 2) baseEventsPerDay = 30; // Winter - more heater usage
      
      // Weekend vs weekday patterns
      const eventsPerDay = isWeekend 
        ? Math.floor(baseEventsPerDay * 0.8) + Math.floor(Math.random() * 10) // Fewer events on weekend
        : baseEventsPerDay + Math.floor(Math.random() * 15); // More events on weekdays
      
      // Generate sessions (ON followed by OFF events)
      const sessionsToday = Math.floor(eventsPerDay / 2);
      
      for (let session = 0; session < sessionsToday; session++) {
        const device = this.devices[Math.floor(Math.random() * this.devices.length)];
        
        // Realistic time patterns based on device type
        let startHour: number;
        if (device.type === 'light') {
          // Lights: Early morning (6-9) or evening (17-23)
          startHour = Math.random() < 0.3 
            ? 6 + Math.floor(Math.random() * 3)  // Morning
            : 17 + Math.floor(Math.random() * 6); // Evening
        } else if (device.type === 'ac') {
          // AC: Hot hours (11-16) or night (21-24)
          startHour = Math.random() < 0.7 
            ? 11 + Math.floor(Math.random() * 5)  // Day
            : 21 + Math.floor(Math.random() * 3); // Night
        } else if (device.type === 'tv') {
          // TV: Evening entertainment (18-23)
          startHour = 18 + Math.floor(Math.random() * 5);
        } else if (device.type === 'fan') {
          // Fan: Throughout day (8-23)
          startHour = 8 + Math.floor(Math.random() * 15);
        } else if (device.type === 'heater') {
          // Water heater: Morning (5-9) or evening (18-21)
          startHour = Math.random() < 0.6 
            ? 5 + Math.floor(Math.random() * 4)  // Morning
            : 18 + Math.floor(Math.random() * 3); // Evening
        } else {
          // Other devices: Random throughout day
          startHour = 6 + Math.floor(Math.random() * 17);
        }
        
        const startMinute = Math.floor(Math.random() * 60);
        const startSecond = Math.floor(Math.random() * 60);
        
        const sessionStart = new Date(current);
        sessionStart.setHours(startHour, startMinute, startSecond);
        
        // Session duration based on device type and time
        let durationMinutes: number;
        if (device.type === 'light') {
          // Lights: 15 minutes to 8 hours
          durationMinutes = 15 + Math.floor(Math.random() * 465);
          // Daytime lights are shorter (auto-off)
          if (startHour >= 9 && startHour <= 17) {
            durationMinutes = Math.min(durationMinutes, 90); // Max 1.5 hours during day
          }
        } else if (device.type === 'ac') {
          // AC: 30 minutes to 6 hours
          durationMinutes = 30 + Math.floor(Math.random() * 330);
        } else if (device.type === 'tv') {
          // TV: 30 minutes to 4 hours
          durationMinutes = 30 + Math.floor(Math.random() * 210);
        } else if (device.type === 'fan') {
          // Fan: 1 hour to 8 hours
          durationMinutes = 60 + Math.floor(Math.random() * 420);
        } else if (device.type === 'heater') {
          // Water heater: 10-45 minutes
          durationMinutes = 10 + Math.floor(Math.random() * 35);
        } else {
          // Other: 20 minutes to 3 hours
          durationMinutes = 20 + Math.floor(Math.random() * 160);
        }
        
        const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60000);
        
        // Determine if this is an auto-off event
        const isAutoOff = this.shouldAutoOff(device, sessionStart, durationMinutes);
        
        // Add ON event
        events.push({
          id: `historical_${eventId++}`,
          device_id: device.id,
          state: 'ON',
          created_at: sessionStart.toISOString(),
          duration: durationMinutes
        });
        
        // Add OFF event
        events.push({
          id: `historical_${eventId++}`,
          device_id: device.id,
          state: isAutoOff ? 'AUTO_OFF' : 'OFF',
          created_at: sessionEnd.toISOString()
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Sort events chronologically
    this.historicalEvents = events.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log(`Generated ${this.historicalEvents.length} historical events for demo mode`);
  }
  
  private shouldAutoOff(device: FakeDevice, startTime: Date, durationMinutes: number): boolean {
    const hour = startTime.getHours();
    
    // Light auto-off scenarios
    if (device.type === 'light') {
      // Daytime auto-off (9AM-3PM) if running > 60 minutes
      if (hour >= 9 && hour <= 15 && durationMinutes > 60) {
        return Math.random() < 0.7; // 70% chance
      }
      // Night auto-off (12AM-6AM) if running > 240 minutes
      if ((hour >= 0 && hour <= 6) && durationMinutes > 240) {
        return Math.random() < 0.8; // 80% chance
      }
      // Extended use auto-off (> 6 hours)
      if (durationMinutes > 360) {
        return Math.random() < 0.6; // 60% chance
      }
    }
    
    // AC auto-off scenarios
    if (device.type === 'ac') {
      // Auto-off after 4+ hours
      if (durationMinutes > 240) {
        return Math.random() < 0.5; // 50% chance
      }
    }
    
    // Fan auto-off scenarios
    if (device.type === 'fan') {
      // Auto-off after 6+ hours
      if (durationMinutes > 360) {
        return Math.random() < 0.4; // 40% chance
      }
    }
    
    return false;
  }

  // Generate fake historical events for calendar view
  generateFakeEvents(startDate: Date, endDate: Date): FakeDeviceEvent[] {
    this.generateMassiveHistoricalData(); // Ensure data is generated
    
    // Filter historical events by date range
    return this.historicalEvents.filter(event => {
      const eventDate = new Date(event.created_at);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
  
  // Get all historical events (for Supabase-like queries)
  getAllHistoricalEvents(): FakeDeviceEvent[] {
    this.generateMassiveHistoricalData(); // Ensure data is generated
    return [...this.historicalEvents];
  }

  // Event subscription for real-time updates
  subscribe(callback: (event: any) => void): () => void {
    this.eventListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // Simulate system notifications
  getSystemNotifications() {
    return [
      {
        id: 1,
        type: 'info',
        title: 'Demo Mode Active',
        message: 'You are viewing simulated data. Switch to Real Mode in settings to connect to hardware.',
        timestamp: new Date(),
        read: false
      },
      {
        id: 2,
        type: 'success',
        title: 'Energy Saved',
        message: 'Auto-off feature saved 2.3 kWh today (₹17.25)',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: true
      },
      {
        id: 3,
        type: 'warning',
        title: 'High Usage Alert',
        message: 'Bedroom AC has been running for 4+ hours',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
        read: true
      }
    ];
  }
}

// Singleton instance
export const fakeDataService = new FakeDataService();
export default FakeDataService;