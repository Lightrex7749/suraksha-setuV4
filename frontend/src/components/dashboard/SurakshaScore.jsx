import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

const SurakshaScore = ({ score = 85 }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  let color = '#10b981'; // Green
  let status = 'Safe';
  let Icon = ShieldCheck;

  if (score < 50) {
    color = '#ef4444'; // Red
    status = 'Critical';
    Icon = ShieldAlert;
  } else if (score < 80) {
    color = '#f59e0b'; // Orange
    status = 'Caution';
    Icon = Shield;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className="w-24 h-24" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Suraksha Score
      </h3>

      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={180}
              endAngle={0}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              <Cell key="score" fill={color} cornerRadius={10} />
              <Cell key="remaining" fill="hsl(var(--muted))" cornerRadius={10} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
          <span className="text-4xl font-bold text-foreground">{score}</span>
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{status}</span>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trend</span>
          <span className="text-green-500 font-medium">↑ 2.4%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Score dropped slightly due to high AQI levels in your sector.
        </p>
      </div>
    </motion.div>
  );
};

export default SurakshaScore;
