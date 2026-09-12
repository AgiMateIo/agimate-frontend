import type { SkillConnectorRequirement, SkillDetailResponse, SkillResponse } from '@/types';

// The requirements a skill declares, in declaration order. A backend that
// predates requirements answers with codes alone, and a bare code is the short
// form `{code, key: code}` — so the two shapes read the same from here on.
export function skillRequirements(
  skill: Pick<SkillResponse, 'connectorCodes'> & { connectors?: SkillConnectorRequirement[] },
): SkillConnectorRequirement[] {
  if (skill.connectors) return skill.connectors;
  return skill.connectorCodes.map((code) => ({ code, key: code }));
}

// True when the requirement is the short form: nothing but a code, keyed by
// itself. Only such a requirement round-trips as a bare code in SKILL.md.
export function isBareRequirement(r: SkillConnectorRequirement): boolean {
  return (
    (r.key ?? r.code) === r.code &&
    !r.title &&
    !r.params &&
    !r.tools &&
    !r.triggers
  );
}

// A YAML plain scalar is only safe for the tame subset (a slug, a URL without
// spaces); anything else — spaces, punctuation YAML reads as structure, a
// value that would parse as a number or a boolean — goes double-quoted, and a
// JSON string is a valid YAML double-quoted scalar.
const PLAIN_SCALAR = /^[A-Za-z_][A-Za-z0-9_./:@+-]*$/;
const LOOKS_TYPED = /^(true|false|null|yes|no|on|off|~)$/i;

function scalar(value: string): string {
  return PLAIN_SCALAR.test(value) && !LOOKS_TYPED.test(value) ? value : JSON.stringify(value);
}

// One SKILL.md `connectors:` entry. The short form stays a bare code; the
// object form is block YAML with the rule lists in flow style, where an
// allow-entry with params is emitted as JSON — a valid YAML flow mapping, and
// the one way to write an arbitrary `params` object without a YAML emitter.
function requirementLines(r: SkillConnectorRequirement): string[] {
  if (isBareRequirement(r)) return [`  - ${scalar(r.code)}`];
  const lines = [`  - code: ${scalar(r.code)}`];
  const key = r.key ?? r.code;
  if (key !== r.code) lines.push(`    key: ${scalar(key)}`);
  if (r.title) lines.push(`    title: ${scalar(r.title)}`);
  if (r.params && Object.keys(r.params).length > 0) {
    lines.push('    params:');
    for (const [field, value] of Object.entries(r.params)) {
      lines.push(`      ${scalar(field)}: ${scalar(value)}`);
    }
  }
  for (const [kind, rules] of [['tools', r.tools], ['triggers', r.triggers]] as const) {
    if (!rules) continue;
    lines.push(`    ${kind}:`);
    if (rules.allow) {
      const entries = rules.allow.map((rule) =>
        rule.params && Object.keys(rule.params).length > 0
          ? JSON.stringify({ name: rule.name, params: rule.params })
          : scalar(rule.name),
      );
      lines.push(`      allow: [${entries.join(', ')}]`);
    } else if (rules.deny) {
      lines.push(`      deny: [${rules.deny.map(scalar).join(', ')}]`);
    }
  }
  return lines;
}

// The detail endpoint returns the SKILL.md body without frontmatter, plus
// name/description/connectors as separate fields. To edit a skill we must send
// the full SKILL.md back (frontmatter + body) as `skillMd`, so reconstruct a
// canonical frontmatter block here from those fields. Canonical matters twice:
// the detail page's dirty check compares against this output, and a keyed or
// parameterised requirement must survive a body edit — writing codes alone
// would silently strip the author's keys, pre-fills and access rules.
export function buildSkillMd(
  skill: Pick<SkillDetailResponse, 'name' | 'title' | 'description' | 'connectorCodes' | 'mdContent'> & {
    connectors?: SkillConnectorRequirement[];
  },
): string {
  const lines = ['---', `name: ${skill.name}`, `title: ${skill.title}`];
  if (skill.description) lines.push(`description: ${skill.description}`);
  const requirements = skillRequirements(skill);
  if (requirements.length > 0) {
    if (requirements.every(isBareRequirement)) {
      lines.push(`connectors: [${requirements.map((r) => r.code).join(', ')}]`);
    } else {
      lines.push('connectors:', ...requirements.flatMap(requirementLines));
    }
  }
  lines.push('---', '', skill.mdContent);
  return lines.join('\n');
}
