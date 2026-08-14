import { queryOptions, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';

export const referralKeys = {
  all: ['referral'] as const,
  me: () => [...referralKeys.all, 'me'] as const,
};

// The code is permanent and `invitedCount` moves only when somebody else signs
// up, so this is worth keeping around for the session rather than refetching.
export const referralOptions = () =>
  queryOptions({
    queryKey: referralKeys.me(),
    queryFn: () => apiService.getReferral(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/**
 * Deliberately non-suspense: the invite block is one card on a page that is not
 * about invites, and the endpoint answers 403 to an account still awaiting
 * approval — a failure has to stay inside the card.
 *
 * `enabled` is how the caller keeps that 403 from being requested at all.
 */
export function useReferralQuery(enabled = true) {
  return useQuery({ ...referralOptions(), enabled });
}
