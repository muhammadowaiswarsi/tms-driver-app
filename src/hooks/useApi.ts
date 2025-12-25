import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customAxios } from '../services/api';
import { handleQueryError, handleMutationSuccess, queryKeys } from '../lib/react-query';

// Generic GET hook with query parameter support
export const useGet = (queryKey: any[], url: string, options: any = {}) => {
  const { queryParams, ...otherOptions } = options;
  return useQuery({
    queryKey,
    queryFn: async () => {
      let finalUrl = url;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
        if (params.toString()) {
          finalUrl += `?${params.toString()}`;
        }
      }
      const response = await customAxios.get(finalUrl);
      return response.data;
    },
    onError: handleQueryError,
    ...otherOptions,
  });
};

// Generic POST hook
export const usePost = (queryKey: any[], url: string, options: any = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customAxios.post(url, data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      const successMessage = options.successMessage || 'Created successfully';
      handleMutationSuccess(successMessage);
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      handleQueryError(error);
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
};

// Generic PUT hook
export const usePut = (queryKey: any[], url: string, options: any = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string | number; data: any }) => {
      const response = await customAxios.put(`${url}/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      const successMessage = options.successMessage || 'Updated successfully';
      handleMutationSuccess(successMessage);
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      handleQueryError(error);
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
};

// Generic PATCH hook
export const usePatch = (queryKey: any[], url: string, options: any = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, queryParams }: { id?: string | number; data?: any; queryParams?: any }) => {
      let finalUrl = url;
      if (id) finalUrl += `/${id}`;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
        if (params.toString()) {
          finalUrl += `?${params.toString()}`;
        }
      }
      const response = await customAxios.patch(finalUrl, data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      const successMessage = options.successMessage || 'Updated successfully';
      handleMutationSuccess(successMessage);
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      handleQueryError(error);
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
};

// Generic DELETE hook
export const useDelete = (queryKey: any[], url: string, options: any = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await customAxios.delete(`${url}/${id}`);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: queryKey?.filter((item) => item !== 'delete'),
        });
      }
      const successMessage = options.successMessage || 'Deleted successfully';
      handleMutationSuccess(successMessage);
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      handleQueryError(error);
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
};

