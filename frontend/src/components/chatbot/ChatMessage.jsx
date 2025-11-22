import React from 'react';
import { User, Bot, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const ChatMessage = ({ message }) => {
  const isUser = message.message && !message.response;
  const hasError = message.error;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageText = (text) => {
    if (!text) return null;
    
    // Convert markdown-style formatting to HTML
    const formattedText = text
      .split('\n')
      .map((line, idx) => {
        // Bold text
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          line = `<li class="ml-4">${line.trim().substring(2)}</li>`;
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
          line = `<li class="ml-4">${line.trim().replace(/^\d+\.\s/, '')}</li>`;
        }
        return line;
      })
      .join('<br />');

    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <Card className={`p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : hasError 
            ? 'bg-destructive/10 text-destructive border-destructive/20' 
            : 'bg-muted'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          ) : (
            <div className="space-y-2">
              {hasError && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-semibold">Error</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {formatMessageText(message.response)}
              </div>
              {message.context && message.context.active_alerts && message.context.active_alerts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <p className="text-xs font-semibold mb-1">Context:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.context.active_alerts.map((alert, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {alert.severity}: {alert.location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
        <span className="text-xs text-muted-foreground px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
};

export default ChatMessage;