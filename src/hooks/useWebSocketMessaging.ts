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
  
  
  const callbacksRef = useRef({
    onNewMessage,
    onMessageSent,
    onUserTyping,
    onMessagesRead,
    onUserOnline,
    onError,
  });
  
  
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

  
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = appConfig.apiUrl;
    
    let wsBaseUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl.replace('/api', '');
    
    
    if (__DEV__ && wsBaseUrl.includes('localhost')) {
      wsBaseUrl = wsBaseUrl.replace('localhost', '10.0.2.2');
    }
    
    
    wsBaseUrl = wsBaseUrl.replace(/\/$/, '');
    return `${wsBaseUrl}/messaging`;
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    
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

    return () => {
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

  const joinConversation = useCallback((conversationId: string | number) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('join-conversation', { conversationId });
  }, [isConnected]);

  const leaveConversation = useCallback((conversationId: string | number) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('leave-conversation', { conversationId });
  }, [isConnected]);

  const sendMessage = useCallback((data: {
    conversationId: string | number;
    content: string;
    type?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    replyToMessageId?: string;
  }) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('send-message', {
      conversationId: data.conversationId,
      content: data.content,
      type: data.type || 'TEXT',
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      attachmentMimeType: data.attachmentMimeType,
      replyToMessageId: data.replyToMessageId,
    });
  }, [isConnected]);

  const sendTyping = useCallback((conversationId: string | number, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('typing', {
      conversationId,
      isTyping,
    });
  }, [isConnected]);

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
