'use client';

import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import SkillCard from '@/components/skills/SkillCard';
import { useConnectorSkillsQuery } from '@/queries/skills';
import { getErrorMessage } from '@/utils/error';

interface ConnectionSkillsTabProps {
  connectorCode: string;
}

// Every skill that declares this connector — own and public in one list. The
// distinction stays visible on the card (SkillCard badges public skills), so a
// segmented control only made the set harder to scan.
export default function ConnectionSkillsTab({ connectorCode }: ConnectionSkillsTabProps) {
  const t = useTranslations('ConnectionDetail');

  const { skills, isPending, error, truncated } = useConnectorSkillsQuery(connectorCode);

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('loadingSkills')}</div>;
  }

  if (error) {
    return <ErrorAlert>{getErrorMessage(error, 'Failed to load skills')}</ErrorAlert>;
  }

  if (skills.length === 0) {
    return <div className="text-center py-12 text-muted">{t('noSkills')}</div>;
  }

  return (
    <div className="space-y-4">
      {truncated && <Alert variant="info">{t('skillsTruncated')}</Alert>}

      <div className="space-y-3">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} href={`/dashboard/skills/${skill.id}`} />
        ))}
      </div>
    </div>
  );
}
