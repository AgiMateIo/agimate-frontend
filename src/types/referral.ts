// Referral links: one permanent code per user, and how many accounts were
// created with it.
//
// The code carries no reward — `invitedCount` is a counter, nothing is credited
// to either side — and it never grants access: an invited account is created as
// a GUEST and waits for approval like any other.

export interface ReferralResponse {
  // Eight characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (no I, L, O, U, so
  // it survives being read aloud). Permanent for the user.
  code: string;
  // Accounts created with this code. Existing accounts are never re-attributed.
  invitedCount: number;
}
