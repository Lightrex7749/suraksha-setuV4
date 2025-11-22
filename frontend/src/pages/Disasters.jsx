import React from 'react';
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
  Waves
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

      <Tabs defaultValue="cyclone" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px] mb-6">
          <TabsTrigger value="cyclone">Cyclone</TabsTrigger>
          <TabsTrigger value="flood">Flood</TabsTrigger>
          <TabsTrigger value="earthquake">Quake</TabsTrigger>
          <TabsTrigger value="heat">Heat</TabsTrigger>
        </TabsList>
        
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
