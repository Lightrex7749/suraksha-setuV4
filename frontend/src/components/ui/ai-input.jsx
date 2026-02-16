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
            "relative group transition-all duration-300 rounded-3xl p-2",
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
            "border border-gray-200 dark:border-gray-700",
            isFocused && "shadow-2xl ring-2 ring-purple-500/20 border-purple-500/50 scale-[1.01]",
            !isFocused && "shadow-lg scale-100"
        )}>
            {/* Magic Glow Effect */}
            <div className={cn(
                "absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 transition-opacity duration-500 pointer-events-none",
                isFocused && "opacity-100"
            )} />

            <div className="relative flex items-end gap-2">

                {/* Attachment Button (Visual) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
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
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-800 dark:text-gray-100 resize-none max-h-[200px] scrollbar-hide"
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
                                        "h-10 w-10 rounded-full transition-all duration-300",
                                        isRecording
                                            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-red-500/30 shadow-lg"
                                            : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/50"
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
                            "h-10 w-10 rounded-full transition-all duration-300 shadow-md",
                            value.trim()
                                ? "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
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
                    <div className="bg-red-500/90 backdrop-blur text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
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
