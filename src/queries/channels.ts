import { queryOptions } from '@tanstack/react-query';
import apiService from '@/services/api';

export const channelKeys = {
  all: ['channels'] as const,
  list: () => [...channelKeys.all, 'list'] as const,
};

export const channelsListOptions = () =>
  queryOptions({
    queryKey: channelKeys.list(),
    queryFn: () => apiService.getChannels(),
  });
