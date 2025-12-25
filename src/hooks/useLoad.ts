import { queryKeys } from '../lib/react-query';
import { useGet, usePost, usePut, usePatch, useDelete } from './useApi';

export const useLoads = (filters = {}): any => {
  return useGet(queryKeys.loads.list(filters), '/loads', {
    enabled: true,
    queryParams: filters,
  });
};

export const useLoad = (id: any) => {
  return useGet(queryKeys.loads.detail(id), `/loads/${id}`, {
    enabled: !!id,
  });
};

export const useDriverAssignedLoads = (filters = {}): any => {
  return useGet(
    queryKeys.driverLoads.list(filters),
    '/driver/loads/assigned',
    { enabled: true, queryParams: filters }
  );
};

export const useDriverLoadDecision = (loadId: string | number, options = {}) => {
  return usePatch(
    queryKeys.driverLoads.detail(loadId),
    `/driver/loads/${loadId}/decision`,
    {
      successMessage: 'Decision submitted successfully',
      ...options,
    }
  );
};

export const useDriverActiveLoads = (filters = {}): any => {
  return useGet(
    queryKeys.driverLoads.active(),
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
    queryKeys.driverLoads.locationStatus(loadId),
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
    queryKeys.driverLoads.returnInfo(loadId),
    `/driver/loads/${loadId}/complete`,
    {
      successMessage: 'Return info updated successfully',
      ...options,
    }
  );
};

export const useLoadRouting = (id: string | number) => {
  return useGet(
    [...queryKeys.loads.detail(id), 'routing'],
    `/loads/${id}/routing`,
    {
      enabled: !!id,
    }
  );
};

export const useDriverStartLoadRoutingMove = (id: string | number, options = {}): Record<string, any> => {
  return usePatch(
    [...queryKeys.driverLoads.detail(id), 'routing'],
    `/driver/loads/${id}/start`,
    {
      successMessage: 'Load routing move started successfully',
      ...options,
    }
  );
};

