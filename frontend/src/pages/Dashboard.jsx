import React, { useState, useEffect } from 'react';
import AIChatInterface from '@/components/dashboard/AIChatInterface';
import SurakshaScore from '@/components/dashboard/SurakshaScore';
import WeatherSummary from '@/components/dashboard/WeatherSummary';
import ActiveAlerts from '@/components/dashboard/ActiveAlerts';
import DisasterTimeline from '@/components/dashboard/DisasterTimeline';
import ImpactStats from '@/components/dashboard/ImpactStats';
import LiveAQIChart from '@/components/dashboard/LiveAQIChart';
import LocationSelector from '@/components/location/LocationSelector';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const Dashboard = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [score, setScore] = useState(78);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const weatherRes = await axios.get(`${API_URL}/weather/auto-detect`);
        const weather = weatherRes.data.current;
        
        const recs = [];
        
        // Weather-based recommendations
        if (weather.rain > 0 || weather.humidity > 80) {
          recs.push({
            icon: '☔',
            color: 'bg-blue-500/20 text-blue-600',
            text: `${weather.rain > 0 ? 'Rain expected' : 'High humidity'} - carry an umbrella.`
          });
        }
        
        if (weather.temperature > 35) {
          recs.push({
            icon: '🌡️',
            color: 'bg-red-500/20 text-red-600',
            text: `Extreme heat at ${weather.temperature}°C - stay hydrated and avoid sun exposure.`
          });
        } else if (weather.temperature < 10) {
          recs.push({
            icon: '🧥',
            color: 'bg-blue-500/20 text-blue-600',
            text: `Very cold at ${weather.temperature}°C - wear warm layers.`
          });
        }
        
        if (weather.wind_speed > 30) {
          recs.push({
            icon: '💨',
            color: 'bg-yellow-500/20 text-yellow-600',
            text: `Strong winds at ${weather.wind_speed} km/h - secure loose items.`
          });
        }
        
        // Default recommendations if none generated
        if (recs.length === 0) {
          recs.push(
            {
              icon: '✅',
              color: 'bg-green-500/20 text-green-600',
              text: 'Weather conditions are favorable today.'
            },
            {
              icon: '🔋',
              color: 'bg-primary/20 text-primary',
              text: 'Check your emergency kit and ensure batteries are fresh.'
            }
          );
        }
        
        recs.push({
          icon: '📱',
          color: 'bg-purple-500/20 text-purple-600',
          text: 'Keep your phone charged for emergency alerts.'
        });
        
        setRecommendations(recs.slice(0, 4));
        
        // Calculate score based on conditions
        let newScore = 85;
        if (weather.temperature > 35 || weather.temperature < 5) newScore -= 15;
        if (weather.wind_speed > 40) newScore -= 10;
        if (weather.rain > 50) newScore -= 10;
        setScore(Math.max(30, Math.min(100, newScore)));
        
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([
          {
            icon: '💡',
            color: 'bg-primary/20 text-primary',
            text: 'Stay prepared with your emergency kit.'
          },
          {
            icon: '📱',
            color: 'bg-blue-500/20 text-blue-600',
            text: 'Keep emergency contacts handy.'
          }
        ]);
      }
    };
    
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* AI Chat Interface - Prominent Top Section with Animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AIChatInterface />
      </motion.div>

      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border-2 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Real-time disaster management & safety overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:scale-105 transition-transform shadow-md"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform shadow-md">
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </Button>
          <Button size="sm" className="hover:scale-105 transition-transform shadow-md bg-gradient-to-r from-blue-600 to-purple-600">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </motion.div>

      {/* Top Row: Score, Weather, Alerts with Stagger Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[SurakshaScore, WeatherSummary, ActiveAlerts].map((Component, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          >
            {index === 0 ? <Component score={score} /> : <Component />}
          </motion.div>
        ))}
      </div>

      {/* Middle Row: Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ImpactStats />
      </motion.div>

      {/* Bottom Row: Timeline, AQI, Location & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
           <DisasterTimeline />
           <LiveAQIChart />
        </motion.div>
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {/* Location Selector */}
          <LocationSelector />
          
          {/* Push Notifications */}
          <NotificationSettings />
          
          {/* AI Recommendations with Enhanced UI */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-blue-600 rounded"></div>
              AI Recommendations
            </h3>
            {recommendations.length > 0 ? (
              <ul className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1 }}
                    className="flex gap-3 items-start p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 transition-all cursor-pointer group"
                  >
                    <span className={`${rec.color} rounded-full p-2 text-lg group-hover:scale-110 transition-transform shadow-md`}>
                      {rec.icon}
                    </span>
                    <span className="text-sm flex-1 pt-1.5">{rec.text}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                Loading recommendations...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
