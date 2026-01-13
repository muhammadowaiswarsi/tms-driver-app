import { queryKeys } from '../lib/react-query';
import { useGet } from './useApi';

// Get all drivers for a company (without pagination)
export const useAllDriversByCompany = (companyId: string | number | null | undefined, filters = {}): any => {
  return useGet(
    queryKeys.drivers.list({ companyId, ...filters }) as unknown as any[],
    '/drivers',
    {
      enabled: !!companyId,
      queryParams: { companyId, limit: 100, ...filters },
    }
  );
};
