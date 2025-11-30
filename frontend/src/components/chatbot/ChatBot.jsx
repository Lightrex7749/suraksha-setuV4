import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Debug logging
console.log('ChatBot - REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('ChatBot - BACKEND_URL:', BACKEND_URL);

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewportRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useAuth();

  // Generate session ID on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatbot_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadChatHistory(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatbot_session_id', newSessionId);
      
      // Add welcome message for new sessions
      setMessages([{
        id: 'welcome',
        message: '',
        response: '👋 Hello! I\'m Suraksha Setu, your disaster management assistant. I can help you with:\n\n- **Real-time disaster alerts** and weather updates\n- **Emergency preparedness** tips and checklists\n- **Safety guidelines** for earthquakes, cyclones, floods, and more\n- **Air quality** information and health recommendations\n- **Evacuation** routes and shelter locations\n\nFeel free to ask me anything about staying safe during emergencies!',
        timestamp: new Date().toISOString(),
        isUser: false
      }]);
    }
  }, []);

  // Load suggestions and focus input when opened
  useEffect(() => {
    if (isOpen) {
      if (suggestions.length === 0) {
        loadSuggestions();
      }
      // Focus input when chatbot opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollViewportRef.current) {
        const viewport = scrollViewportRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          setTimeout(() => {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
      }
    };
    scrollToBottom();
  }, [messages, loading]);

  const loadChatHistory = async (sessionId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chatbot/history`, {
        params: { session_id: sessionId }
      });
      if (response.data.messages && response.data.messages.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chatbot/suggestions`);
      const allSuggestions = response.data.suggestions || [];
      setSuggestions(allSuggestions);
      setFilteredSuggestions(allSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  // Filter suggestions based on user input
  useEffect(() => {
    if (!input.trim()) {
      setFilteredSuggestions(suggestions.slice(0, 3));
      return;
    }

    const inputLower = input.toLowerCase();
    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(inputLower) ||
      inputLower.split(' ').some(word => word.length > 2 && suggestion.toLowerCase().includes(word))
    );

    // If no matches, show smart suggestions based on keywords
    if (filtered.length === 0) {
      const smartSuggestions = getSmartSuggestions(inputLower);
      setFilteredSuggestions(smartSuggestions);
    } else {
      setFilteredSuggestions(filtered.slice(0, 3));
    }
  }, [input, suggestions]);

  // Get smart suggestions based on keywords
  const getSmartSuggestions = (inputLower) => {
    const keywords = {
      earthquake: ['What should I do during an earthquake?', 'Earthquake safety tips', 'How to prepare for earthquakes?'],
      flood: ['What to do during a flood?', 'Flood safety measures', 'How to stay safe in floods?'],
      cyclone: ['Cyclone safety tips', 'What to do during a cyclone?', 'Cyclone preparation checklist'],
      weather: ['What is the weather forecast?', 'Current weather conditions', 'Weather alerts in my area'],
      air: ['Current air quality index', 'Is the air quality safe?', 'Air pollution levels'],
      alert: ['Active disaster alerts', 'Emergency notifications', 'What disasters are happening?'],
      evacuation: ['Nearest evacuation centers', 'Evacuation routes', 'Where should I evacuate?'],
      emergency: ['Emergency contact numbers', 'What to do in an emergency?', 'Emergency preparedness kit'],
      safety: ['Disaster safety tips', 'How to stay safe?', 'Safety guidelines'],
      prepare: ['How to prepare for disasters?', 'Emergency preparedness checklist', 'Disaster preparation tips']
    };

    for (const [key, suggestionList] of Object.entries(keywords)) {
      if (inputLower.includes(key)) {
        return suggestionList;
      }
    }

    return suggestions.slice(0, 3);
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    const userMessage = {
      id: `temp_${Date.now()}`,
      message: textToSend,
      response: '',
      timestamp: new Date().toISOString(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/chatbot/message`, {
        message: textToSend,
        session_id: sessionId,
        user_id: user?.id,
        context: {
          user_location: 'India' // Can be enhanced with actual geolocation
        }
      });

      // Add the bot response as a new message, keep the user message
      const botMessage = {
        id: response.data.id || `bot_${Date.now()}`,
        message: textToSend,
        response: response.data.response,
        timestamp: response.data.timestamp || new Date().toISOString(),
        isUser: false
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Provide user-friendly error messages
      let errorMsg = 'Sorry, I encountered an error. Please try again in a moment.';
      
      if (error.response?.status === 503) {
        errorMsg = 'AI service is temporarily unavailable. Please try again in a moment.';
      } else if (error.response?.status === 500) {
        errorMsg = error.response?.data?.detail || 'Service temporarily unavailable. Please try again shortly.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMsg = 'Cannot connect to the server. Please check your internet connection and ensure the backend is running.';
      }
      
      // Add error message as bot response, keep user message
      const errorBotMessage = {
        id: `error_${Date.now()}`,
        message: textToSend,
        response: errorMsg,
        timestamp: new Date().toISOString(),
        isUser: false,
        error: true
      };
      
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear chat history?')) {
      try {
        await axios.delete(`${BACKEND_URL}/api/chatbot/clear`, {
          params: { session_id: sessionId }
        });
        
        // Create new session
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        localStorage.setItem('chatbot_session_id', newSessionId);
        
        // Add welcome message for fresh start
        setMessages([{
          id: 'welcome',
          message: '',
          response: '👋 Chat cleared! I\'m here to help with disaster management, safety tips, weather alerts, and emergency preparedness. What would you like to know?',
          timestamp: new Date().toISOString(),
          isUser: false
        }]);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-16 w-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 bg-gradient-to-br from-primary to-primary/80"
              data-testid="chatbot-open-button"
              title="Open Disaster Assistant"
            >
              <MessageCircle className="h-7 w-7" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full animate-pulse flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">AI</span>
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[650px] flex flex-col"
          >
            <Card className="flex flex-col h-full shadow-2xl border-2">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" data-testid="chatbot-title">Suraksha Setu</h3>
                    <p className="text-xs opacity-90">Disaster Management Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearHistory}
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    data-testid="chatbot-clear-button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    data-testid="chatbot-close-button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea ref={scrollViewportRef} className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Welcome to Suraksha Setu! 🛡️</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        I'm your AI disaster management assistant. I can help you with real-time alerts, safety tips, emergency preparedness, and answer any questions about disasters and weather conditions in India.
                      </p>
                    </div>
                    {suggestions.length > 0 && (
                      <div className="w-full space-y-2">
                        <p className="text-xs text-muted-foreground">Try asking:</p>
                        {suggestions.slice(0, 3).map((suggestion, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10 transition-colors w-full justify-start text-left py-2 px-3"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="chatbot-messages">
                    {messages.map((msg, idx) => (
                      <ChatMessage key={msg.id || idx} message={msg} />
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <Card className="bg-muted p-3">
                          <div className="flex gap-1">
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                              className="w-2 h-2 bg-primary/60 rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                              className="w-2 h-2 bg-primary/60 rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                              className="w-2 h-2 bg-primary/60 rounded-full"
                            />
                          </div>
                        </Card>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Quick Actions - Dynamic Suggestions */}
              {!loading && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 pb-2 border-t pt-2 bg-muted/30"
                >
                  <p className="text-[10px] text-muted-foreground mb-1.5 px-1">
                    {input.trim() ? '💡 Related suggestions:' : '🚀 Quick actions:'}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {filteredSuggestions.map((suggestion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 whitespace-nowrap text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion.length > 35 ? suggestion.substring(0, 35) + '...' : suggestion}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Input */}
              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={loading ? "Please wait..." : "Ask about disasters, weather, safety..."}
                    disabled={loading}
                    className="flex-1"
                    data-testid="chatbot-input"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    size="icon"
                    className="transition-transform hover:scale-105"
                    data-testid="chatbot-send-button"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;