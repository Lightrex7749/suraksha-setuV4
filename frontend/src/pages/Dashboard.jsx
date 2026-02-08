import React, { useState, useEffect } from 'react';
import AIChatInterface from '@/components/dashboard/AIChatInterface';
import SurakshaScore from '@/components/dashboard/SurakshaScore';
import WeatherSummary from '@/components/dashboard/WeatherSummary';
import ActiveAlerts from '@/components/dashboard/ActiveAlerts';
import DisasterTimeline from '@/components/dashboard/DisasterTimeline';
import ImpactStats from '@/components/dashboard/ImpactStats';
import LiveAQIChart from '@/components/dashboard/LiveAQIChart';
import LocationSelector from '@/components/location/LocationSelector';
import { Button } from "@/components/ui/button";
import { Download, Share2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api';

const Dashboard = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [score, setScore] = useState(78);

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
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* AI Chat Interface - Prominent Top Section */}
      <AIChatInterface />

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
        <SurakshaScore score={score} />
        <WeatherSummary />
        <ActiveAlerts />
      </div>

      {/* Middle Row: Stats */}
      <ImpactStats />

      {/* Bottom Row: Timeline, AQI, Location & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <DisasterTimeline />
           {/* Live AQI Trend Chart */}
           <LiveAQIChart />
        </div>
        <div className="space-y-6">
          {/* Location Selector */}
          <LocationSelector />
          
          {/* AI Recommendations */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">AI Recommendations</h3>
            {recommendations.length > 0 ? (
              <ul className="space-y-3 text-sm">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className={`${rec.color} rounded-full p-1 mt-0.5 text-xs`}>{rec.icon}</span>
                    <span>{rec.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">Loading recommendations...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
