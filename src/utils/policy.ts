import type { AgentConnectionPolicyResponse } from '@/types';

// A rule's origin. The backend writes `source = "skill:<skillId>"` on the rows a
// skill's declaration puts on a binding; a PATCH erases it, and from then on
// the rule is the user's — the skill neither updates nor removes it. Every
// other value (null, or something a later backend may invent) reads as
// user-owned here.
const SKILL_SOURCE_PREFIX = 'skill:';

export function policySkillId(policy: Pick<AgentConnectionPolicyResponse, 'source'>): string | null {
  const source = policy.source;
  return source && source.startsWith(SKILL_SOURCE_PREFIX)
    ? source.slice(SKILL_SOURCE_PREFIX.length)
    : null;
}
