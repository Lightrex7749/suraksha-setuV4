import React from 'react';
import { motion } from 'framer-motion';
import { Users, Home, Zap, Activity } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <h4 className="text-2xl font-bold text-foreground">{value}</h4>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  </div>
);

const ImpactStats = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <StatCard 
        icon={Users} 
        label="Affected People" 
        value="1,240" 
        subtext="In flood prone zones"
        color="bg-orange-500"
      />
      <StatCard 
        icon={Home} 
        label="Shelters Active" 
        value="12" 
        subtext="Capacity: 85%"
        color="bg-green-500"
      />
      <StatCard 
        icon={Zap} 
        label="Power Outages" 
        value="3" 
        subtext="Restoration in 2h"
        color="bg-yellow-500"
      />
      <StatCard 
        icon={Activity} 
        label="Emergency Calls" 
        value="45" 
        subtext="Last 24 hours"
        color="bg-red-500"
      />
    </motion.div>
  );
};

export default ImpactStats;
