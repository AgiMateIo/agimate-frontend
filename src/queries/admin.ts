import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { AdminUserResponse, PagedResponse, UserRole } from '@/types';

// 'ALL' is the UI's "no filter" value — the request omits `role` entirely.
export type RoleFilter = UserRole | 'ALL';

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (search: string, role: RoleFilter, page: number, size: number) =>
    [...adminKeys.users(), 'list', search, role, page, size] as const,
  usage: (userId: string) => [...adminKeys.all, 'usage', userId] as const,
};

export const adminUsersListOptions = (
  search: string,
  role: RoleFilter,
  page: number,
  size: number,
) =>
  queryOptions({
    queryKey: adminKeys.userList(search, role, page, size),
    queryFn: () =>
      apiService.getAdminUsers({
        search: search || undefined,
        role: role === 'ALL' ? undefined : role,
        page,
        size,
      }),
  });

export function useAdminUsersQuery(
  search: string,
  role: RoleFilter,
  page: number,
  size: number,
) {
  return useSuspenseQuery(adminUsersListOptions(search, role, page, size));
}

// Non-suspense: usage is one request per user (there is no batch endpoint), lives
// in a second service, and must never take down the directory it is nested in.
// Laziness comes from mounting — the caller renders it only for an expanded row.
export function useAdminUserUsageQuery(userId: string) {
  return useQuery({
    queryKey: adminKeys.usage(userId),
    queryFn: () => apiService.getAdminUserLlmUsage(userId),
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      apiService.updateAdminUserRole(id, { role }),
    // The response carries the updated user, so patch the cached pages in place
    // instead of invalidating: the list is ordered by registration date, so a
    // role change never moves a row. Under an active role filter the row then
    // shows a role it no longer matches until the next fetch — deliberate, so
    // the result and the propagation notice stay on screen instead of the row
    // vanishing from under the admin who just changed it.
    onSuccess: (updated) => {
      queryClient.setQueriesData<PagedResponse<AdminUserResponse>>(
        { queryKey: adminKeys.users() },
        (page) =>
          page
            ? {
                ...page,
                content: page.content.map((u) => (u.id === updated.id ? updated : u)),
              }
            : page,
      );
    },
  });
}
