import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, 
  Map as MapIcon, 
  Navigation, 
  Eye, 
  Video, 
  Thermometer, 
  Wind, 
  Droplets, 
  Activity,
  Maximize2,
  Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MapView = () => {
  const [activeLayer, setActiveLayer] = useState('standard');
  const [showLayers, setShowLayers] = useState(true);

  const layers = [
    { id: 'flood', label: 'Flood Zones', icon: Droplets, color: 'text-blue-500' },
    { id: 'cyclone', label: 'Cyclone Path', icon: Wind, color: 'text-indigo-500' },
    { id: 'aqi', label: 'AQI Heatmap', icon: Activity, color: 'text-yellow-500' },
    { id: 'fire', label: 'Fire Hotspots', icon: Thermometer, color: 'text-red-500' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] relative rounded-xl overflow-hidden border border-border bg-muted/30 group">
      {/* Map Placeholder / Actual Map Container */}
      <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-[#1f2937] flex items-center justify-center">
        <div className="text-center opacity-50">
          <MapIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">Interactive Map Module</p>
          <p className="text-sm">Leaflet / Mapbox Integration Area</p>
        </div>
        
        {/* Mock Map Elements for Visuals */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-red-500/10 rounded-full blur-2xl"></div>
        
        {/* Mock Pins */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
           <div className="relative">
             <div className="w-4 h-4 bg-destructive rounded-full animate-ping absolute"></div>
             <div className="w-4 h-4 bg-destructive rounded-full border-2 border-white relative z-10"></div>
             <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-card px-2 py-1 rounded shadow-lg text-xs font-bold whitespace-nowrap">
               Cyclone Eye
             </div>
           </div>
        </div>
      </div>

      {/* Floating Controls - Top Left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Card className="p-2 flex flex-col gap-2 bg-background/90 backdrop-blur">
          <Button variant="ghost" size="icon" title="Zoom In">
            <span className="text-xl font-bold">+</span>
          </Button>
          <Button variant="ghost" size="icon" title="Zoom Out">
            <span className="text-xl font-bold">-</span>
          </Button>
          <Button variant="ghost" size="icon" title="My Location">
            <Navigation className="w-5 h-5" />
          </Button>
        </Card>
      </div>

      {/* Layer Control - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="w-64 bg-background/90 backdrop-blur p-4 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4" /> Map Layers
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLayers(!showLayers)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          
          {showLayers && (
            <div className="space-y-3">
              {layers.map((layer) => (
                <div key={layer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <layer.icon className={`w-4 h-4 ${layer.color}`} />
                    <Label htmlFor={layer.id} className="text-sm cursor-pointer">{layer.label}</Label>
                  </div>
                  <Switch id={layer.id} />
                </div>
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">3D Buildings</span>
                  <Switch />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* AR/VR Modes - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-full px-6">
          <Video className="w-4 h-4 mr-2" />
          VR Simulation
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-full px-6">
          <Eye className="w-4 h-4 mr-2" />
          AR Danger View
        </Button>
      </div>

      {/* Legend - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3 bg-background/90 backdrop-blur text-xs space-y-2">
          <div className="font-semibold mb-1">Risk Levels</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-destructive"></span>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Safe</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MapView;
