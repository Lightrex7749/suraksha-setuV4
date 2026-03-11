import React, { useState, useEffect } from 'react';
import EnhancedAIChatInterface from '@/components/dashboard/EnhancedAIChatInterface';
import SurakshaScore from '@/components/dashboard/SurakshaScore';
import ActiveAlerts from '@/components/dashboard/ActiveAlerts';
import DisasterTimeline from '@/components/dashboard/DisasterTimeline';
import ImpactStats from '@/components/dashboard/ImpactStats';
import LiveAQIChart from '@/components/dashboard/LiveAQIChart';
import LocationSelector from '@/components/location/LocationSelector';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import { SectionErrorBoundary } from '@/components/errors/ErrorBoundary';
import { SkeletonCard, SkeletonDashboard } from '@/components/ui/skeleton-loaders';
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const Dashboard = () => {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState([]);
  const [score, setScore] = useState(82);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = () => {
    // Static safety recommendations — no weather API dependency
    setRecommendations([
      {
        icon: '🛡️',
        color: 'bg-indigo-500/20 text-indigo-600',
        text: 'Keep your emergency kit stocked with water, first-aid, and a flashlight.'
      },
      {
        icon: '📱',
        color: 'bg-purple-500/20 text-purple-600',
        text: 'Enable push notifications for real-time disaster alerts in your area.'
      },
      {
        icon: '🗺️',
        color: 'bg-blue-500/20 text-blue-600',
        text: 'Know your nearest evacuation route and safe shelter location.'
      },
      {
        icon: '🔋',
        color: 'bg-green-500/20 text-green-600',
        text: 'Ensure your phone and power bank are charged for emergencies.'
      },
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadRecommendations();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header Section with Better Gradient */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 rounded-2xl border-2 border-indigo-100 dark:border-gray-800 shadow-lg backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('dashboard.commandCenter')}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            {t('dashboard.commandSubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:scale-105 transition-transform shadow-sm border-2"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('dashboard.refresh')}
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform shadow-sm border-2">
            <Share2 className="w-4 h-4 mr-2" />
            {t('dashboard.share')}
          </Button>
          <Button size="sm" className="hover:scale-105 transition-transform shadow-md bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700">
            <Download className="w-4 h-4 mr-2" />
            {t('dashboard.export')}
          </Button>
        </div>
      </motion.div>

      {/* Enhanced AI Chat Interface - Full Width with Modern Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <EnhancedAIChatInterface />
      </motion.div>

      {/* Top Row: Score and Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { Component: SurakshaScore, props: { score }, delay: 0.3 },
          { Component: ActiveAlerts, props: {}, delay: 0.35 },
        ].map(({ Component, props, delay }, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
          >
            <Component {...props} />
          </motion.div>
        ))}
      </div>

      {/* Middle Row: Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <ImpactStats />
      </motion.div>

      {/* Bottom Row: Timeline, AQI, Location & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <DisasterTimeline />
          <LiveAQIChart />
        </motion.div>
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          {/* Location Selector */}
          <LocationSelector />

          {/* Push Notifications */}
          <NotificationSettings />

          {/* AI Recommendations with Enhanced UI */}
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 border-purple-200 dark:border-purple-900/30 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-600 via-pink-600 to-blue-600 rounded-full"></div>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">AI Recommendations</span>
            </h3>
            {recommendations.length > 0 ? (
              <ul className="space-y-2.5">
                {recommendations.map((rec, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05, type: "spring", stiffness: 200 }}
                    className="flex gap-3 items-start p-3 rounded-xl bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 transition-all cursor-pointer group shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700"
                  >
                    <span className={`${rec.color} rounded-xl p-2.5 text-base group-hover:scale-110 transition-transform shadow-sm min-w-[40px] flex items-center justify-center`}>
                      {rec.icon}
                    </span>
                    <span className="text-[13px] flex-1 pt-1.5 leading-relaxed">{rec.text}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse flex items-center gap-2 p-4">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="ml-2">Loading recommendations...</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
