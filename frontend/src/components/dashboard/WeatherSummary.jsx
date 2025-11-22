import React from 'react';
import { CloudRain, Wind, Droplets, Sun, Thermometer } from 'lucide-react';
import { motion } from 'framer-motion';

const WeatherSummary = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6 shadow-sm"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-500" />
            Live Weather
          </h3>
          <p className="text-sm text-muted-foreground">Sector 4, Bhubaneswar</p>
        </div>
        <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">
          LIVE
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background rounded-full shadow-sm">
            <Sun className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <span className="text-4xl font-bold text-foreground">32°C</span>
            <p className="text-sm text-muted-foreground">Partly Cloudy</p>
          </div>
        </div>
        <div className="text-right">
            <div className="text-sm font-medium text-foreground">AQI</div>
            <div className="text-2xl font-bold text-yellow-500">142</div>
            <div className="text-xs text-muted-foreground">Moderate</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">12 km/h</span>
          <span className="text-[10px] text-muted-foreground">Wind</span>
        </div>
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">68%</span>
          <span className="text-[10px] text-muted-foreground">Humidity</span>
        </div>
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">1008 hPa</span>
          <span className="text-[10px] text-muted-foreground">Pressure</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherSummary;
