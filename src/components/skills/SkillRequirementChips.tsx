'use client';

import { Chip, type ChipTone } from '@/components/ui/Chip';
import type { SkillConnectorRequirement } from '@/types';

// The requirements a skill declares, as a row of pills: the caption the wizard
// will show (title, else the key, else the connector name), with the
// connector, the key and the pre-filled address in the tooltip. Keyed by the
// requirement key — two MCP servers share a code.
export default function SkillRequirementChips({
  requirements,
  nameOf,
  tone = 'accent',
}: {
  requirements: SkillConnectorRequirement[];
  // Connector display name by code; falls back to the code.
  nameOf?: (code: string) => string;
  tone?: ChipTone;
}) {
  if (requirements.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {requirements.map((r) => {
        const key = r.key ?? r.code;
        const name = nameOf?.(r.code) ?? r.code;
        const url = r.params?.url;
        const details = [name, key !== r.code ? key : null, url].filter(Boolean).join(' · ');
        return (
          <Chip key={key} strong tone={tone} title={details}>
            {r.title ?? (key !== r.code ? key : name)}
          </Chip>
        );
      })}
    </div>
  );
}
