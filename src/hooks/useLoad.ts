import { queryKeys } from '../lib/react-query';
import { useDelete, useGet, usePatch, usePost } from './useApi';

export const useLoads = (filters = {}): any => {
  return useGet(queryKeys.loads.list(filters) as unknown as any[], '/loads', {
    enabled: true,
    queryParams: filters,
  });
};

export const useLoad = (id: any) => {
  return useGet(queryKeys.loads.detail(id) as unknown as any[], `/loads/${id}`, {
    enabled: !!id,
  });
};

export const useDriverAssignedLoads = (filters = {}): any => {
  return useGet(
    queryKeys.driverLoads.list(filters) as unknown as any[],
    '/driver/loads/assigned',
    { enabled: true, queryParams: filters }
  );
};

export const useDriverLoadDecision = (loadId: string | number, options = {}) => {
  return usePatch(
    queryKeys.driverLoads.detail(loadId) as unknown as any[],
    `/driver/loads/${loadId}/decision`,
    {
      successMessage: 'Decision submitted successfully',
      ...options,
    }
  );
};

export const useDriverActiveLoads = (filters = {}): any => {
  return useGet(
    queryKeys.driverLoads.active() as unknown as any[],
    '/driver/loads/active',
    {
      enabled: true,
      queryParams: filters,
    }
  );
};

export const useDriverLoadLocationStatus = (
  loadId: string | number,
  options = {}
): Record<string, any> => {
  return usePatch(
    queryKeys.driverLoads.locationStatus(loadId) as unknown as any[],
    `/driver/loads/${loadId}/events/status`,
    {
      successMessage: 'Events status updated successfully',
      ...options,
    }
  );
};

export const useUpdateDriverLoadReturnInfo = (
  loadId: string | number,
  options = {}
): Record<string, any> => {
  return usePatch(
    queryKeys.driverLoads.returnInfo(loadId) as unknown as any[],
    `/driver/loads/${loadId}/complete`,
    {
      successMessage: 'Return info updated successfully',
      ...options,
    }
  );
};

export const useLoadRouting = (id: string | number) => {
  return useGet(
    [...queryKeys.loads.detail(id), 'routing'] as unknown as any[],
    `/loads/${id}/routing`,
    {
      enabled: !!id,
    }
  );
};

export const useDriverStartLoadRoutingMove = (id: string | number, options = {}): Record<string, any> => {
  return usePatch(
    [...queryKeys.driverLoads.detail(id), 'routing'] as unknown as any[],
    `/driver/loads/${id}/start`,
    {
      successMessage: 'Load routing move started successfully',
      ...options,
    }
  );
};

export const useChassis = (companyId: string | null, options = {}): any => {
  return useGet(
    ['chassis', companyId] as unknown as any[],
    '/chassis',
    {
      enabled: !!companyId,
      queryParams: companyId ? { companyId, limit: 100 } : {},
      ...options,
    }
  );
};

export const useCreateLoadDocument = (loadId: string | number, options = {}): Record<string, any> => {
  return usePost(
    [...queryKeys.loads.detail(loadId), 'documents'] as unknown as any[],
    `/loads/${loadId}/documents`,
    {
      successMessage: 'Load document created successfully',
      ...options,
    }
  );
};

export const useLoadDocuments = (loadId: string | number) => {
  return useGet(
    [...queryKeys.loads.detail(loadId), 'documents'] as unknown as any[],
    `/loads/${loadId}/documents`,
    {
      enabled: !!loadId,
    }
  );
};

export const useUpdateLoadDocument = (loadId: string | number, options = {}): Record<string, any> => {
  return usePatch(
    [...queryKeys.loads.detail(loadId), 'documents'] as unknown as any[],
    `/loads/${loadId}/documents`,
    {
      successMessage: 'Load document updated successfully',
      ...options,
    }
  );
};

export const useDeleteLoadDocument = (loadId: string | number, options = {}): Record<string, any> => {
  return useDelete(
    [...queryKeys.loads.detail(loadId), 'documents'] as unknown as any[],
    `/loads/${loadId}/documents`,
    {
      successMessage: 'Load document deleted successfully',
      ...options,
    }
  );
};

