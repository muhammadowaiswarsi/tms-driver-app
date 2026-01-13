import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

interface QueryFilters {
  [key: string]: any;
}

interface ErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
}

// Default query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: ErrorResponse) => {
        if (error?.response?.status && error.response.status >= 400 && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Global error handler for queries
export const handleQueryError = (error: ErrorResponse): void => {
  const errorMessage =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';

  // Show error alert in React Native
  Alert.alert('Error', Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
};

// Global success handler for mutations
export const handleMutationSuccess = (message: string = 'Operation completed successfully'): void => {
  // In React Native, we can use a toast library or Alert
  // Toast library can be integrated here if needed
};

// Query key factory
export const queryKeys = {
  driverLoads: {
    all: ['driverLoads'] as const,
    lists: () => [...queryKeys.driverLoads.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.driverLoads.lists(), { ...filters }] as const,
    detail: (id: string | number) => [...queryKeys.driverLoads.all, 'detail', id] as const,
    active: () => [...queryKeys.driverLoads.all, 'active'] as const,
    locationStatus: (id: string | number) => [...queryKeys.driverLoads.all, 'locationStatus', id] as const,
    returnInfo: (id: string | number) => [...queryKeys.driverLoads.all, 'returnInfo', id] as const,
  },
  loads: {
    all: ['loads'] as const,
    lists: () => [...queryKeys.loads.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.loads.lists(), { ...filters }] as const,
    details: () => [...queryKeys.loads.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.loads.details(), id] as const,
  },
  chassis: {
    all: ['chassis'] as const,
    lists: () => [...queryKeys.chassis.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.chassis.lists(), { ...filters }] as const,
    details: () => [...queryKeys.chassis.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.chassis.details(), id] as const,
  },
  messaging: {
    all: ['messaging'] as const,
    conversations: () => [...queryKeys.messaging.all, 'conversations'] as const,
    conversationsList: (filters: QueryFilters) => [...queryKeys.messaging.conversations(), 'list', { ...filters }] as const,
    conversationMessages: (conversationId: string | number | null) => [...queryKeys.messaging.all, 'conversations', conversationId, 'messages'] as const,
    conversationMessagesList: (conversationId: string | number | null, filters: QueryFilters) => [...queryKeys.messaging.conversationMessages(conversationId), 'list', { ...filters }] as const,
    messages: () => [...queryKeys.messaging.all, 'messages'] as const,
  },
  drivers: {
    all: ['drivers'] as const,
    lists: () => [...queryKeys.drivers.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.drivers.lists(), { ...filters }] as const,
  },
};

