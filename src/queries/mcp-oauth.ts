import { queryOptions } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { McpAuthorizationParams } from '@/types';

export const mcpOauthKeys = {
  all: ['mcp-oauth'] as const,
  check: (query: string) => [...mcpOauthKeys.all, 'check', query] as const,
};

// Validation of one consent request. Keyed by the raw query: the page has no
// state of its own, the query is the request. Never cached past the page.
export const mcpAuthorizeCheckOptions = (query: string, params: McpAuthorizationParams) =>
  queryOptions({
    queryKey: mcpOauthKeys.check(query),
    queryFn: () => apiService.checkMcpAuthorization(params),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
