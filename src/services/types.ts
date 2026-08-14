// types.ts
export interface User {
  id?: string;
  email?: string;
  displayName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  lastLoginAt?: string;
  firstName?: string;
  lastName?: string;
  // Id of whoever's referral link this account was created with, null when it
  // came in on its own. Only an id — resolving it to a name costs another
  // request to GET /user/user/{id}.
  referredBy?: string | null;
}