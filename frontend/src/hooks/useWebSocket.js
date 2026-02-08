import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * WebSocket hook for real-time disaster alerts
 * Handles connection, reconnection, and message processing
 */
export const useWebSocket = (url, options = {}) => {
  const {
    onMessage = null,
    onConnect = null,
    onDisconnect = null,
    onError = null,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000, // 30 seconds
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStats, setConnectionStats] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const locationRef = useRef(null);

  /**
   * Send message to WebSocket server
   */
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    console.warn('WebSocket not connected. Message not sent:', message);
    return false;
  }, []);

  /**
   * Set client location for targeted alerts
   */
  const setLocation = useCallback((location) => {
    locationRef.current = location;
    sendMessage({
      type: 'set_location',
      location: location,
    });
  }, [sendMessage]);

  /**
   * Request current alerts from server
   */
  const requestAlerts = useCallback(() => {
    sendMessage({
      type: 'request_alerts',
    });
  }, [sendMessage]);

  /**
   * Request connection statistics
   */
  const requestStats = useCallback(() => {
    sendMessage({
      type: 'get_stats',
    });
  }, [sendMessage]);

  /**
   * Start heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, heartbeatInterval);
  }, [sendMessage, heartbeatInterval]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('Connecting to WebSocket:', url);
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        startHeartbeat();

        // Re-send location if it was set
        if (locationRef.current) {
          setLocation(locationRef.current);
        }

        toast.success('🔔 Real-time alerts connected', {
          description: 'You will receive instant disaster notifications',
        });

        if (onConnect) onConnect();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          setLastMessage(message);

          // Handle different message types
          if (message.type === 'new_alert') {
            // New disaster alert
            const severity = message.severity || 'info';
            const severityEmoji = {
              critical: '🚨',
              warning: '⚠️',
              info: 'ℹ️',
            }[severity] || 'ℹ️';

            const distance = message.distance_km
              ? ` (${message.distance_km}km away)`
              : '';

            toast.error(`${severityEmoji} ${message.title || 'New Alert'}`, {
              description: `${message.description || 'Disaster alert in your area'}${distance}`,
              duration: 10000, // Show for 10 seconds
              action: message.url ? {
                label: 'View Details',
                onClick: () => window.location.href = message.url,
              } : null,
            });
          } else if (message.type === 'pong') {
            // Heartbeat response (silent)
          } else if (message.type === 'connection') {
            // Welcome message
            console.log('Connection confirmed:', message.message);
          } else if (message.type === 'location_updated') {
            console.log('Location updated:', message.message);
          } else if (message.type === 'stats') {
            setConnectionStats(message.data);
          } else if (message.type === 'alerts_list') {
            console.log(`Received ${message.count} alerts`);
          }

          if (onMessage) onMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        stopHeartbeat();

        if (onDisconnect) onDisconnect();

        // Attempt reconnection
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Reconnecting in ${reconnectInterval}ms... (Attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          toast.warning('⚠️ Alert connection lost', {
            description: `Reconnecting... (Attempt ${reconnectAttempts + 1})`,
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          toast.error('❌ Could not connect to alert service', {
            description: 'Please refresh the page to try again',
            duration: Infinity,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload(),
            },
          });
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      if (onError) onError(error);
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts, reconnectAttempts, startHeartbeat, stopHeartbeat, setLocation]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [stopHeartbeat]);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]); // Only reconnect if URL changes

  return {
    isConnected,
    lastMessage,
    connectionStats,
    reconnectAttempts,
    sendMessage,
    setLocation,
    requestAlerts,
    requestStats,
    connect,
    disconnect,
  };
};

export default useWebSocket;
