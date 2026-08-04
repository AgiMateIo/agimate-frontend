// modules/files.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type { PagedResponse, UserFileResponse, UserFilesFilters } from '@/types';

export const filesApi = {
  // Newest first, fixed — there is no sort parameter. Every response signs the
  // `url` of each row anew, so a stale page means stale links, not stale rows.
  async getUserFiles(
    filters: UserFilesFilters = {},
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<UserFileResponse>> {
    const query = buildPagedQuery(
      { agentId: filters.agentId, name: filters.name },
      params,
    );
    return httpClient.get<PagedResponse<UserFileResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/files/?${query}`,
    );
  },

  // The row disappears at once; the bytes go within ~a minute, so links handed
  // out earlier may still resolve briefly. 404 = already gone — treat it as
  // success and re-read the list.
  async deleteUserFile(fileId: string): Promise<void> {
    await httpClient.delete<null>(
      `${API.ENDPOINTS.CONTROL_API}/manage/files/${fileId}`,
    );
  },
};
