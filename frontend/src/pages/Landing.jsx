import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShieldAlert, AlertTriangle, Users, Zap, MapPin, Smartphone, 
  TrendingUp, Globe, BookOpen, Beaker, ArrowRight, MessageCircle,
  ChevronDown, Bell, BarChart3, Cloud, Radio, Map, Target,
  Cpu, Database, Languages, Waves, Wind, Droplets, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-slate-50 to-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-purple-600 p-3 rounded-xl">
              <img src="/main_logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Suraksha Setu
            </span>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/app/dashboard')}
              className="bg-primary hover:bg-primary/90"
            >
              Launch Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Problem Statement */}
      <section className="relative overflow-hidden py-20 px-4 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 animate-gradient"></div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div 
            className="text-center space-y-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Problem Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Solving India's Fragmented Disaster Data Crisis</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                  One Platform.
                </span>
                <br />
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                  Every Disaster Alert.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Disaster data in India is <span className="text-destructive font-semibold">scattered across IMD, ISRO, NDMA, CPCB</span> — making it 
                <span className="italic"> technical, fragmented, and hard to understand</span>. 
                <span className="font-bold text-foreground"> Suraksha Setu unifies it all</span> into simple, 
                <span className="text-primary font-semibold"> multilingual, PIN-code based alerts</span> for everyone.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4 flex-wrap">
              <Button 
                size="lg"
                onClick={() => navigate('/app/dashboard')}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-lg px-8 shadow-lg shadow-blue-600/30 animate-glow"
              >
                Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/app/dashboard')}
                className="text-lg px-8 border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
              >
                <MessageCircle className="mr-2 w-5 h-5" /> Try AI Assistant
              </Button>
            </div>

            {/* Impact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-4xl mx-auto">
              <Card className="border-2 hover:shadow-lg hover:border-blue-300 transition-all animate-float">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">4+</div>
                  <p className="text-sm text-muted-foreground mt-1">Data Sources Unified</p>
                  <p className="text-xs text-muted-foreground">IMD·ISRO·NDMA·CPCB</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg hover:border-purple-300 transition-all animate-float" style={{animationDelay: '0.1s'}}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-cyan-500 to-blue-600 bg-clip-text text-transparent">&lt;5s</div>
                  <p className="text-sm text-muted-foreground mt-1">Alert Latency</p>
                  <p className="text-xs text-muted-foreground">Real-time fusion</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg hover:border-pink-300 transition-all animate-float" style={{animationDelay: '0.2s'}}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-purple-500 to-pink-600 bg-clip-text text-transparent">10+</div>
                  <p className="text-sm text-muted-foreground mt-1">Languages</p>
                  <p className="text-xs text-muted-foreground">Hindi·Tamil·Bhojpuri</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg hover:border-green-300 transition-all animate-float" style={{animationDelay: '0.3s'}}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent">100%</div>
                  <p className="text-sm text-muted-foreground mt-1">PIN-code Aware</p>
                  <p className="text-xs text-muted-foreground">Hyper-local alerts</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem - Impact of Fragmentation */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">The Problem: Scattered Data, Real Consequences</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Impact of Fragmentation</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Disaster and safety data in India is scattered across <span className="font-bold text-foreground">IMD, ISRO MOSDAC, NDMA, CPCB</span>. 
              The information is <span className="text-destructive font-semibold">technical, fragmented, and hard to understand</span>.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-2xl">Citizens & Farmers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-destructive">Confusion + missed warnings.</span> 
                    {' '}Technical jargon and scattered portals make it nearly impossible to get timely, 
                    understandable alerts, costing lives and crops.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-purple-600">No accessible, organized data → slower innovation.</span>
                    {' '}Lack of structured datasets prevents students from learning and building 
                    disaster management solutions.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Beaker className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl">Scientists</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-blue-600">Time wasted cleaning & combining data → delayed research.</span>
                    {' '}Researchers spend hours merging raw data from multiple fragmented sources instead of 
                    focusing on analysis and innovation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeInUp} className="mt-12 text-center">
            <p className="text-lg font-bold text-destructive">
              Result → delays, confusion, missed opportunities, costing lives, crops, and awareness.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-background">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <ShieldAlert className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Our Solution</span>
            </div>
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Suraksha Setu
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A <span className="font-bold text-foreground">unified disaster & safety platform</span> converting 
              <span className="text-primary font-semibold"> complex data</span> into 
              <span className="text-purple-600 font-semibold"> simple, actionable intelligence</span> for everyone.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mt-10">
            <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl">🎯 Citizen-First Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-green-600">Local language, PIN code-based real-time warnings</span> via app, WhatsApp, and SMS.
                    Get disaster alerts in <span className="font-bold">Hindi, Tamil, Bhojpuri, English</span> for your exact location.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl">📚 Student Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-purple-600">Interactive dashboards and gamified learning</span> modules.
                    Structured datasets for projects, quizzes on disaster management, educational resources designed for innovation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Beaker className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl">🔬 Scientist Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-blue-600">Research-ready anomaly reports and datasets</span> for efficient analysis.
                    Clean, merged data from IMD, ISRO, NDMA, CPCB in CSV/PDF exports, ML-powered outlier detection.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.4 }}>
              <Card className="border-2 h-full hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-2xl">🗺️ AR-Lite Overlays</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-orange-600">Visualize flood or cyclone zones directly on mobile maps</span> with spatial accuracy.
                    See evacuation routes, safe zones, and disaster impact areas in augmented reality overlays.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Comprehensive Features</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Built for Every Indian</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              From multilingual AI to real-time alerts – every feature designed to make disaster data accessible and actionable.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Languages className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Multilingual AI</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    NLU with dialect support (Hindi, Tamil, Bhojpuri, English) for text + voice queries
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.15 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">PIN-Code Alerts</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Hyper-local hazard detection with push notifications across app, WhatsApp, SMS
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Real-Time Fusion</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Aggregates IMD, ISRO, NDMA, CPCB data streams with &lt;5 second latency
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.25 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg">AI Summarization</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    LLM-driven simplification of complex bulletins into citizen-friendly insights
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Live Dashboards</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Interactive rainfall trends, AQI heatmaps, cyclone path projections, seismic alerts
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.35 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Anomaly Detection</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    ML-powered outlier identification for proactive disaster prevention and early warnings
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.4 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Map className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h3 className="font-semibold text-lg">AR-Lite Maps</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Overlay flood/cyclone zones on mobile maps with evacuation routes and safe zones
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ delay: 0.45 }}>
              <Card className="border-2 h-full hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Database className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Custom Reports</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Export clean, research-ready data in PDF/CSV formats for scientists and students
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Stay Safe, Stay Informed
              </span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of Indians using Suraksha Setu for real-time disaster alerts, safety intelligence, 
              and actionable insights in your own language.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg"
                onClick={() => navigate('/app/dashboard')}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white text-lg px-8 shadow-lg"
              >
                Launch Dashboard <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => {
                  navigate('/app/dashboard');
                  // Could add a query param to auto-focus chatbot: ?chat=true
                }}
                className="border-2 text-lg px-8 hover:bg-primary/5"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                Try AI Assistant
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Suraksha Setu
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A unified disaster and safety intelligence platform converting complex data from IMD, ISRO, NDMA, 
                and CPCB into simple, actionable alerts for every Indian.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><button onClick={() => navigate('/app/dashboard')} className="hover:text-primary transition-colors">Dashboard</button></li>
                <li><button onClick={() => navigate('/app/alerts')} className="hover:text-primary transition-colors">Alerts</button></li>
                <li><button onClick={() => navigate('/app/weather')} className="hover:text-primary transition-colors">Weather</button></li>
                <li><button onClick={() => navigate('/app/disasters')} className="hover:text-primary transition-colors">Disasters</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><button onClick={() => navigate('/app/student')} className="hover:text-primary transition-colors">Student Portal</button></li>
                <li><button onClick={() => navigate('/app/scientist')} className="hover:text-primary transition-colors">Scientist Portal</button></li>
                <li><button onClick={() => navigate('/app/community')} className="hover:text-primary transition-colors">Community</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 text-center text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              © 2026 Suraksha Setu. Building a safer tomorrow, today.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;