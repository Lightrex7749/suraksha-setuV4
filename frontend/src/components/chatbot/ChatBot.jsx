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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);
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

  // Load suggestions
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
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

    try {
      const response = await axios.post(`${BACKEND_URL}/api/chatbot/message`, {
        message: textToSend,
        session_id: sessionId,
        user_id: user?.id,
        context: {
          user_location: 'India' // Can be enhanced with actual geolocation
        }
      });

      setMessages(prev => [...prev.slice(0, -1), response.data]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error.response?.status === 503 
        ? 'AI service is temporarily unavailable. Please try again in a moment.'
        : error.response?.data?.detail 
        ? error.response.data.detail
        : 'Sorry, I encountered an error. Please check your connection and try again.';
      
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          ...userMessage,
          response: errorMsg,
          error: true
        }
      ]);
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
        setMessages([]);
        localStorage.removeItem('chatbot_session_id');
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        localStorage.setItem('chatbot_session_id', newSessionId);
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
              className="h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
              data-testid="chatbot-open-button"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full animate-pulse" />
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
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] flex flex-col"
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
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
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
                    {loading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={loading}
                    className="flex-1"
                    data-testid="chatbot-input"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    size="icon"
                    data-testid="chatbot-send-button"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;