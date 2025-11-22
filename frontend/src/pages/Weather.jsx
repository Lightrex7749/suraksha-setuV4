import React from 'react';
import { motion } from 'framer-motion';
import { 
  CloudRain, 
  Sun, 
  Wind, 
  Droplets, 
  Thermometer, 
  CloudFog,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const Weather = () => {
  const hourlyData = [
    { time: '10 AM', temp: 28 },
    { time: '11 AM', temp: 30 },
    { time: '12 PM', temp: 32 },
    { time: '1 PM', temp: 33 },
    { time: '2 PM', temp: 33 },
    { time: '3 PM', temp: 31 },
    { time: '4 PM', temp: 29 },
  ];

  const forecast = [
    { day: 'Today', icon: CloudRain, temp: '32°', status: 'Rainy' },
    { day: 'Tue', icon: Sun, temp: '34°', status: 'Sunny' },
    { day: 'Wed', icon: CloudFog, temp: '30°', status: 'Cloudy' },
    { day: 'Thu', icon: Wind, temp: '29°', status: 'Windy' },
    { day: 'Fri', icon: Sun, temp: '33°', status: 'Sunny' },
    { day: 'Sat', icon: CloudRain, temp: '28°', status: 'Storm' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weather & AQI Station</h1>
          <p className="text-muted-foreground">Hyper-local weather data and air quality monitoring.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Last updated: Just now
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Weather Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sun className="w-64 h-64" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold opacity-90">Bhubaneswar, Odisha</h2>
                <p className="text-blue-100">Monday, 12 Oct 2024</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none">
                Severe Weather Alert
              </Badge>
            </div>

            <div className="mt-8 flex items-center gap-8">
              <div className="text-8xl font-bold tracking-tighter">
                32°
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-medium">Partly Cloudy</div>
                <div className="text-blue-100">Feels like 38°</div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-blue-100 mb-1">
                  <Wind className="w-4 h-4" /> Wind
                </div>
                <div className="text-xl font-bold">12 km/h</div>
                <div className="text-xs text-blue-200">Direction: NW</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-blue-100 mb-1">
                  <Droplets className="w-4 h-4" /> Humidity
                </div>
                <div className="text-xl font-bold">68%</div>
                <div className="text-xs text-blue-200">Dew point: 24°</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-blue-100 mb-1">
                  <Thermometer className="w-4 h-4" /> Pressure
                </div>
                <div className="text-xl font-bold">1008 hPa</div>
                <div className="text-xs text-blue-200">Steady</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AQI Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              Air Quality Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="440"
                    strokeDashoffset="300"
                    className="text-yellow-500"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-4xl font-bold text-foreground">142</div>
                  <div className="text-sm font-medium text-yellow-500">Moderate</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PM 2.5</span>
                  <span className="font-medium">45 µg/m³</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[45%]"></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PM 10</span>
                  <span className="font-medium">85 µg/m³</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[30%]"></div>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground mt-4">
                💡 <span className="font-medium text-foreground">Health Advice:</span> Sensitive groups should wear masks outdoors.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast & Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              7-Day Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecast.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <day.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{day.day}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-16 text-right">{day.status}</span>
                    <span className="font-bold text-foreground">{day.temp}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Weather;
