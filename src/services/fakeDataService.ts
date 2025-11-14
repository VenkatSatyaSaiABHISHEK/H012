// Fake Data Service - Provides realistic sample data for demo mode
export interface FakeDevice {
  device_id: string;
  device_name: string;
  wattage: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface FakeDeviceEvent {
  id: string;
  device_id: string;
  state: 'ON' | 'OFF' | 'AUTO_OFF';
  created_at: string;
  updated_at: string;
  event_time: string;
}

export interface FakeUsageStats {
  totalDevices: number;
  activeDevices: number;
  totalEvents: number;
  energyConsumed: number;
  costThisMonth: number;
  autoOffEvents: number;
  energySaved: number;
  moneySaved: number;
}

class FakeDataService {
  private devices: FakeDevice[] = [
    {
      device_id: 'living_room_light',
      device_name: 'Living Room Light',
      wattage: 12,
      unit_price: 7.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'bedroom_fan',
      device_name: 'Bedroom Fan',
      wattage: 75,
      unit_price: 7.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'kitchen_light',
      device_name: 'Kitchen Light',
      wattage: 9,
      unit_price: 7.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'ac_bedroom',
      device_name: 'Bedroom AC',
      wattage: 1500,
      unit_price: 8.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'tv_hall',
      device_name: 'Hall TV',
      wattage: 120,
      unit_price: 7.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'porch_light',
      device_name: 'Porch Light',
      wattage: 15,
      unit_price: 7.50,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    },
    {
      device_id: 'water_heater',
      device_name: 'Water Heater',
      wattage: 2000,
      unit_price: 8.00,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z'
    }
  ];

  private generateEventsForMonth(year: number, month: number): FakeDeviceEvent[] {
    const events: FakeDeviceEvent[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      this.devices.forEach(device => {
        const eventsPerDay = this.getEventsPerDay(device.device_id);
        
        for (let i = 0; i < eventsPerDay; i++) {
          const hour = this.getRealisticHour(device.device_id);
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          
          const onTime = new Date(year, month - 1, day, hour, minute, second);
          const duration = this.getRealisticDuration(device.device_id);
          const offTime = new Date(onTime.getTime() + duration * 60000);
          
          // ON Event
          events.push({
            id: `fake_${device.device_id}_${day}_${i}_on`,
            device_id: device.device_id,
            state: 'ON',
            created_at: onTime.toISOString(),
            updated_at: onTime.toISOString(),
            event_time: onTime.toISOString()
          });
          
          // OFF Event (30% chance of AUTO_OFF)
          const isAutoOff = Math.random() < 0.3;
          events.push({
            id: `fake_${device.device_id}_${day}_${i}_off`,
            device_id: device.device_id,
            state: isAutoOff ? 'AUTO_OFF' : 'OFF',
            created_at: offTime.toISOString(),
            updated_at: offTime.toISOString(),
            event_time: offTime.toISOString()
          });
        }
      });
    }
    
    return events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  private getEventsPerDay(deviceId: string): number {
    const eventRanges = {
      'living_room_light': [3, 8],
      'bedroom_fan': [2, 6],
      'kitchen_light': [4, 9],
      'ac_bedroom': [1, 4],
      'tv_hall': [2, 5],
      'porch_light': [1, 3],
      'water_heater': [1, 3]
    };
    
    const range = eventRanges[deviceId as keyof typeof eventRanges] || [2, 6];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  private getRealisticHour(deviceId: string): number {
    const timePreferences = {
      'living_room_light': () => Math.random() < 0.3 ? 6 + Math.floor(Math.random() * 4) : 17 + Math.floor(Math.random() * 6),
      'bedroom_fan': () => 8 + Math.floor(Math.random() * 15),
      'kitchen_light': () => Math.random() < 0.4 ? 6 + Math.floor(Math.random() * 4) : 17 + Math.floor(Math.random() * 5),
      'ac_bedroom': () => Math.random() < 0.6 ? 11 + Math.floor(Math.random() * 5) : 21 + Math.floor(Math.random() * 5),
      'tv_hall': () => 18 + Math.floor(Math.random() * 5),
      'porch_light': () => 18 + Math.floor(Math.random() * 8),
      'water_heater': () => Math.random() < 0.7 ? 5 + Math.floor(Math.random() * 3) : 18 + Math.floor(Math.random() * 2)
    };
    
    const getHour = timePreferences[deviceId as keyof typeof timePreferences] || (() => Math.floor(Math.random() * 24));
    return getHour();
  }

  private getRealisticDuration(deviceId: string): number {
    const durationRanges = {
      'living_room_light': [15, 180],    // 15min - 3hrs
      'bedroom_fan': [30, 300],          // 30min - 5hrs
      'kitchen_light': [10, 120],        // 10min - 2hrs
      'ac_bedroom': [60, 240],           // 1hr - 4hrs
      'tv_hall': [45, 180],              // 45min - 3hrs
      'porch_light': [60, 480],          // 1hr - 8hrs (security)
      'water_heater': [10, 40]           // 10-40min
    };
    
    const range = durationRanges[deviceId as keyof typeof durationRanges] || [20, 120];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  // Public methods for components to use
  getDevices(): Promise<FakeDevice[]> {
    return Promise.resolve([...this.devices]);
  }

  getDeviceEvents(year?: number, month?: number): Promise<FakeDeviceEvent[]> {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;
    
    return Promise.resolve(this.generateEventsForMonth(targetYear, targetMonth));
  }

  getRecentEvents(limit: number = 50): Promise<FakeDeviceEvent[]> {
    const currentEvents = this.generateEventsForMonth(2024, 11); // November 2024
    return Promise.resolve(currentEvents.slice(-limit).reverse());
  }

  getUsageStats(): Promise<FakeUsageStats> {
    const totalEvents = 1250; // Simulated total
    const autoOffEvents = Math.floor(totalEvents * 0.28);
    const energySaved = autoOffEvents * 2.1 * 100 / 1000; // kWh saved
    const moneySaved = energySaved * 7.5; // Cost saved
    
    return Promise.resolve({
      totalDevices: this.devices.length,
      activeDevices: Math.floor(this.devices.length * 0.6), // 60% active
      totalEvents: totalEvents,
      energyConsumed: 145.7, // kWh
      costThisMonth: 1092.75, // ₹
      autoOffEvents: autoOffEvents,
      energySaved: energySaved,
      moneySaved: moneySaved
    });
  }

  // MQTT simulation
  simulateMQTTConnection(): Promise<{ connected: boolean; broker: string }> {
    return Promise.resolve({
      connected: true,
      broker: 'mqtt://demo.hivemq.com:1883 (DEMO)'
    });
  }

  simulateDeviceControl(deviceId: string, state: 'ON' | 'OFF'): Promise<boolean> {
    console.log(`[DEMO MODE] Simulating device control: ${deviceId} → ${state}`);
    return Promise.resolve(true);
  }

  // Get historical data for billing
  getBillingData(startDate: string, endDate: string): Promise<FakeDeviceEvent[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const events: FakeDeviceEvent[] = [];
    
    // Generate events for the date range
    const current = new Date(start);
    while (current <= end) {
      const monthEvents = this.generateEventsForMonth(current.getFullYear(), current.getMonth() + 1);
      events.push(...monthEvents.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate >= start && eventDate <= end;
      }));
      current.setMonth(current.getMonth() + 1);
    }
    
    return Promise.resolve(events);
  }
}

// Export singleton instance
export const fakeDataService = new FakeDataService();