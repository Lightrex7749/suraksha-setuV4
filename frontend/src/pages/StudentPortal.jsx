import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Trophy, 
  Gamepad2, 
  Video, 
  BrainCircuit,
  Star,
  CheckCircle,
  Download,
  Play,
  Lock,
  Award,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

const StudentPortal = () => {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);

  // Educational modules data
  const modules = [
    {
      id: 1,
      title: 'Earthquake Safety',
      description: 'Learn what to do before, during, and after an earthquake',
      progress: 100,
      completed: true,
      duration: '15 min',
      xp: 250,
      icon: '🏚️',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 2,
      title: 'Cyclone Survival',
      description: 'Understand cyclone formation and safety measures',
      progress: 65,
      completed: false,
      duration: '20 min',
      xp: 300,
      icon: '🌪️',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 3,
      title: 'Flood Preparedness',
      description: 'Essential flooding survival and evacuation tips',
      progress: 0,
      completed: false,
      duration: '18 min',
      xp: 280,
      icon: '🌊',
      color: 'from-teal-500 to-blue-500',
      locked: false
    },
    {
      id: 4,
      title: 'Fire Safety Protocol',
      description: 'Fire prevention and emergency response procedures',
      progress: 0,
      completed: false,
      duration: '25 min',
      xp: 350,
      icon: '🔥',
      color: 'from-red-500 to-orange-500',
      locked: true
    }
  ];

  // Quiz questions
  const quizzes = {
    earthquake: {
      title: 'Earthquake Safety Quiz',
      description: 'Test your knowledge about earthquake preparedness',
      questions: [
        {
          id: 1,
          question: 'What should you do during an earthquake if you are indoors?',
          options: [
            'Run outside immediately',
            'Drop, Cover, and Hold On',
            'Stand in a doorway',
            'Hide under a window'
          ],
          correct: 1
        },
        {
          id: 2,
          question: 'Which of these items should be in an earthquake emergency kit?',
          options: [
            'Only food and water',
            'First aid kit, flashlight, and batteries',
            'Just a phone charger',
            'Candles and matches'
          ],
          correct: 1
        },
        {
          id: 3,
          question: 'After an earthquake, you should:',
          options: [
            'Immediately use elevators to evacuate',
            'Light matches to check for gas leaks',
            'Check for injuries and damage, be prepared for aftershocks',
            'Return to your home right away'
          ],
          correct: 2
        },
        {
          id: 4,
          question: 'The safest place during an earthquake is:',
          options: [
            'Near windows',
            'Under a sturdy table or desk',
            'In an elevator',
            'On a balcony'
          ],
          correct: 1
        }
      ]
    },
    cyclone: {
      title: 'Cyclone Awareness Quiz',
      description: 'Check your understanding of cyclone safety',
      questions: [
        {
          id: 1,
          question: 'What wind speed defines a cyclone?',
          options: [
            'Above 50 km/h',
            'Above 62 km/h',
            'Above 100 km/h',
            'Above 150 km/h'
          ],
          correct: 1
        },
        {
          id: 2,
          question: 'During a cyclone warning, you should:',
          options: [
            'Go to the beach to watch waves',
            'Secure loose objects and stock supplies',
            'Open all windows',
            'Stay in a mobile home'
          ],
          correct: 1
        },
        {
          id: 3,
          question: 'The eye of a cyclone is:',
          options: [
            'The most dangerous part',
            'A calm region at the center',
            'Where the strongest winds are',
            'Always over land'
          ],
          correct: 1
        }
      ]
    }
  };

  // Datasets available for download
  const datasets = [
    {
      id: 1,
      title: 'Historical Earthquake Data (India)',
      description: '50 years of seismic activity records',
      format: 'CSV',
      size: '2.4 MB',
      records: '15,234',
      lastUpdated: '2026-02-01'
    },
    {
      id: 2,
      title: 'Cyclone Tracks Dataset',
      description: 'Cyclone paths and intensity data for Indian Ocean',
      format: 'JSON',
      size: '1.8 MB',
      records: '8,456',
      lastUpdated: '2026-01-28'
    },
    {
      id: 3,
      title: 'Rainfall Patterns',
      description: 'Monthly rainfall data across major cities',
      format: 'CSV',
      size: '850 KB',
      records: '24,567',
      lastUpdated: '2026-02-05'
    },
    {
      id: 4,
      title: 'Disaster Impact Statistics',
      description: 'Casualties and economic impact data',
      format: 'XLSX',
      size: '3.2 MB',
      records: '5,678',
      lastUpdated: '2026-01-15'
    }
  ];

  const handleStartQuiz = (quizKey) => {
    setActiveQuiz(quizKey);
    setQuizAnswers({});
    setQuizScore(null);
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionId]: answerIndex
    });
  };

  const handleSubmitQuiz = () => {
    const quiz = quizzes[activeQuiz];
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (quizAnswers[q.id] === q.correct) {
        correct++;
      }
    });
    const score = (correct / quiz.questions.length) * 100;
    setQuizScore(score);
    
    if (score >= 70) {
      toast.success(`Great job! You scored ${score}% and earned 100 XP!`);
    } else {
      toast.info(`You scored ${score}%. Try again to improve!`);
    }
  };

  const handleDownloadDataset = (dataset) => {
    toast.success(`Downloading ${dataset.title}...`);
    // Implement actual download logic here
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border-2 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Student Learning Zone
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" />
            Master disaster safety through interactive learning
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 px-6 py-3 rounded-full border-2 border-yellow-200 dark:border-yellow-900/50 shadow-md">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <div>
            <div className="font-bold text-yellow-700 dark:text-yellow-500">Level 5 Scout</div>
            <div className="text-xs text-yellow-600/80">2,450 XP • 75% to next level</div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="learn" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="learn" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Learn
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <Gamepad2 className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="datasets" className="gap-2">
            <FileText className="w-4 h-4" />
            Datasets
          </TabsTrigger>
        </TabsList>

        {/* Learning Modules Tab */}
        <TabsContent value="learn" className="space-y-6">
          {/* Progress Overview */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Your Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">1/4</div>
                  <div className="text-sm text-muted-foreground">Modules Completed</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">2,450</div>
                  <div className="text-sm text-muted-foreground">Total XP Earned</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">3</div>
                  <div className="text-sm text-muted-foreground">Badges Unlocked</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">15</div>
                  <div className="text-sm text-muted-foreground">Quizzes Passed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden border-2 shadow-lg ${module.locked ? 'opacity-60' : ''}`}>
                  <div className={`h-32 bg-gradient-to-r ${module.color} relative p-6 flex items-center text-white`}>
                    <div className="text-6xl mr-4">{module.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1">{module.title}</h3>
                      <p className="text-white/90 text-sm">{module.description}</p>
                    </div>
                    {module.locked && (
                      <Lock className="absolute top-4 right-4 w-6 h-6" />
                    )}
                    {module.completed && (
                      <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-green-300" />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-bold">{module.progress}%</span>
                        </div>
                        <Progress value={module.progress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            {module.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {module.xp} XP
                          </span>
                        </div>
                        <Button 
                          disabled={module.locked}
                          variant={module.completed ? "outline" : "default"}
                        >
                          {module.locked ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Locked
                            </>
                          ) : module.completed ? (
                            <>
                              Review
                            </>
                          ) : module.progress > 0 ? (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Continue
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quiz" className="space-y-6">
          {!activeQuiz ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(quizzes).map(([key, quiz], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-purple-600" />
                        {quiz.title}
                      </CardTitle>
                      <CardDescription>{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Questions</span>
                          <span className="font-bold">{quiz.questions.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Estimated Time</span>
                          <span className="font-bold">{quiz.questions.length * 2} minutes</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Reward</span>
                          <Badge variant="secondary">100 XP</Badge>
                        </div>
                        <Button 
                          className="w-full mt-4"
                          onClick={() => handleStartQuiz(key)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Quiz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{quizzes[activeQuiz].title}</CardTitle>
                    <CardDescription>{quizzes[activeQuiz].description}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setActiveQuiz(null);
                      setQuizScore(null);
                      setQuizAnswers({});
                    }}
                  >
                    Exit Quiz
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quizScore === null ? (
                  <div className="space-y-8">
                    {quizzes[activeQuiz].questions.map((q, index) => (
                      <div key={q.id} className="space-y-3">
                        <h3 className="font-semibold text-lg">
                          {index + 1}. {q.question}
                        </h3>
                        <div className="space-y-2">
                          {q.options.map((option, optIndex) => (
                            <Button
                              key={optIndex}
                              variant={quizAnswers[q.id] === optIndex ? "default" : "outline"}
                              className="w-full justify-start text-left h-auto py-3"
                              onClick={() => handleAnswerSelect(q.id, optIndex)}
                            >
                              <span className="mr-3 font-bold">{String.fromCharCode(65 + optIndex)}.</span>
                              {option}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button 
                      className="w-full"
                      size="lg"
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(quizAnswers).length !== quizzes[activeQuiz].questions.length}
                    >
                      Submit Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                      {quizScore >= 70 ? '🎉' : '📚'}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                      Your Score: {quizScore.toFixed(0)}%
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {quizScore >= 70 
                        ? 'Excellent work! You earned 100 XP!' 
                        : 'Keep learning! Review the material and try again.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => handleStartQuiz(activeQuiz)}>
                        Try Again
                      </Button>
                      <Button variant="outline" onClick={() => setActiveQuiz(null)}>
                        Back to Quizzes
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Educational Datasets
              </CardTitle>
              <CardDescription>
                Download real disaster data for your research and learning projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {datasets.map((dataset, index) => (
                  <motion.div
                    key={dataset.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{dataset.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{dataset.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Format: <strong>{dataset.format}</strong></span>
                        <span>Size: <strong>{dataset.size}</strong></span>
                        <span>Records: <strong>{dataset.records}</strong></span>
                        <span>Updated: <strong>{dataset.lastUpdated}</strong></span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="ml-4"
                      onClick={() => handleDownloadDataset(dataset)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentPortal;
