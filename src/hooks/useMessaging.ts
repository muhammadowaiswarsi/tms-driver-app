import { queryKeys } from '../lib/react-query';
import { useGet, usePost } from './useApi';

export const useCreateConservation = (options = {}): Record<string, any> => {
  return usePost(
    queryKeys.messaging.conversations() as unknown as any[],
    '/messaging/conversations',
    {
      successMessage: 'Conversation created successfully',
      ...options,
    }
  );
};

export const useGetConversations = (filters = {}): any => {
  return useGet(
    queryKeys.messaging.conversationsList(filters) as unknown as any[],
    '/messaging/conversations',
    {
      enabled: true,
      queryParams: filters,
    }
  );
};

export const useGetMessages = (conversationId: string | number | null, filters = {}): any => {
  return useGet(
    queryKeys.messaging.conversationMessagesList(conversationId, filters) as unknown as any[],
    `/messaging/conversations/${conversationId}/messages`,
    {
      enabled: !!conversationId,
      queryParams: filters,
    }
  );
};

export const useSendMessage = (options = {}): Record<string, any> => {
  return usePost(
    queryKeys.messaging.messages() as unknown as any[],
    '/messaging/messages',
    {
      successMessage: 'Message sent successfully',
      ...options,
    }
  );
};
