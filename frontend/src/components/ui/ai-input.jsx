import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, X, CornerDownLeft, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils'; // Assuming utils exists, or simple replacement

const AIInput = ({
    value,
    onChange,
    onSubmit,
    onMicClick,
    isRecording,
    isLoading,
    placeholder = "Ask anything...",
    disabled
}) => {
    const textareaRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className={cn(
            "relative group transition-all duration-200 rounded-2xl p-2",
            "bg-card",
            "border border-border",
            isFocused && "border-foreground/30",
            !isFocused && "shadow-sm"
        )}>
            <div className="relative flex items-end gap-2">

                {/* Attachment Button (Visual) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                {/* Text Area */}
                <div className="flex-1 min-h-[44px] py-2">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={onChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-base placeholder:text-muted-foreground text-foreground resize-none max-h-[200px] scrollbar-hide"
                        style={{ minHeight: '24px' }}
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 pb-0.5">
                    {/* Mic Button */}
                    <AnimatePresence mode="wait">
                        {!value.trim() && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <Button
                                    onClick={onMicClick}
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10 rounded-full transition-all duration-200",
                                        isRecording
                                            ? "bg-destructive text-destructive-foreground animate-pulse"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    {isRecording ? <div className="h-3 w-3 bg-white rounded-sm" /> : <Mic className="h-5 w-5" />}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Send Button */}
                    <Button
                        onClick={onSubmit}
                        disabled={!value.trim() || disabled}
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full transition-all duration-200",
                            value.trim()
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <Sparkles className="h-5 w-5 animate-spin" />
                        ) : (
                            <CornerDownLeft className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Helper Text / Mode Indicator */}
            {isRecording && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-10 left-0 right-0 flex justify-center"
                >
                    <div className="bg-destructive text-destructive-foreground text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Listening...
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default AIInput;
