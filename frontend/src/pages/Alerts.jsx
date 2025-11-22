import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Wind, 
  Droplets, 
  Thermometer, 
  Info, 
  CheckCircle2, 
  XCircle,
  Filter,
  MapPin,
  Share2,
  Volume2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const AlertCard = ({ alert }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-destructive bg-destructive/5';
      case 'high': return 'border-orange-500 bg-orange-500/5';
      case 'moderate': return 'border-yellow-500 bg-yellow-500/5';
      default: return 'border-blue-500 bg-blue-500/5';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'cyclone': return Wind;
      case 'flood': return Droplets;
      case 'heat': return Thermometer;
      default: return AlertTriangle;
    }
  };

  const Icon = getIcon(alert.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative border-l-4 rounded-r-lg p-4 mb-4 bg-card shadow-sm hover:shadow-md transition-all ${getSeverityColor(alert.severity)}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className={`p-2 rounded-full ${
            alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 
            alert.severity === 'high' ? 'bg-orange-500/10 text-orange-500' : 
            'bg-blue-500/10 text-blue-500'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-foreground">{alert.title}</h4>
              {alert.severity === 'critical' && (
                <span className="animate-pulse px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground">
                  LIVE
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {alert.location}
              </span>
              <span>{alert.time}</span>
              <span className="font-medium text-foreground">Impact: {alert.impact}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* AI Insight Section */}
      <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border/50 text-sm">
        <div className="flex items-center gap-2 mb-1 text-primary font-medium">
          <span className="text-lg">🤖</span> AI Insight
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {alert.aiInsight}
        </p>
      </div>
    </motion.div>
  );
};

const Alerts = () => {
  const alertsData = [
    {
      id: 1,
      type: 'cyclone',
      severity: 'critical',
      title: 'Cyclone Dana Landfall Imminent',
      message: 'Wind speeds reaching 120km/h. Evacuate coastal areas immediately.',
      location: 'Odisha Coast, Sector 4',
      time: '10 mins ago',
      impact: 'High Risk to Life',
      aiInsight: 'Based on current trajectory, landfall is expected at 14:00 IST. Structural damage to kutcha houses is 95% probable. Recommended action: Move to Shelter #42.'
    },
    {
      id: 2,
      type: 'flood',
      severity: 'high',
      title: 'Flash Flood Warning',
      message: 'River Mahanadi water levels rising rapidly due to upstream release.',
      location: 'Cuttack Lowlands',
      time: '45 mins ago',
      impact: 'Road Blockages',
      aiInsight: 'Water levels have risen 2ft in the last hour. Main bridge access may be cut off by 18:00 IST. Avoid Route 5.'
    },
    {
      id: 3,
      type: 'heat',
      severity: 'moderate',
      title: 'Heatwave Alert',
      message: 'Temperature expected to cross 42°C today.',
      location: 'City Wide',
      time: '2 hours ago',
      impact: 'Health Risk',
      aiInsight: 'UV Index is 9 (Very High). Dehydration risk is elevated for elderly and children. Stay indoors between 11 AM and 3 PM.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts Center</h1>
          <p className="text-muted-foreground">Real-time emergency notifications and AI-driven insights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          <Button variant="destructive" className="gap-2">
            <AlertTriangle className="w-4 h-4" /> Report Emergency
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Alerts Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="warning">Warning</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {alertsData.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </TabsContent>
            <TabsContent value="critical">
              {alertsData.filter(a => a.severity === 'critical').map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Stats & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Severity Meter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-destructive font-medium">Critical</span>
                    <span>12%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive w-[12%]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-500 font-medium">High</span>
                    <span>28%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[28%]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-500 font-medium">Info</span>
                    <span>60%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[60%]"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Safety Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 items-start text-sm">
                <span className="bg-background p-1 rounded text-xs font-bold border">1</span>
                <p className="text-muted-foreground">Keep emergency kit ready with dry food & water.</p>
              </div>
              <div className="flex gap-3 items-start text-sm">
                <span className="bg-background p-1 rounded text-xs font-bold border">2</span>
                <p className="text-muted-foreground">Charge all communication devices immediately.</p>
              </div>
              <div className="flex gap-3 items-start text-sm">
                <span className="bg-background p-1 rounded text-xs font-bold border">3</span>
                <p className="text-muted-foreground">Identify nearest shelter location on map.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
