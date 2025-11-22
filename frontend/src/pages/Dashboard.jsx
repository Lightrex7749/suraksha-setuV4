import React from 'react';
import SurakshaScore from '@/components/dashboard/SurakshaScore';
import WeatherSummary from '@/components/dashboard/WeatherSummary';
import ActiveAlerts from '@/components/dashboard/ActiveAlerts';
import DisasterTimeline from '@/components/dashboard/DisasterTimeline';
import ImpactStats from '@/components/dashboard/ImpactStats';
import { Button } from "@/components/ui/button";
import { Download, Share2 } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground">Real-time disaster management & safety overview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Top Row: Score, Weather, Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SurakshaScore score={78} />
        <WeatherSummary />
        <ActiveAlerts />
      </div>

      {/* Middle Row: Stats */}
      <ImpactStats />

      {/* Bottom Row: Timeline & Map Preview (Placeholder for now) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <DisasterTimeline />
           {/* We can add a chart here later */}
           <div className="mt-6 bg-card border border-border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
             [Live Radar / Graph Placeholder]
           </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">AI Recommendations</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2 items-start">
              <span className="bg-primary/20 text-primary rounded-full p-1 mt-0.5">💡</span>
              <span>Carry an umbrella, 80% chance of rain at 4 PM.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="bg-warning/20 text-warning rounded-full p-1 mt-0.5">⚠️</span>
              <span>Avoid Sector 5 due to high AQI levels.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="bg-destructive/20 text-destructive rounded-full p-1 mt-0.5">🚨</span>
              <span>Check emergency kit batteries.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
