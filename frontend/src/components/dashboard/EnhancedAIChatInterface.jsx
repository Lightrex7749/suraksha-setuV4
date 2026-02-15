import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, Send, Mic, MicOff, Loader2, Sparkles, 
  Bot, User, Volume2, VolumeX, Zap, Brain, TrendingUp, X, Minimize2, Maximize2
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
      text: '👋 **Namaste!** I\'m Suraksha AI, your intelligent disaster safety assistant powered by ChatGPT.\n\n🔹 **Real-time weather** & **air quality** updates\n🔹 **Emergency preparedness** & safety tips\n🔹 **Live disaster alerts** in your area\n🔹 **Safety guidance** for natural disasters\n\n🎤 **Voice Mode:** Click the voice button for hands-free conversation in ANY language!\n\nHow can I help you stay safe today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // NEW: Voice conversation mode
  const [detectedLanguage, setDetectedLanguage] = useState('en-IN'); // NEW: Auto-detected language
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

  // Load voices for better language support
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log(`Loaded ${voices.length} voices for TTS`);
      };
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices();
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
      console.error('Failed to get chat response:', error);
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
      // Recording started
    } catch (error) {
      console.error('Error starting recording:', error);
      console.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      // Processing voice
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
      
      // Voice processed
    } catch (error) {
      console.error('Error processing voice:', error);
      console.error('Voice transcription failed');
      // Remove the voice message on error
      setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech with language support
  const speakText = (text, languageCode = null) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      // Clean text for speech
      const cleanText = text
        .replace(/\*\*/g, '')  // Remove bold markers
        .replace(/[•\-]/g, '')  // Remove bullet points
        .replace(/\n/g, '. ')   // Replace newlines with periods
        .replace(/#+/g, '')     // Remove markdown headers
        .substring(0, 500);     // Limit length

      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Use detected language or default to Indian English
      const lang = languageCode || detectedLanguage || 'en-IN';
      utterance.lang = lang;
      
      // Adjust speech parameters for better naturalness
      utterance.rate = 0.95;   // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to select best voice for the language
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(lang.split('-')[0]) && 
        (voice.lang.includes('IN') || voice.name.includes('India'))
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
      } else {
        console.log(`Using default voice for ${lang}`);
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`Speaking in ${lang}...`);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
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
    { icon: '�️', text: 'Today\'s weather', color: 'from-blue-500 to-cyan-500', shortText: 'Weather' },
    { icon: '💨', text: 'Air quality now', color: 'from-green-500 to-emerald-500', shortText: 'AQI' },
    { icon: '🌊', text: 'Flood safety tips', color: 'from-cyan-500 to-blue-600', shortText: 'Flood' },
    { icon: '⚡', text: 'Emergency kit list', color: 'from-orange-500 to-red-500', shortText: 'Kit' },
    { icon: '🏠', text: 'Earthquake safety', color: 'from-purple-500 to-pink-500', shortText: 'Earthquake' },
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
              return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
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
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex gap-2 ${isBot ? 'flex-row' : 'flex-row-reverse'} group`}
      >
        <Avatar className={`h-12 w-12 shrink-0 ${isBot ? 'bg-white ring-2 ring-purple-100 dark:ring-purple-900' : 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-indigo-100 dark:ring-indigo-900'}`}>
          <AvatarFallback className="text-white bg-transparent">
            {isBot ? <img src="/ai_logo.png" alt="AI" className="h-10 w-10 object-contain" /> : <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 max-w-[85%] md:max-w-[75%] ${isBot ? '' : 'flex flex-col items-end'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
              isBot
                ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-foreground border border-gray-200 dark:border-gray-700'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md'
            }`}
          >
            <div className={`text-[13px] leading-relaxed ${isBot ? 'space-y-1' : ''}`}>
              {isBot ? formatText(message.text) : <span className="font-medium">{message.text}</span>}
            </div>
          </div>
          {message.data && (
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              {message.data.weather && (
                <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-2">
                  🌡️ {message.data.weather.temperature}°C
                </Badge>
              )}
              {message.data.aqi && (
                <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-2">
                  💨 AQI: {message.data.aqi.aqi}
                </Badge>
              )}
            </div>
          )}
          <p className={`text-[9px] text-muted-foreground mt-1 ${isBot ? '' : 'text-right'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className={`w-full ${isExpanded ? 'h-[700px]' : 'h-[550px]'} flex flex-col shadow-xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50`}>
      {/* Redesigned Header with Gradient */}
      <CardHeader className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white pb-3 pt-3 px-4 shrink-0">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated AI Avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-lg p-2">
                <img src="/ai_logo.png" alt="Suraksha AI" className="h-full w-full object-contain" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white shadow-md"></span>
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                Suraksha AI
                <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0 h-4 backdrop-blur-sm">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  GPT-4
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-white/80 font-medium">Your Intelligent Safety Assistant</p>
            </div>
          </div>
          <div className="flex gap-1">
            {/* Voice Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setVoiceMode(!voiceMode);
                if (!voiceMode) {
                  // Voice mode enabled
                } else {
                  // Voice mode disabled
                  // Stop recording if active
                  if (isRecording) stopRecording();
                }
              }}
              className={`h-8 w-8 rounded-lg transition-all ${
                voiceMode 
                  ? 'bg-green-500/30 text-white hover:bg-green-500/40 ring-2 ring-green-400/50 animate-pulse' 
                  : 'text-white hover:bg-white/20'
              }`}
              title={voiceMode ? "Voice Mode: ON" : "Voice Mode: OFF"}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            {isSpeaking && (
              <Button
                variant="ghost"
                size="icon"
                onClick={stopSpeaking}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 space-y-0 overflow-hidden">
        {/* Quick Action Chips */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-900/30 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <AnimatePresence>
              {quickPrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                  onClick={() => setInputValue(prompt.text)}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all bg-gradient-to-r ${prompt.color} text-white shadow-sm hover:shadow-md`}
                >
                  <span className="text-sm drop-shadow-sm">{prompt.icon}</span>
                  <span className="hidden md:inline">{prompt.shortText}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages Area with Better Styling */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 bg-gradient-to-b from-transparent via-gray-50/30 to-gray-100/30 dark:via-gray-900/20 dark:to-gray-800/20">
          <div className="space-y-3 py-4">
            <AnimatePresence>
              {messages.map((message) => (
                <div key={message.id}>{renderMessage(message)}</div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 ring-2 ring-purple-100 dark:ring-purple-900">
                  <AvatarFallback className="text-white bg-transparent">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Redesigned Input Area */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about disasters, weather, or safety..."
                disabled={isLoading || isRecording}
                rows={1}
                className="w-full px-4 py-3 pr-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none bg-gray-50 dark:bg-gray-800 text-sm"
                style={{ maxHeight: '120px', minHeight: '48px' }}
              />
              {isRecording && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-3"
                >
                  <div className="flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded-full text-[10px] font-semibold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Recording
                  </div>
                </motion.div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                size="icon"
                className={`h-12 w-12 rounded-xl shadow-md transition-all relative ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : voiceMode
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 ring-2 ring-green-400/50'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
                title={voiceMode ? "Voice Mode: Continuous Conversation" : "Voice Input"}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {voiceMode && !isRecording && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isRecording}
                size="icon"
                className="h-12 w-12 rounded-xl shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Helper Text with Voice Mode Status */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              {voiceMode ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  Voice Mode Active • Language: {detectedLanguage}
                </span>
              ) : (
                <span>Powered by ChatGPT & Whisper • Press Enter to send</span>
              )}
            </p>
            {voiceMode && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                <Mic className="h-2.5 w-2.5 mr-1" />
                Continuous
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAIChatInterface;
