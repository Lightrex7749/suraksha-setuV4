import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Trophy,
  Gamepad2,
  Video,
  BrainCircuit,
  Star,
  CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Quiz from "@/components/student/Quiz";

const StudentPortal = () => {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showQuizzes, setShowQuizzes] = useState(false);

  const quizCategories = [
    {
      id: 'earthquake',
      title: 'Earthquake Safety',
      description: 'Learn how to stay safe during earthquakes',
      icon: '🌍',
      color: 'from-red-500 to-orange-500',
      difficulty: 'Medium',
      questions: 5,
      xp: 100
    },
    {
      id: 'flood',
      title: 'Flood Preparedness',
      description: 'Master flood safety and evacuation',
      icon: '🌊',
      color: 'from-blue-500 to-cyan-500',
      difficulty: 'Easy',
      questions: 5,
      xp: 80
    },
    {
      id: 'cyclone',
      title: 'Cyclone Safety',
      description: 'Understand tropical cyclones and protection',
      icon: '🌪️',
      color: 'from-purple-500 to-indigo-500',
      difficulty: 'Medium',
      questions: 5,
      xp: 100
    },
    {
      id: 'fire',
      title: 'Fire Safety',
      description: 'Critical fire prevention and escape knowledge',
      icon: '🔥',
      color: 'from-orange-500 to-red-600',
      difficulty: 'Easy',
      questions: 5,
      xp: 80
    }
  ];

  if (activeQuiz) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setActiveQuiz(null)}
          className="mb-4"
        >
          ← Back to Portal
        </Button>
        <Quiz category={activeQuiz} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Learning Zone</h1>
          <p className="text-muted-foreground">Learn about disaster safety through games and interactive lessons.</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-900/50">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span className="font-bold text-yellow-700 dark:text-yellow-500">Level 5 Scout</span>
          <span className="text-sm text-yellow-600/80 ml-2">2,450 XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Learning Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Featured Lesson */}
          <Card className="overflow-hidden border-primary/20 shadow-lg">
            <div className="h-48 bg-gradient-to-r from-blue-500 to-cyan-500 relative p-6 flex flex-col justify-end text-white">
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                Featured Module
              </div>
              <h2 className="text-3xl font-bold mb-2">Cyclone Survival 101</h2>
              <p className="text-blue-100 max-w-lg">Master the art of preparing your home and family for an approaching cyclone. Complete this module to earn the "Storm Chaser" badge.</p>
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <div className="flex items-center gap-4">
                    <Progress value={65} className="w-64 h-2" />
                    <span className="text-sm font-bold">65%</span>
                  </div>
                </div>
                <Button size="lg" className="gap-2">
                  <Gamepad2 className="w-5 h-5" /> Continue
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-muted/50 border text-center hover:bg-muted transition-colors cursor-pointer">
                  <Video className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Video Lesson</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center hover:bg-muted transition-colors cursor-pointer">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Reading</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border text-center hover:bg-muted transition-colors cursor-pointer">
                  <BrainCircuit className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Quiz</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AR Classroom Teaser */}
          <Card className="bg-black text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1617802690992-15d93263d3a9?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-40"></div>
            <CardContent className="relative z-10 p-8 flex flex-col items-center text-center space-y-4">
              <Badge variant="outline" className="text-white border-white/50">New Feature</Badge>
              <h3 className="text-2xl font-bold">Virtual Disaster Classroom</h3>
              <p className="text-gray-300 max-w-md">Experience a simulated flood scenario in AR and learn how to identify safe routes in your own neighborhood.</p>
              <Button variant="secondary" className="gap-2">
                <Video className="w-4 h-4" /> Enter VR Mode
              </Button>
            </CardContent>
          </Card>

          {/* Interactive Quizzes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-purple-600" />
                Interactive Safety Quizzes
              </CardTitle>
              <CardDescription>
                Test your knowledge and earn badges! Complete quizzes to unlock achievements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizCategories.map((quiz, index) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setActiveQuiz(quiz.id)}>
                      <div className={`h-3 bg-gradient-to-r ${quiz.color}`}></div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{quiz.icon}</span>
                            <div>
                              <h4 className="font-semibold group-hover:text-primary transition-colors">
                                {quiz.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {quiz.questions} questions · +{quiz.xp} XP
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {quiz.description}
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          variant="outline"
                        >
                          <Gamepad2 className="w-4 h-4" />
                          Start Quiz
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Daily Challenge */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-500">
                <Star className="w-5 h-5 fill-orange-500" />
                Daily Challenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-2">Identify 3 Fire Hazards</p>
              <p className="text-sm text-muted-foreground mb-4">Look around your kitchen and identify potential fire risks. Upload a photo to complete.</p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Start Challenge (+50 XP)</Button>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Your Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl mb-1">🌊</div>
                  <span className="text-xs font-medium">Flood Ready</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl mb-1">🔥</div>
                  <span className="text-xs font-medium">Fire Safety</span>
                </div>
                <div className="flex flex-col items-center text-center opacity-50 grayscale">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl mb-1">🌀</div>
                  <span className="text-xs font-medium">Cyclone Pro</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
