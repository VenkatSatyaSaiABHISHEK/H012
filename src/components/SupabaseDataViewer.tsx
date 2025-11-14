import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  SavingsOutlined,
  PowerSettingsNew
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { useDemoMode } from '../context/DemoModeContext';
import { fakeDataService } from '../utils/fakeDataService';

interface SupabaseDataViewerProps {
  open: boolean;
  onClose: () => void;
}

interface EventData {
  id?: number;
  device_id?: string;  // Your table uses device_id
  state?: string;      // ON/OFF states visible in your table
  ts?: number;         // Timestamp as numeric (1762479912, etc.)
  created_at?: string; // ISO timestamp
  action?: string;     // Optional field
  gpio?: number;       // Optional field
}

interface CustomDevice {
  id?: number;
  device_name?: string;
  device_id?: string;
  device_type?: string;
  gpio_pin?: number;
  power_rating?: number;
  created_at?: string;
}

export const SupabaseDataViewer: React.FC<SupabaseDataViewerProps> = ({ open, onClose }) => {
  const { isDemoMode } = useDemoMode();
  const [events, setEvents] = useState<EventData[]>([]);
  const [devices, setDevices] = useState<CustomDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isDemoMode) {
        // Use fake data in demo mode
        console.log('🎭 Demo mode: Using fake data');
        const fakeEvents = fakeDataService.getAllHistoricalEvents().slice(0, 50);
        const fakeDevices = fakeDataService.getDevices();
        
        // Convert fake data to match expected format
        const eventsData = fakeEvents.map((event, index) => ({
          id: index + 1,
          device_id: event.device_id,
          state: event.state,
          created_at: event.created_at,
          updated_at: event.created_at
        }));
        
        const devicesData = fakeDevices.map((device, index) => ({
          id: index + 1,
          device_id: device.id,
          name: device.name,
          power_rating: device.powerRating,
          location: device.location,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        setEvents(eventsData);
        setDevices(devicesData);
        console.log(`📊 Demo data loaded: ${eventsData.length} events, ${devicesData.length} devices`);
        return;
      }
      
      // Real mode: Fetch from Supabase
      console.log('🔍 Real mode: Fetching from Supabase...');
      
      // First try without filters to see all data
      const { data: eventsData, error: eventsError, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('📊 Raw Supabase response:', eventsData);
      console.log('📈 Total count in table:', count);
      console.log('❌ Supabase error (if any):', eventsError);
      
      // If no data, try alternative queries
      if (!eventsData || eventsData.length === 0) {
        console.log('🔍 No data found, trying alternative queries...');
        
        // Try querying by your specific device ID
        const { data: deviceData, error: deviceError } = await supabase
          .from('events')
          .select('*')
          .eq('device_id', '8e9d693ba649e246c0ef03d')
          .limit(10);
          
        console.log('🔍 Device-specific query:', deviceData);
        console.log('❌ Device query error:', deviceError);
        
        if (deviceData && deviceData.length > 0) {
          setEvents(deviceData);
          return; // Exit early if we found device-specific data
        }
      }

      if (eventsError) {
        console.error('Events error:', eventsError);
        throw new Error(`Events: ${eventsError.message}`);
      }

      console.log('📄 Events data:', eventsData);
      setEvents(eventsData || []);

      // Fetch custom devices data
      console.log('🔍 Fetching custom devices...');
      const { data: devicesData, error: devicesError } = await supabase
        .from('custom_devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesError) {
        console.error('Devices error:', devicesError);
        // Don't throw error for devices, it might not exist yet
        console.log('Custom devices table might not exist yet');
      } else {
        console.log('🔧 Custom devices data:', devicesData);
        setDevices(devicesData || []);
      }

    } catch (err: any) {
      console.error('❌ Database fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | number | undefined, tsNumeric?: number) => {
    if (!timestamp && !tsNumeric) return 'N/A';
    
    try {
      // Handle your numeric timestamp (ts field)
      if (tsNumeric) {
        // Convert from Unix timestamp (assuming it's in seconds)
        const date = new Date(tsNumeric * 1000);
        return date.toLocaleString();
      }
      
      // Handle ISO string timestamp (created_at field)
      if (timestamp) {
        return new Date(timestamp).toLocaleString();
      }
      
      return 'N/A';
    } catch {
      return String(timestamp || tsNumeric || 'N/A');
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Testing database connection...');
      
      // Test connection and check for RLS issues
      console.log('🧪 Testing database connection and permissions...');
      
      const { data, error, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .limit(5);
      
      console.log('🧪 Connection test result:', { data, error, count });
      
      if (error) {
        console.log('❌ Error details:', error);
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          throw new Error('Row Level Security is blocking access. Please disable RLS on the events table.');
        }
        throw error;
      }
      
      if (count === 0) {
        console.log('⚠️ Table exists but is empty or RLS is filtering all rows');
      }

      if (error) {
        throw error;
      }

      console.log('✅ Connection test successful');
      alert('Database connection successful! ✅');
      await fetchData();
      
    } catch (err: any) {
      console.error('❌ Connection test failed:', err);
      setError(`Connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const insertTestData = async () => {
    setLoading(true);
    try {
      const testEvent = {
        device_id: '8e9d693ba649e246c0ef03d',  // Matching your device ID format
        state: 'ON',
        ts: Math.floor(Date.now() / 1000),     // Unix timestamp like your data
        action: 'TEST_FROM_DASHBOARD',
        gpio: 23
      };

      const { data, error } = await supabase
        .from('events')
        .insert([testEvent])
        .select();

      if (error) throw error;

      console.log('✅ Test data inserted:', data);
      alert('Test data inserted successfully! ✅');
      await fetchData();
      
    } catch (err: any) {
      console.error('❌ Test insert failed:', err);
      setError(`Insert failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          margin: { xs: 0.5, sm: 2 },
          width: { xs: 'calc(100% - 8px)', sm: 'auto' },  
          maxHeight: { xs: 'calc(100vh - 16px)', sm: 'auto' },
          borderRadius: { xs: 1, sm: 2 }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Supabase Database Viewer</Typography>
          <Box>
            <Button onClick={testConnection} disabled={loading} sx={{ mr: 1 }}>
              Test Connection
            </Button>
            <Button onClick={insertTestData} disabled={loading} variant="outlined" sx={{ mr: 1 }}>
              Insert Test Data
            </Button>
            <Button 
              onClick={async () => {
                console.log('🔍 Running direct table inspection...');
                try {
                  // Check table structure
                  const { data: tableData, error: tableError } = await supabase
                    .rpc('get_table_info', { table_name: 'events' })
                    .single();
                  
                  if (tableError) {
                    console.log('Table info error:', tableError);
                    // Fallback: just query all data
                    const { data: allData, error: queryError } = await supabase
                      .from('events')
                      .select('*')
                      .limit(10);
                    
                    console.log('📊 First 10 records:', allData);
                    console.log('❌ Query error:', queryError);
                    
                    if (allData && allData.length > 0) {
                      alert(`Found ${allData.length} records! Check console for details.`);
                    } else {
                      alert('No records found or query error. Check console.');
                    }
                  }
                } catch (err) {
                  console.log('Direct query error:', err);
                  alert('Error running query. Check console for details.');
                }
              }}
              disabled={loading} 
              variant="outlined"
              size="small"
            >
              Debug Query
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SavingsOutlined sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {isDemoMode 
                        ? fakeDataService.getStats().moneySaved.toFixed(2)
                        : '0.00'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Money Saved (Last 30 Days)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PowerSettingsNew sx={{ mr: 1, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {isDemoMode 
                        ? fakeDataService.getStats().autoOffEvents
                        : '0'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Auto-Off Events
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label={`Events (${events.length})`} />
          <Tab label={`Custom Devices (${devices.length})`} />
        </Tabs>

        {/* Events Tab */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Events {events.length > 0 && <Chip label={`${events.length} records`} size="small" />}
            </Typography>
            
            {events.length === 0 ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  No events found in current query. 
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Debug Info: Check browser console (F12) for detailed query results.
                  <br />Expected Device ID: 8e9d693ba649e246c0ef03d
                  <br />Table: events | Columns: id, device_id, state, ts, created_at
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Device ID</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell>GPIO</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event, index) => (
                      <TableRow key={event.id || index}>
                        <TableCell>{event.id || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {event.device_id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>{event.action || 'Auto'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={event.state || 'N/A'} 
                            color={event.state === 'ON' ? 'success' : event.state === 'OFF' ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{event.gpio || 'N/A'}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {formatTimestamp(event.created_at, event.ts)}
                            </Typography>
                            {event.ts && (
                              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                                Unix: {event.ts}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Custom Devices Tab */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Custom Devices {devices.length > 0 && <Chip label={`${devices.length} devices`} size="small" />}
            </Typography>
            
            {devices.length === 0 ? (
              <Alert severity="info">
                No custom devices configured. Use the Device Manager to add devices.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Device ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>GPIO Pin</TableCell>
                      <TableCell>Power Rating</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devices.map((device, index) => (
                      <TableRow key={device.id || index}>
                        <TableCell>{device.device_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {device.device_id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>{device.device_type || 'N/A'}</TableCell>
                        <TableCell>{device.gpio_pin || 'N/A'}</TableCell>
                        <TableCell>{device.power_rating || 'N/A'}W</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(device.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={fetchData} disabled={loading}>
          Refresh Data
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};