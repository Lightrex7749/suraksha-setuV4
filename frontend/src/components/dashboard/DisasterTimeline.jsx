import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';

const events = [
  { time: '08:00 AM', title: 'Morning Forecast', type: 'normal' },
  { time: '10:30 AM', title: 'AQI Spike Alert', type: 'warning' },
  { time: '02:00 PM', title: 'Cyclone Update', type: 'critical' },
  { time: '04:00 PM', title: 'Rain Expected', type: 'info' },
  { time: '08:00 PM', title: 'Night Patrol', type: 'normal' },
];

const DisasterTimeline = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-xl p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Today's Timeline
      </h3>
      
      <div className="relative">
        {/* Line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2 z-0"></div>
        
        <div className="flex justify-between relative z-10 overflow-x-auto pb-4 custom-scrollbar gap-4">
          {events.map((event, index) => (
            <div key={index} className="flex flex-col items-center min-w-[100px] text-center">
              <div className={`w-4 h-4 rounded-full border-4 border-background mb-2 ${
                event.type === 'critical' ? 'bg-destructive' :
                event.type === 'warning' ? 'bg-warning' :
                event.type === 'info' ? 'bg-blue-500' :
                'bg-muted-foreground'
              }`}></div>
              <span className="text-xs font-bold text-foreground">{event.time}</span>
              <span className="text-[10px] text-muted-foreground mt-1">{event.title}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default DisasterTimeline;
