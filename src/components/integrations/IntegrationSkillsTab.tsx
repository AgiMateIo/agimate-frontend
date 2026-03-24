'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillResponse, SkillConnectorResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate } from '@/utils/date';

interface SkillWithBindings {
  skill: SkillResponse;
  bindings: SkillConnectorResponse[];
}

interface IntegrationSkillsTabProps {
  connectorCode: string;
}

export default function IntegrationSkillsTab({ connectorCode }: IntegrationSkillsTabProps) {
  const t = useTranslations('IntegrationDetail');
  const tSkills = useTranslations('Skills');
  const locale = useLocale();

  const [linkedSkills, setLinkedSkills] = useState<SkillWithBindings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Fetch all user skills
      const skillsData = await apiService.getSkills({ size: 100 });
      const skills = skillsData.content;

      if (skills.length === 0) {
        setLinkedSkills([]);
        return;
      }

      // Fetch connector bindings for each skill in parallel
      const bindingsResults = await Promise.all(
        skills.map(skill =>
          apiService.getSkillConnectors(skill.id)
            .then(bindings => ({ skill, bindings }))
            .catch(() => ({ skill, bindings: [] as SkillConnectorResponse[] }))
        )
      );

      // Filter skills that have a binding matching this connector
      const matched = bindingsResults.filter(({ bindings }) =>
        bindings.some(b => b.connectorCode === connectorCode)
      );

      setLinkedSkills(matched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, [connectorCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingSkills')}</div>;
  }

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (linkedSkills.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {t('noLinkedSkills')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {linkedSkills.map(({ skill, bindings }) => {
        const relevantBindings = bindings.filter(b => b.connectorCode === connectorCode);

        return (
          <Link
            key={skill.id}
            href={`/dashboard/skills/${skill.id}`}
            className="block bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {skill.isPublic && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                      {tSkills('public')}
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    {tSkills('version', { version: skill.version })}
                  </span>
                </div>

                <h3 className="font-medium text-foreground mt-1">{skill.name}</h3>

                {skill.description && (
                  <p className="text-sm text-muted mt-0.5 line-clamp-2">{skill.description}</p>
                )}

                {/* Show relevant bindings */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {relevantBindings.map(b => (
                    <span
                      key={b.id}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        b.type === 'TOOL'
                          ? 'bg-primary/10 text-primary'
                          : b.type === 'TRIGGER'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {b.type ? `${b.type}${b.name ? `: ${b.name}` : ''}` : t('connectorBinding')}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-muted mt-2">
                  {tSkills('updatedAt')}: {formatDate(skill.updatedAt, locale)}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
