import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Send, Mic, MicOff, Loader2,
  Bot, User, Volume2, VolumeX, X, Minimize2, Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AIInput from '@/components/ui/ai-input';
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
      text: 'Hi, I\'m Suraksha AI. Ask me anything about weather, disasters, safety, or emergency preparedness.',
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
      const response = await axios.post(`${API_URL}/ai/chat`, {
        message: userMessage.text,
        query: userMessage.text,
        role: 'citizen',
        context: { domain: 'dashboard', language: 'en-IN' },
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
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
      formData.append('file', audioBlob, 'voice.webm');

      const response = await axios.post(`${API_URL}/ai/voice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user message with transcription
      setMessages((prev) =>
        prev.map(msg =>
          msg.id === userMessage.id
            ? { ...msg, text: response.data.transcript || '🎤 Voice message' }
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

      utterance.rate = 0.9;
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
        <Avatar className={`h-8 w-8 shrink-0 ${isBot ? 'bg-primary/10' : 'bg-primary'}`}>
          <AvatarFallback className={`${isBot ? 'text-primary' : 'text-primary-foreground'} bg-transparent`}>
            {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 max-w-[85%] md:max-w-[75%] ${isBot ? '' : 'flex flex-col items-end'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 ${isBot
              ? 'bg-muted text-foreground border border-border'
              : 'bg-primary text-primary-foreground'
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
    <Card className={`w-full ${isExpanded ? 'h-[700px]' : 'h-[550px]'} flex flex-col shadow-sm border border-border overflow-hidden transition-all duration-300 bg-card`}>
      {/* Clean Header */}
      <CardHeader className="bg-card border-b border-border pb-3 pt-3 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center p-2">
                <img src="/ai_logo.png" alt="Suraksha AI" className="h-full w-full object-contain" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card"></span>
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Suraksha AI
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Safety Assistant</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setVoiceMode(!voiceMode);
                if (!voiceMode) {
                  // Voice mode enabled
                } else {
                  // Voice mode disabled
                  if (isRecording) stopRecording();
                }
              }}
              className={`h-8 w-8 rounded-lg transition-all ${voiceMode
                ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                : 'text-muted-foreground hover:text-foreground'
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
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 space-y-0 overflow-hidden">
        {/* Quick Action Chips */}
        <div className="px-4 pt-3 pb-2 border-b border-border shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <AnimatePresence>
              {quickPrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setInputValue(prompt.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors bg-muted hover:bg-muted/80 text-foreground border border-border"
                >
                  <span className="text-sm">{prompt.icon}</span>
                  <span className="hidden md:inline">{prompt.shortText}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
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
                <Avatar className="h-8 w-8 bg-primary/10">
                  <AvatarFallback className="text-primary bg-transparent">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3 border border-border">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border shrink-0">
          <AIInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSubmit={handleSendMessage}
            onMicClick={isRecording ? stopRecording : startRecording}
            isRecording={isRecording}
            isLoading={isLoading}
            placeholder="Ask Suraksha AI..."
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAIChatInterface;
