import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  MapPin,
  Loader2,
  Wind,
  Droplets,
  Activity,
  Eye,
  CloudRain,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Map2D from '@/components/maps/Map2D';
import Map3D from '@/components/maps/Map3D';
import { 
  getWeatherByLocation, 
  getAQIByLocation, 
  getRainfallTrends,
  getRealtimeAQIStations,
  getCycloneTrack 
} from '@/services/weatherApi';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const MapView = () => {
  const [is3D, setIs3D] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [center, setCenter] = useState([20.5937, 78.9629]); // Default: India center
  const [weatherData, setWeatherData] = useState(null);
  const [aqiData, setAQIData] = useState(null);
  const [aqiStations, setAQIStations] = useState([]);
  const [rainfallData, setRainfallData] = useState(null);
  const [cycloneTrack, setCycloneTrack] = useState([]);
  const [error, setError] = useState(null);

  // Layer visibility controls
  const [showLayers, setShowLayers] = useState({
    aqi: true,
    aqiHeatMap: false, // New: AQI heat map overlay
    rainfall: true,
    cyclone: true,
  });

  // Load initial data for default location
  useEffect(() => {
    loadLocationData(center[0], center[1]);
  }, []);

  const loadLocationData = async (lat, lon) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [weather, aqi, rainfall, stations, cyclone] = await Promise.allSettled([
        getWeatherByLocation({ lat, lon }),
        getAQIByLocation({ lat, lon }),
        getRainfallTrends(lat, lon),
        getRealtimeAQIStations(lat, lon),
        getCycloneTrack()
      ]);

      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
      }

      if (aqi.status === 'fulfilled') {
        setAQIData(aqi.value);
      }

      if (rainfall.status === 'fulfilled') {
        setRainfallData(rainfall.value);
      }

      if (stations.status === 'fulfilled') {
        setAQIStations(stations.value);
      }

      if (cyclone.status === 'fulfilled' && cyclone.value) {
        setCycloneTrack(cyclone.value);
      }

    } catch (err) {
      console.error('Error loading location data:', err);
      setError('Failed to load some data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Check if input is coordinates (lat,lon format)
      const coordMatch = location.match(/^([\-\d.]+),\s*([\-\d.]+)$/);
      
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        setCenter([lat, lon]);
        await loadLocationData(lat, lon);
      } else {
        // Search by city name
        const weather = await getWeatherByLocation(location);
        if (weather?.current?.coordinates) {
          const { lat, lon } = weather.current.coordinates;
          setCenter([lat, lon]);
          await loadLocationData(lat, lon);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Location not found. Try searching with city name or coordinates (lat, lon)');
    } finally {
      setLoading(false);
    }
  };

  // Transform rainfall data for visualization
  const rainfallChartData = rainfallData?.daily_trends?.slice(0, 7).map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rainfall: day.rainfall,
    probability: day.probability
  })) || [];

  // Transform rainfall data for map visualization
  const rainfallMapData = rainfallData?.daily_trends?.slice(0, 5).map((day, index) => ({
    lat: center[0] + (Math.random() - 0.5) * 0.5,
    lon: center[1] + (Math.random() - 0.5) * 0.5,
    intensity: day.probability,
    amount: day.rainfall
  })) || [];

  return (
    <div className="h-screen flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weather Visualization Dashboard</h1>
          <p className="text-muted-foreground">Interactive 2D/3D maps with real-time weather, AQI, and cyclone tracking</p>
        </div>

        {/* 2D/3D Toggle */}
        <div className="flex items-center gap-3 bg-muted px-4 py-2 rounded-full">
          <span className={`text-sm font-medium ${!is3D ? 'text-primary' : 'text-muted-foreground'}`}>2D Map</span>
          <Switch 
            checked={is3D} 
            onCheckedChange={setIs3D}
            data-testid="map-toggle-switch"
          />
          <span className={`text-sm font-medium ${is3D ? 'text-primary' : 'text-muted-foreground'}`}>3D Map</span>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by city name or coordinates (e.g., 'Mumbai' or '19.0760, 72.8777')"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full"
                data-testid="location-search-input"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="search-location-button">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="ml-2">Search</span>
            </Button>
          </form>
          {error && (
            <div className="mt-2 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Map Container */}
        <div className="lg:col-span-3 relative rounded-lg overflow-hidden border border-border bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {!is3D ? (
              <motion.div
                key="2d-map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <Map2D 
                  center={center} 
                  aqiStations={aqiStations}
                  cycloneTrack={cycloneTrack}
                  rainfallData={rainfallMapData}
                  showLayers={showLayers}
                />
              </motion.div>
            ) : (
              <motion.div
                key="3d-map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <Map3D 
                  center={center} 
                  aqiStations={aqiStations}
                  cycloneTrack={cycloneTrack}
                  rainfallData={rainfallMapData}
                  showLayers={showLayers}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          {/* Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="w-5 h-5" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-500" />
                  <Label className="text-sm">AQI Stations</Label>
                </div>
                <Switch 
                  checked={showLayers.aqi}
                  onCheckedChange={(checked) => setShowLayers(prev => ({ ...prev, aqi: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <Label className="text-sm">AQI Heat Map</Label>
                  <Badge variant="secondary" className="text-[10px] px-1">NEW</Badge>
                </div>
                <Switch 
                  checked={showLayers.aqiHeatMap}
                  onCheckedChange={(checked) => setShowLayers(prev => ({ ...prev, aqiHeatMap: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-500" />
                  <Label className="text-sm">Rainfall Zones</Label>
                </div>
                <Switch 
                  checked={showLayers.rainfall}
                  onCheckedChange={(checked) => setShowLayers(prev => ({ ...prev, rainfall: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-red-500" />
                  <Label className="text-sm">Cyclone Path</Label>
                </div>
                <Switch 
                  checked={showLayers.cyclone}
                  onCheckedChange={(checked) => setShowLayers(prev => ({ ...prev, cyclone: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Weather Info */}
          {weatherData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Weather</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold">{weatherData.current.temperature}°C</div>
                <div className="text-muted-foreground">{weatherData.current.condition}</div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                  <div>
                    <div className="text-muted-foreground">Humidity</div>
                    <div className="font-medium">{weatherData.current.humidity}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Wind</div>
                    <div className="font-medium">{weatherData.current.wind_speed} km/h</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AQI Info */}
          {aqiData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Air Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{aqiData.current.aqi}</div>
                  <Badge 
                    variant="secondary" 
                    style={{ backgroundColor: aqiData.current.color }}
                    className="text-white"
                  >
                    {aqiData.current.category}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Primary: {aqiData.current.primary_pollutant}</div>
              </CardContent>
            </Card>
          )}

          {/* Rainfall Trend Chart */}
          {rainfallChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">7-Day Rainfall Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={rainfallChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="rainfall" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;