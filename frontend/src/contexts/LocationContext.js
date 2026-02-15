import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import useWebSocket from '@/hooks/useWebSocket';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Initialize WebSocket for real-time alerts
  const wsUrl = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace('http://', 'ws://').replace('https://', 'wss://') + '/api/ws/alerts';
  
  const {
    isConnected: wsConnected,
    lastMessage: wsMessage,
    setLocation: wsSetLocation,
    requestAlerts: wsRequestAlerts,
  } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      // Handle incoming WebSocket messages
      if (message.type === 'new_alert') {
        // Add new alert to alerts list
        setAlerts((prevAlerts) => {
          // Prevent duplicates
          const exists = prevAlerts.some(alert => alert.id === message.id);
          if (exists) return prevAlerts;
          
          return [message, ...prevAlerts];
        });
      } else if (message.type === 'alerts_list') {
        // Update alerts list from server
        setAlerts(message.alerts || []);
      }
    },
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
  });

  // Load saved location from localStorage
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }
    setLoading(false);
  }, []);

  // Auto-detect location on mount if not set
  useEffect(() => {
    if (!location) {
      detectLocation();
    }
  }, []);

  // Send location to WebSocket when it changes
  useEffect(() => {
    if (location && wsConnected) {
      wsSetLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        state: location.state,
        pin_code: location.pin_code,
      });
    }
  }, [location, wsConnected, wsSetLocation]);

  // Fetch nearby alerts when location changes
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchNearbyAlerts(location.latitude, location.longitude);
    }
  }, [location]);

  const detectLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try browser geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateLocationByCoords(latitude, longitude);
          },
          async (geoError) => {
            console.warn('Geolocation failed, using IP detection:', geoError.message);
            // Fallback to IP-based detection
            await detectLocationByIP();
          }
        );
      } else {
        // No geolocation support, use IP detection
        await detectLocationByIP();
      }
    } catch (err) {
      setError('Failed to detect location');
      setLoading(false);
    }
  };

  const detectLocationByIP = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/location/current`,
        { timeout: 10000 }
      );
      const locationData = {
        latitude: response.data.lat,
        longitude: response.data.lon,
        city: response.data.city,
        state: response.data.region || response.data.country,
        pin_code: response.data.zip || null,
        method: 'ip',
      };
      setLocation(locationData);
      localStorage.setItem('userLocation', JSON.stringify(locationData));
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('IP detection failed:', err);
      const errorMessage = err.code === 'ECONNABORTED' 
        ? 'Connection timeout. Please check your network.' 
        : 'Unable to detect location automatically.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const updateLocationByCoords = async (latitude, longitude) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/location/update`,
        { latitude, longitude, enable_alerts: true, alert_severity: ['warning', 'critical'] },
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        const locationData = {
          ...response.data.location,
          method: 'gps',
        };
        setLocation(locationData);
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        setError(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('Location update failed:', err);
      const errorMessage = err.code === 'ECONNABORTED'
        ? 'Connection timeout. Please try again.'
        : 'Unable to update location. Please try using PIN code.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const updateLocationByPincode = async (pinCode) => {
    setLoading(true);
    setError(null);

    try {
      // Validate PIN code format
      if (!pinCode || !/^\d{6}$/.test(pinCode)) {
        throw new Error('PIN code must be 6 digits');
      }

      // First validate the PIN code
      const validateResponse = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/location/validate-pincode`,
        { pin_code: pinCode },
        { timeout: 10000 }
      );

      if (!validateResponse.data || !validateResponse.data.is_valid) {
        throw new Error('Invalid PIN code');
      }

      // Update location with PIN code
      const updateResponse = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/location/update`,
        {
          pin_code: pinCode,
          enable_alerts: true,
          alert_severity: ['warning', 'critical'],
        },
        { timeout: 10000 }
      );

      if (updateResponse.data.success) {
        const locationData = {
          ...updateResponse.data.location,
          method: 'pincode',
        };
        setLocation(locationData);
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        setError(null);
        setLoading(false);
        return { success: true, location: locationData };
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('PIN code update error:', err);
      let errorMessage = 'Unable to verify PIN code. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.detail || 'Invalid PIN code';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const fetchNearbyAlerts = async (latitude, longitude, radiusKm = 50) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/location/nearby-alerts`,
        { params: { lat: latitude, lon: longitude, radius_km: radiusKm } }
      );
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch nearby alerts:', err);
      setAlerts([]);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    localStorage.removeItem('userLocation');
    setAlerts([]);
  };

  const refreshNearbyAlerts = () => {
    if (location?.latitude && location?.longitude) {
      fetchNearbyAlerts(location.latitude, location.longitude);
      // Also request via WebSocket if connected
      if (wsConnected) {
        wsRequestAlerts();
      }
    }
  };

  const value = {
    location,
    loading,
    error,
    alerts,
    wsConnected, // WebSocket connection status
    detectLocation,
    updateLocationByPincode,
    updateLocationByCoords,
    clearLocation,
    refreshNearbyAlerts,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};
