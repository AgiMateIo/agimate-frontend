// modules/admin.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AdminUserFilters,
  AdminUserResponse,
  LlmUsageResponse,
  PagedResponse,
  UpdateUserRoleRequest,
} from '@/types';

// The admin area is gated by path prefix on both services — everything under
// `user/admin/…` and `control/manage/admin/…` answers 403 to a non-ADMIN caller,
// so any endpoint added here inherits the gate.
export const adminApi = {
  // Newest first; there is no sort parameter. A `size` above 100 is silently
  // capped by the backend, so the returned page `size` is the authoritative one.
  async getAdminUsers(
    params?: AdminUserFilters & { page?: number; size?: number },
  ): Promise<PagedResponse<AdminUserResponse>> {
    const query = buildPagedQuery({ search: params?.search, role: params?.role }, params);
    return httpClient.get<PagedResponse<AdminUserResponse>>(
      `${API.ENDPOINTS.USER_API}/admin/users/?${query}`,
    );
  },

  // Returns the updated user. 400 when an admin targets their own row — the
  // platform must never be left without an admin. Sending the role a user
  // already has is a success without changes.
  async updateAdminUserRole(
    id: string,
    data: UpdateUserRoleRequest,
  ): Promise<AdminUserResponse> {
    return httpClient.patch<AdminUserResponse>(
      `${API.ENDPOINTS.USER_API}/admin/users/${id}/role`,
      data,
    );
  },

  // The same shape as the caller's own usage, for the user in the path. Never
  // 404s: control-api does not own the user directory, so an unknown id answers
  // with the platform provider at zero. An empty array is legal too — the user
  // has neither the platform provider nor a key of their own.
  async getAdminUserLlmUsage(userId: string): Promise<LlmUsageResponse[]> {
    return httpClient.get<LlmUsageResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/admin/llm-usage/${userId}/`,
    );
  },
};
