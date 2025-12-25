import { useGet } from './useApi';
import { queryKeys } from '../lib/react-query';

// Get all chassis with filters
export const useChassis = (filters = {}) => {
  return useGet(
    queryKeys.chassis.list(filters),
    '/chassis',
    {
      enabled: true,
      queryParams: filters,
    }
  );
};

