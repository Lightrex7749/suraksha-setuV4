import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, Send, Mic, MicOff, Loader2, Sparkles, 
  Bot, User, Volume2, VolumeX, Zap, Brain, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const EnhancedAIChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 **Namaste!** I\'m Suraksha AI, your intelligent disaster safety assistant.\n\nI can help you with:\n• **Real-time weather** and **air quality** updates\n• **Emergency preparedness** tips\n• **Live disaster alerts** in your area\n• **Safety guidance** for earthquakes, floods & cyclones\n\nHow can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage.text,
        context: 'dashboard',
        language: 'en-IN'
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.data.response,
        timestamp: new Date(),
        data: response.data.data,
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Auto-speak response if speech synthesis is available
      if ('speechSynthesis' in window && response.data.response) {
        speakText(response.data.response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '⚠️ I\'m having trouble connecting right now. Please check:\n• Your internet connection\n• Try again in a moment\n\n**Emergency Numbers:**\n• **112** - National Emergency\n• **1078** - NDMA Helpline',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      toast.success('🎤 Recording started...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Processing voice...');
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    setIsLoading(true);
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: '🎤 *Voice message*',
      timestamp: new Date(),
      isVoice: true
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'voice.webm');

      const response = await axios.post(`${API_URL}/voice/chat`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user message with transcription
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, text: response.data.transcription }
            : msg
        )
      );

      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Speak the response
      speakText(response.data.response);
      
      toast.success('Voice message processed!');
    } catch (error) {
      console.error('Error processing voice:', error);
      toast.error('Voice transcription failed. Try typing instead.');
      // Remove the voice message on error
      setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text for speech
    const cleanText = text
      .replace(/\*\*/g, '')  // Remove bold markers
      .replace(/[•\-]/g, '')  // Remove bullet points
      .replace(/\n/g, '. ')   // Replace newlines with periods
      .substring(0, 500);     // Limit length

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    { icon: '🌧️', text: 'Weather forecast for today', color: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950' },
    { icon: '💨', text: 'Current air quality status', color: 'bg-green-50 hover:bg-green-100 dark:bg-green-950' },
    { icon: '🌊', text: 'What to do during floods?', color: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950' },
    { icon: '🏠', text: 'Emergency kit checklist', color: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950' },
  ];

  const renderMessage = (message) => {
    const isBot = message.type === 'bot';

    // Format bot messages with markdown-like styling
    const formatText = (text) => {
      return text
        .split('\n')
        .map((line, i) => {
          // Bold text
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const formatted = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          
          return (
            <span key={i}>
              {formatted}
              {i < text.split('\n').length - 1 && <br />}
            </span>
          );
        });
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex gap-3 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <Avatar className={`h-9 w-9 ${isBot ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-primary'}`}>
          <AvatarFallback className="text-white">
            {isBot ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 max-w-[80%] ${isBot ? '' : 'flex flex-col items-end'}`}>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isBot
                ? 'bg-muted text-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <div className={`text-sm ${isBot ? 'space-y-1' : ''}`}>
              {isBot ? formatText(message.text) : message.text}
            </div>
          </div>
          {message.data && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {message.data.weather && (
                <Badge variant="outline" className="text-xs gap-1">
                  🌡️ {message.data.weather.temperature}°C
                </Badge>
              )}
              {message.data.aqi && (
                <Badge variant="outline" className="text-xs gap-1">
                  💨 AQI: {message.data.aqi.aqi}
                </Badge>
              )}
            </div>
          )}
          <p className={`text-[10px] text-muted-foreground mt-1 ${isBot ? '' : 'text-right'}`}>
            {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="w-full h-[600px] flex flex-col shadow-lg border-2">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Suraksha AI</CardTitle>
              <p className="text-sm text-white/90">Powered by ChatGPT & Whisper</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSpeaking ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={stopSpeaking}
                className="h-9 w-9 text-white hover:bg-white/20"
              >
                <VolumeX className="h-5 w-5" />
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1 bg-white/10 text-white border-white/20">
                <Brain className="w-3 h-3" />
                AI
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Quick Prompts */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickPrompts.map((prompt, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setInputValue(prompt.text)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${prompt.color}`}
            >
              <span>{prompt.icon}</span>
              <span>{prompt.text}</span>
            </motion.button>
          ))}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="space-y-4 pr-4">
            {messages.map((message) => renderMessage(message))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-500 to-purple-500">
                  <AvatarFallback className="text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about weather, alerts, safety tips..."
              disabled={isLoading || isRecording}
              className="w-full px-4 py-3 pr-12 rounded-full border-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:outline-none transition-all disabled:opacity-50"
            />
            {isRecording && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            size="icon"
            className={`h-12 w-12 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isRecording}
            size="icon"
            className="h-12 w-12 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAIChatInterface;
