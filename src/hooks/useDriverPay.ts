import { queryKeys } from '../lib/react-query';
import { useGet } from './useApi';

export const useDriverPaySummary = (period = 'week'): any => {
  return useGet(
    queryKeys.driverPay.summary(period) as unknown as any[],
    '/driver/pay',
    { enabled: true, queryParams: { period } },
  );
};

export const useDriverLoadPay = (loadId: string | number | null | undefined): any => {
  return useGet(
    queryKeys.driverPay.byLoad(loadId || '') as unknown as any[],
    loadId ? `/driver/pay/${loadId}` : '/driver/pay',
    { enabled: !!loadId },
  );
};
