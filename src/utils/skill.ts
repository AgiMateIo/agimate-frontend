import { SkillDetailResponse } from '@/types';

// The detail endpoint returns the SKILL.md body without frontmatter, plus
// name/description/connectors as separate fields. To edit a skill we must send
// the full SKILL.md back (frontmatter + body) as `skillMd`, so reconstruct a
// canonical frontmatter block here from those fields.
export function buildSkillMd(skill: Pick<SkillDetailResponse, 'name' | 'title' | 'description' | 'connectorCodes' | 'mdContent'>): string {
  const lines = ['---', `name: ${skill.name}`, `title: ${skill.title}`];
  if (skill.description) lines.push(`description: ${skill.description}`);
  if (skill.connectorCodes.length > 0) lines.push(`connectors: [${skill.connectorCodes.join(', ')}]`);
  lines.push('---', '', skill.mdContent);
  return lines.join('\n');
}
