import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wind, 
  Droplets, 
  Activity, 
  Sun, 
  AlertTriangle, 
  MapPin, 
  Shield, 
  Navigation,
  Waves,
  Loader,
  MapPinOff
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Helper function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Disaster coordinates (approximate)
const DISASTER_COORDINATES = {
  'Odisha Coast': { lat: 19.8135, lon: 85.7595 },
  'Cuttack': { lat: 20.4625, lon: 85.8830 },
  'Bhubaneswar': { lat: 20.2961, lon: 85.8245 },
  'Kerala': { lat: 10.8505, lon: 76.2711 },
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Bangalore': { lat: 12.9716, lon: 77.5946 },
  'Chennai': { lat: 13.0827, lon: 80.2707 },
  'Kolkata': { lat: 22.5726, lon: 88.3639 },
  'Delhi': { lat: 28.7041, lon: 77.1025 },
  'Gujarat': { lat: 22.2587, lon: 71.1924 }
};

const NearbyDisastersView = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyDisasters, setNearbyDisasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNearbyDisasters();
  }, []);

  const fetchNearbyDisasters = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user location
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Geolocation not supported. Using default location.');
          loadDefaultLocation();
          resolve();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lon: longitude });

            try {
              // Fetch disasters from backend
              const response = await fetch(`${API_URL}/api/disasters`);
              if (!response.ok) throw new Error('Failed to fetch disasters');

              const data = await response.json();
              const disasters = data.disasters || [];

              // Calculate distances and sort
              const disastersWithDistance = disasters.map(disaster => {
                const coords = DISASTER_COORDINATES[disaster.location] || 
                              DISASTER_COORDINATES['Delhi']; // fallback
                const distance = calculateDistance(
                  latitude, 
                  longitude, 
                  coords.lat, 
                  coords.lon
                );
                return { ...disaster, distance };
              }).sort((a, b) => a.distance - b.distance).slice(0, 10);

              setNearbyDisasters(disastersWithDistance);
            } catch (err) {
              console.error('Error fetching disasters:', err);
              setError('Failed to load nearby disasters.');
            }
            resolve();
          },
          (err) => {
            console.error('Geolocation error:', err);
            setError('Unable to access location. Using default location.');
            loadDefaultLocation();
            resolve();
          }
        );
      });
    } catch (err) {
      console.error('Error in fetchNearbyDisasters:', err);
      setError('An error occurred while fetching nearby disasters.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultLocation = async () => {
    try {
      setUserLocation({ lat: 28.7041, lon: 77.1025, city: 'Delhi' }); // Delhi default
      const response = await fetch(`${API_URL}/api/disasters`);
      if (response.ok) {
        const data = await response.json();
        const disasters = (data.disasters || [])
          .map(disaster => {
            const coords = DISASTER_COORDINATES[disaster.location] || 
                          DISASTER_COORDINATES['Delhi'];
            const distance = calculateDistance(28.7041, 77.1025, coords.lat, coords.lon);
            return { ...disaster, distance };
          })
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
        setNearbyDisasters(disasters);
      }
    } catch (err) {
      console.error('Error loading default location:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-primary mr-2" />
        <p>Fetching your location and nearby disasters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {userLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p>Latitude: {userLocation.lat?.toFixed(4)}, Longitude: {userLocation.lon?.toFixed(4)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Nearest Disasters to Your Location</h3>
        <div className="space-y-3">
          {nearbyDisasters.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <MapPinOff className="w-12 h-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-muted-foreground">No nearby disasters found.</p>
              </CardContent>
            </Card>
          ) : (
            nearbyDisasters.map((disaster, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{disaster.title || disaster.disaster_type}</h4>
                        <p className="text-sm text-muted-foreground">{disaster.location}</p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {disaster.distance} km away
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{disaster.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{disaster.date || new Date().toLocaleDateString()}</span>
                      {disaster.casualties && (
                        <span className="font-medium text-destructive">Casualties: {disaster.casualties}</span>
                      )}
                      {disaster.affected_area && (
                        <span className="text-muted-foreground">Area: {disaster.affected_area}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={fetchNearbyDisasters}
      >
        <Navigation className="w-4 h-4 mr-2" />
        Refresh Location & Nearby Disasters
      </Button>
    </div>
  );
};

const DisasterCard = ({ title, value, subtext, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-6 flex items-center gap-4">
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <h4 className="text-2xl font-bold">{value}</h4>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </div>
    </CardContent>
  </Card>
);

const CycloneView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DisasterCard 
        title="Wind Speed" 
        value="120 km/h" 
        subtext="Gusting to 145 km/h" 
        icon={Wind} 
        color="bg-indigo-500" 
      />
      <DisasterCard 
        title="Distance" 
        value="450 km" 
        subtext="From Paradeep Coast" 
        icon={Navigation} 
        color="bg-blue-500" 
      />
      <DisasterCard 
        title="Landfall" 
        value="14h 30m" 
        subtext="Expected Time" 
        icon={AlertTriangle} 
        color="bg-destructive" 
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader>
          <CardTitle>Projected Path</CardTitle>
          <CardDescription>Live tracking of Cyclone 'Dana'</CardDescription>
        </CardHeader>
        <div className="h-[400px] bg-muted/30 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Openstreetmap_logo.svg/1200px-Openstreetmap_logo.svg.png')] opacity-10 bg-cover bg-center"></div>
          <div className="relative w-full h-full">
             {/* Mock Path */}
             <svg className="w-full h-full absolute inset-0 pointer-events-none">
               <path d="M 100 400 Q 300 300 500 100" stroke="red" strokeWidth="4" fill="none" strokeDasharray="10 5" className="animate-pulse" />
               <circle cx="500" cy="100" r="20" fill="rgba(239, 68, 68, 0.2)" />
               <circle cx="500" cy="100" r="5" fill="red" />
             </svg>
             <div className="absolute top-1/4 right-1/4 bg-card p-2 rounded shadow-lg text-xs">
               <p className="font-bold">Expected Landfall</p>
               <p>Puri, Odisha</p>
             </div>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Impact Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Structural Damage Risk</span>
                <span className="font-bold text-destructive">High</span>
              </div>
              <Progress value={85} className="h-2 bg-muted" indicatorClassName="bg-destructive" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Power Outage Probability</span>
                <span className="font-bold text-orange-500">90%</span>
              </div>
              <Progress value={90} className="h-2 bg-muted" indicatorClassName="bg-orange-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Communication Disruption</span>
                <span className="font-bold text-yellow-500">Moderate</span>
              </div>
              <Progress value={60} className="h-2 bg-muted" indicatorClassName="bg-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Evacuation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Shelters Open</span>
                <Badge variant="outline">42 Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">People Evacuated</span>
                <span className="font-bold">12,450</span>
              </div>
              <Button className="w-full mt-2">Find Nearest Shelter</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const FloodView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DisasterCard 
        title="Water Level" 
        value="24.5 ft" 
        subtext="+2ft above danger mark" 
        icon={Waves} 
        color="bg-blue-500" 
      />
      <DisasterCard 
        title="Rainfall" 
        value="120 mm" 
        subtext="Last 24 hours" 
        icon={Droplets} 
        color="bg-cyan-500" 
      />
      <DisasterCard 
        title="Affected Areas" 
        value="14 Zones" 
        subtext="Critical Alert" 
        icon={MapPin} 
        color="bg-orange-500" 
      />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>River Level Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Interactive River Gauge Graph Placeholder</p>
      </CardContent>
    </Card>
  </div>
);

const EarthquakeView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DisasterCard 
        title="Magnitude" 
        value="4.2" 
        subtext="Richter Scale" 
        icon={Activity} 
        color="bg-orange-500" 
      />
      <DisasterCard 
        title="Depth" 
        value="10 km" 
        subtext="Shallow" 
        icon={Navigation} 
        color="bg-yellow-500" 
      />
      <DisasterCard 
        title="Epicenter" 
        value="40km NE" 
        subtext="From City Center" 
        icon={MapPin} 
        color="bg-red-500" 
      />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Recent Tremors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                  4.{i}
                </div>
                <div>
                  <p className="font-medium">Near Bhubaneswar</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <Badge variant="outline">Moderate</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const Disasters = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disaster Management</h1>
          <p className="text-muted-foreground">Real-time monitoring and response coordination.</p>
        </div>
      </div>

      <Tabs defaultValue="nearby" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[500px] mb-6">
          <TabsTrigger value="nearby" className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Nearby</span>
          </TabsTrigger>
          <TabsTrigger value="cyclone">Cyclone</TabsTrigger>
          <TabsTrigger value="flood">Flood</TabsTrigger>
          <TabsTrigger value="earthquake">Quake</TabsTrigger>
          <TabsTrigger value="heat">Heat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nearby">
          <NearbyDisastersView />
        </TabsContent>
        <TabsContent value="cyclone">
          <CycloneView />
        </TabsContent>
        <TabsContent value="flood">
          <FloodView />
        </TabsContent>
        <TabsContent value="earthquake">
          <EarthquakeView />
        </TabsContent>
        <TabsContent value="heat">
          <div className="flex items-center justify-center h-64 bg-muted/30 rounded-xl border border-dashed">
            <div className="text-center">
              <Sun className="w-12 h-12 mx-auto text-orange-500 mb-4" />
              <h3 className="text-lg font-medium">Heatwave Module</h3>
              <p className="text-muted-foreground">Data currently syncing...</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Disasters;
