'use client';

import { useTranslations } from 'next-intl';
import type { SkillAccessRules, SkillConnectorRequirement } from '@/types';

// The access rules a requirement declares, in one line per kind: "Allowed
// tools: a, b" or "Denied tools: x". An allow entry with params shows the
// filter beside the name, since that is what makes it narrower than the name.
export default function SkillAccessRulesSummary({
  requirement,
}: {
  requirement: Pick<SkillConnectorRequirement, 'tools' | 'triggers'>;
}) {
  const t = useTranslations('Skills');
  const lines: { key: string; text: string }[] = [];
  const describe = (kind: 'tools' | 'triggers', rules: SkillAccessRules | null | undefined) => {
    if (!rules) return;
    if (rules.allow) {
      const list = rules.allow
        .map((r) =>
          r.params && Object.keys(r.params).length > 0
            ? `${r.name} ${JSON.stringify(r.params)}`
            : r.name,
        )
        .join(', ');
      lines.push({ key: kind, text: t(`${kind}Allow`, { list }) });
    } else if (rules.deny) {
      lines.push({ key: kind, text: t(`${kind}Deny`, { list: rules.deny.join(', ') }) });
    }
  };
  describe('tools', requirement.tools);
  describe('triggers', requirement.triggers);
  if (lines.length === 0) return null;
  return (
    <ul className="text-xs text-muted space-y-0.5">
      {lines.map((l) => (
        <li key={l.key} className="break-words">{l.text}</li>
      ))}
    </ul>
  );
}
