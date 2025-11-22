import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";

const alerts = [
  {
    id: 1,
    type: 'critical',
    title: 'Cyclone Warning',
    message: 'Cyclone "Dana" approaching coast. Landfall expected in 24h.',
    time: '10 min ago',
    location: 'Odisha Coast'
  },
  {
    id: 2,
    type: 'warning',
    title: 'High AQI Alert',
    message: 'Air quality index is severe in industrial zones.',
    time: '1 hour ago',
    location: 'Sector 5'
  },
  {
    id: 3,
    type: 'info',
    title: 'Heavy Rainfall',
    message: 'Expected heavy rainfall in the evening. Carry umbrellas.',
    time: '2 hours ago',
    location: 'City Wide'
  }
];

const ActiveAlerts = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Active Alerts
        </h3>
        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`p-3 rounded-lg border-l-4 ${
              alert.type === 'critical' ? 'bg-destructive/10 border-destructive' :
              alert.type === 'warning' ? 'bg-warning/10 border-warning' :
              'bg-blue-500/10 border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <h4 className={`text-sm font-bold ${
                alert.type === 'critical' ? 'text-destructive' :
                alert.type === 'warning' ? 'text-warning' :
                'text-blue-500'
              }`}>
                {alert.title}
              </h4>
              <span className="text-[10px] text-muted-foreground">{alert.time}</span>
            </div>
            <p className="text-xs text-foreground mt-1">{alert.message}</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase">
              <span>📍 {alert.location}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ActiveAlerts;
