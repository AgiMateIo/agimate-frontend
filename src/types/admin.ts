// Admin section types (the user directory and per-user token spend).
//
// Two services back the one screen: the directory and role changes come from
// user-api, token usage from control-api. There is no join on the backend — the
// two are stitched together by user id on the client.

export type UserRole = 'GUEST' | 'USER' | 'ADMIN';

export interface AdminUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  // May be absent — a user without one only ever matches `search` on email.
  displayName: string | null;
  role: UserRole;
  // Backend format "yyyy-MM-dd HH:mm:ss", server time without a zone.
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserFilters {
  // Case-insensitive substring of email or display name.
  search?: string;
  // Exact match on the role.
  role?: UserRole;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}
