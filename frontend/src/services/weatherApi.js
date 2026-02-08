import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Weather APIs
export const getWeatherByLocation = async (location) => {
  try {
    const params = {};
    if (typeof location === 'string') {
      params.q = location;
    } else if (location.lat && location.lon) {
      params.lat = location.lat;
      params.lon = location.lon;
    }
    const response = await api.get('/api/weather/location', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

export const getRainfallTrends = async (lat, lon, days = 7) => {
  try {
    const response = await api.get('/api/weather/rainfall-trends', {
      params: { lat, lon, days }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching rainfall trends:', error);
    throw error;
  }
};

// AQI APIs
export const getAQIByLocation = async (location) => {
  try {
    const params = {};
    if (typeof location === 'string') {
      params.q = location;
    } else if (location.lat && location.lon) {
      params.lat = location.lat;
      params.lon = location.lon;
    }
    const response = await api.get('/api/aqi/location', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching AQI:', error);
    throw error;
  }
};

export const getRealtimeAQIStations = async (lat, lon, radius = 100000) => {
  try {
    const response = await api.get('/api/aqi/realtime-stations', {
      params: { lat, lon, radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching AQI stations:', error);
    throw error;
  }
};

// Cyclone APIs
export const getCycloneData = async () => {
  try {
    const response = await api.get('/api/cyclone');
    return response.data;
  } catch (error) {
    console.error('Error fetching cyclone data:', error);
    throw error;
  }
};

export const getCycloneTrack = async () => {
  try {
    const response = await api.get('/api/cyclone/track');
    return response.data;
  } catch (error) {
    console.error('Error fetching cyclone track:', error);
    throw error;
  }
};

export default api;
