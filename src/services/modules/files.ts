// modules/files.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type { PagedResponse, UserFileResponse, UserFilesFilters } from '@/types';

export const filesApi = {
  // The one upload endpoint of the file layer — chat attachments, board
  // attachments and anything added later go through it (webchat's own
  // `POST /manage/webchat/files` is gone). The answer is the same file row the
  // listing returns, so `id` is immediately usable as `parts[].fileId`.
  //
  // `origin` labels the place in the UI the file came from ('chat', 'board').
  // It is stored as `user:<label>` and comes back in the listing; the alphabet
  // is narrow ([a-z0-9][a-z0-9_-]{0,31}, otherwise 400) because the column is
  // shared with server-side provenance (`telegram:<id>`, `media:<model>`) and
  // the `user:` prefix is what stops an upload from passing itself off as a
  // connector.
  //
  // Uploading binds the file to nothing: it lives in the account until
  // something references its id — deliberate, since the upload precedes the
  // send and there is no recipient yet.
  //
  // Limits: 50 MB per file, 500 MB a day, 30 uploads a minute. A 400 carries a
  // user-ready reason (size cap or exhausted quota); 429 is the rate limit.
  async uploadUserFile(file: File, origin?: string): Promise<UserFileResponse> {
    const form = new FormData();
    form.append('file', file);
    if (origin) form.append('origin', origin);
    return httpClient.postForm<UserFileResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/files`,
      form,
    );
  },

  // Newest first, fixed — there is no sort parameter. Every response signs the
  // `url` of each row anew, so a stale page means stale links, not stale rows.
  // The selection uses the same conditions as opening a file, so the list never
  // offers a row that would then refuse to download.
  async getUserFiles(
    filters: UserFilesFilters = {},
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<UserFileResponse>> {
    const query = buildPagedQuery(
      { agentId: filters.agentId, sessionId: filters.sessionId, name: filters.name },
      params,
    );
    return httpClient.get<PagedResponse<UserFileResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/files/?${query}`,
    );
  },

  // The row disappears at once; the bytes go within ~a minute, so links handed
  // out earlier may still resolve briefly. Afterwards `agf_` references in
  // history stop resolving exactly as they do when a file expires. 404 =
  // already gone — treat it as success and re-read the list.
  async deleteUserFile(fileId: string): Promise<void> {
    await httpClient.delete<null>(
      `${API.ENDPOINTS.CONTROL_API}/manage/files/${fileId}`,
    );
  },
};
