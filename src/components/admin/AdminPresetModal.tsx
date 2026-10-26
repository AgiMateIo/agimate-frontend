'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormField, Input, Select, TextArea } from '@/components/ui/FormField';
import { FilterPill } from '@/components/ui/FilterPill';
import { Toggle } from '@/components/ui/Toggle';
import {
  StarterListEditor,
  hasDuplicateStarters,
  starterTexts,
  toStarterRows,
  type StarterRow,
} from '@/components/agents/StarterListEditor';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useTaxonomyQuery } from '@/queries/taxonomy';
import { OTHER_CATEGORY } from '@/utils/taxonomy';
import {
  STARTER_LIMITS,
  type AdminAgentPresetRequest,
  type AdminAgentPresetResponse,
  type AgentType,
  type PresetCatalogLocale,
} from '@/types';

const AGENT_TYPES: AgentType[] = ['GENERIC', 'CENTRIFUGO', 'WEBHOOK', 'MCP'];
const PRESET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Split on commas, spaces or new lines: names are slugs, so none of those can
// be part of one.
const parseNames = (value: string) => value.split(/[\s,]+/).filter(Boolean);

// One form for both creating and editing a preset of one catalog. The whole
// form is sent on save; PATCH treats every field as "set to this".
export default function AdminPresetModal({
  locale,
  preset,
  onClose,
  onSaved,
}: {
  locale: PresetCatalogLocale;
  // null = create.
  preset: AdminAgentPresetResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const { data: taxonomy } = useTaxonomyQuery();

  const [name, setName] = useState(preset?.name ?? '');
  const [title, setTitle] = useState(preset?.title ?? '');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [instructions, setInstructions] = useState(preset?.instructions ?? '');
  const [greeting, setGreeting] = useState(preset?.greeting ?? '');
  const [starters, setStarters] = useState<StarterRow[]>(toStarterRows(preset?.starters ?? []));
  const [skillNames, setSkillNames] = useState(
    (preset?.skillNames ?? preset?.skills.map((s) => s.name) ?? []).join(', '),
  );
  const [agentType, setAgentType] = useState<AgentType | ''>(preset?.agentType ?? '');
  const [category, setCategory] = useState(preset?.category ?? OTHER_CATEGORY);
  const [tags, setTags] = useState<string[]>(preset?.tags ?? []);
  const [sortOrder, setSortOrder] = useState(String(preset?.sortOrder ?? 0));
  const [enabled, setEnabled] = useState(preset?.enabled ?? true);

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess: onSaved,
    defaultError: t('presetSaveFailed'),
  });

  const nameInvalid = !preset && name !== '' && !PRESET_NAME.test(name);
  const canSave =
    title.trim() !== '' &&
    (preset !== null || PRESET_NAME.test(name)) &&
    !hasDuplicateStarters(starters);

  const toggleTag = (code: string) =>
    setTags((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const body: AdminAgentPresetRequest = {
        title: title.trim(),
        description: description.trim(),
        instructions,
        // An empty string clears the greeting on PATCH.
        greeting: greeting.trim(),
        starters: starterTexts(starters),
        skillNames: parseNames(skillNames),
        agentType: agentType || null,
        category,
        tags,
        sortOrder: Number(sortOrder) || 0,
        enabled,
      };
      if (preset) {
        await apiService.updateAdminAgentPreset(locale, preset.id, body);
      } else {
        await apiService.createAdminAgentPreset(locale, { ...body, name });
      }
    });

  return (
    <Modal
      isOpen
      onClose={loading ? () => {} : onClose}
      title={preset ? t('presetEditTitle', { name: preset.name }) : t('presetCreateTitle')}
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-muted">{t('presetCatalogNote', { locale: locale.toUpperCase() })}</p>

        <FormField
          label={t('presetName')}
          required={!preset}
          hint={preset ? t('presetNameImmutable') : t('presetNameHint')}
          error={nameInvalid ? t('presetNameInvalid') : undefined}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            readOnly={!!preset}
            disabled={loading || !!preset}
            className="font-mono"
          />
        </FormField>

        <FormField label={t('presetTitle')} required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
        </FormField>

        <FormField label={t('presetDescription')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </FormField>

        <FormField label={t('presetInstructions')} hint={t('presetInstructionsHint')}>
          <TextArea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={loading}
            rows={14}
            className="font-mono"
          />
        </FormField>

        <FormField label={t('presetGreeting')} hint={t('presetCopiedOnCreate')}>
          <TextArea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            disabled={loading}
            maxLength={STARTER_LIMITS.greetingLength}
            rows={3}
          />
        </FormField>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">{t('presetStarters')}</label>
          <StarterListEditor rows={starters} onChange={setStarters} disabled={loading} />
        </div>

        <FormField label={t('presetSkills')} hint={t('presetSkillsHint')}>
          <Input
            value={skillNames}
            onChange={(e) => setSkillNames(e.target.value)}
            disabled={loading}
            className="font-mono"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('presetAgentType')}>
            <Select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value as AgentType | '')}
              disabled={loading}
            >
              <option value="">{t('presetAgentTypeDefault')}</option>
              {AGENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('presetCategory')}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading}>
              {/* A code the dictionary dropped still has to be shown as what it is. */}
              {!taxonomy?.categories.some((c) => c.code === category) && (
                <option value={category}>{category}</option>
              )}
              {taxonomy?.categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('presetSortOrder')}>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={loading}
            />
          </FormField>
        </div>

        {taxonomy && taxonomy.tagGroups.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{t('presetTags')}</label>
            <div className="space-y-2">
              {taxonomy.tagGroups.map((group) => (
                <div key={group.code} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-muted">{group.label}</span>
                  {group.tags.map((tag) => (
                    <FilterPill
                      key={tag.code}
                      active={tags.includes(tag.code)}
                      onClick={() => toggleTag(tag.code)}
                      disabled={loading}
                    >
                      {tag.label}
                    </FilterPill>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <Toggle checked={enabled} onChange={setEnabled} disabled={loading} label={t('presetEnabled')} />

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!canSave || loading}>
            {preset ? tCommon('save') : t('presetCreate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
