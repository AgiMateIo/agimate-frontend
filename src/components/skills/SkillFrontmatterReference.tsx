'use client';

import { useTranslations } from 'next-intl';
import { useTaxonomyQuery } from '@/queries/taxonomy';
import { frontmatterCode } from '@/utils/taxonomy';

// The dictionary in the form the SKILL.md frontmatter takes, next to the
// editor: an unknown `category:` or tag is a 400, and the codes are not
// guessable from the labels.
export default function SkillFrontmatterReference() {
  const t = useTranslations('Taxonomy');
  const { data: taxonomy } = useTaxonomyQuery();
  if (!taxonomy || taxonomy.categories.length === 0) return null;

  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer select-none hover:text-foreground">
        {t('frontmatterReference')}
      </summary>
      <dl className="mt-2 space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
        <div>
          <dt className="font-medium text-foreground">{t('frontmatterCategories')}</dt>
          <dd className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {taxonomy.categories.map((c) => (
              <span key={c.code}>
                <code className="text-foreground">{frontmatterCode(c.code)}</code> — {c.label}
              </span>
            ))}
          </dd>
        </div>
        {taxonomy.tagGroups.map((group) => (
          <div key={group.code}>
            <dt className="font-medium text-foreground">
              {t('frontmatterTags')}: {group.label}
            </dt>
            <dd className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {group.tags.map((tag) => (
                <span key={tag.code}>
                  <code className="text-foreground">{frontmatterCode(tag.code)}</code> — {tag.label}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
