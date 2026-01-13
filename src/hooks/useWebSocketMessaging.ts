import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { appConfig } from '../utils/appConfig';

interface Message {
  id: string | number;
  conversationId: string | number;
  senderId: string | number;
  recipientId?: string | number;
  content: string;
  type: string;
  status?: string;
  sentAt?: string;
  createdAt?: string;
}

interface TypingData {
  conversationId: string | number;
  userId: string | number;
  isTyping: boolean;
}

interface UseWebSocketMessagingOptions {
  onNewMessage?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onUserTyping?: (data: TypingData) => void;
  onMessagesRead?: (data: { conversationId: string | number; messageIds: (string | number)[]; readBy?: string }) => void;
  onUserOnline?: (data: { userId: string | number }) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export const useWebSocketMessaging = (options: UseWebSocketMessagingOptions = {}) => {
  const {
    onNewMessage,
    onMessageSent,
    onUserTyping,
    onMessagesRead,
    onUserOnline,
    onError,
    enabled = true,
  } = options;

  const { accessToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  // Store callbacks in refs to prevent infinite re-renders
  const callbacksRef = useRef({
    onNewMessage,
    onMessageSent,
    onUserTyping,
    onMessagesRead,
    onUserOnline,
    onError,
  });
  
  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessageSent,
      onUserTyping,
      onMessagesRead,
      onUserOnline,
      onError,
    };
  }, [onNewMessage, onMessageSent, onUserTyping, onMessagesRead, onUserOnline, onError]);

  // Get WebSocket URL from API URL
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = appConfig.apiUrl;
    // Remove /api suffix if present
    let wsBaseUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl.replace('/api', '');
    
    // For Android emulator, replace localhost with 10.0.2.2
    if (__DEV__ && wsBaseUrl.includes('localhost')) {
      wsBaseUrl = wsBaseUrl.replace('localhost', '10.0.2.2');
    }
    
    // Ensure no trailing slash before adding /messaging
    wsBaseUrl = wsBaseUrl.replace(/\/$/, '');
    return `${wsBaseUrl}/messaging`;
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    
    // Create Socket.IO connection with authentication
    const socket = io(wsUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      setConnectionError(error);
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error);
      }
    });

    // Message event handlers - use refs to avoid recreating listeners
    socket.on('new-message', (data: Message) => {
      if (callbacksRef.current.onNewMessage) {
        callbacksRef.current.onNewMessage(data);
      }
    });

    socket.on('message-sent', (data: Message) => {
      if (callbacksRef.current.onMessageSent) {
        callbacksRef.current.onMessageSent(data);
      }
    });

    socket.on('user-typing', (data: TypingData) => {
      if (callbacksRef.current.onUserTyping) {
        callbacksRef.current.onUserTyping(data);
      }
    });

    socket.on('messages-read', (data: { conversationId: string | number; messageIds: (string | number)[]; readBy?: string }) => {
      if (callbacksRef.current.onMessagesRead) {
        callbacksRef.current.onMessagesRead(data);
      }
    });

    socket.on('user-online', (data: { userId: string | number }) => {
      if (callbacksRef.current.onUserOnline) {
        callbacksRef.current.onUserOnline(data);
      }
    });

    // Cleanup on unmount
    return () => {
      // Remove all event listeners before disconnecting
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('new-message');
      socket.off('message-sent');
      socket.off('user-typing');
      socket.off('messages-read');
      socket.off('user-online');
      
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, accessToken, getWebSocketUrl]);

  // Join a conversation room
  const joinConversation = useCallback((conversationId: string | number) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('join-conversation', { conversationId });
  }, [isConnected]);

  // Leave a conversation room
  const leaveConversation = useCallback((conversationId: string | number) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('leave-conversation', { conversationId });
  }, [isConnected]);

  // Send a message via WebSocket
  const sendMessage = useCallback((data: { conversationId: string | number; content: string; type?: string }) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('send-message', {
      conversationId: data.conversationId,
      content: data.content,
      type: data.type || 'TEXT',
    });
  }, [isConnected]);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: string | number, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('typing', {
      conversationId,
      isTyping,
    });
  }, [isConnected]);

  // Mark messages as read
  const markMessagesAsRead = useCallback((conversationId: string | number, messageIds: (string | number)[]) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('mark-read', {
      conversationId,
      messageIds,
    });
  }, [isConnected]);

  return {
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markMessagesAsRead,
    socket: socketRef.current,
  };
};
