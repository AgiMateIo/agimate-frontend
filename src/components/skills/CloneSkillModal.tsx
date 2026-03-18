'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService, { ApiError } from '@/services/api';
import { SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface CloneSkillModalProps {
  skill: SkillResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloneSkillModal({
  skill,
  onClose,
  onSuccess,
}: CloneSkillModalProps) {
  const t = useTranslations('Skills');
  const [mode, setMode] = useState<'confirm' | 'rename'>('confirm');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiService.cloneSkill(skill.id);
      onSuccess();
    } catch (err) {
      // Check if it's a 409 conflict (skill name already exists)
      if (err instanceof ApiError && err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already exists') || msg.includes('conflict')) {
          setMode('rename');
          setError(null);
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to clone skill');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneWithRename = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const detail = await apiService.getSkill(skill.id);
      const modifiedMd = replaceNameInFrontmatter(detail.skillMd, newName.trim());
      await apiService.createSkill({
        skillMd: modifiedMd,
        type: skill.type,
        isPublic: false,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone skill');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'rename') {
    return (
      <Modal isOpen={true} onClose={onClose} title={t('cloneConflictTitle')} size="md">
        <form onSubmit={handleCloneWithRename} className="space-y-4">
          <p className="text-sm text-muted">
            {t('cloneConflictMessage')}
          </p>

          <FormField label={t('name')} required>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('cloneNewNamePlaceholder')}
              required
              maxLength={100}
              autoFocus
            />
          </FormField>

          {error && <ErrorAlert>{error}</ErrorAlert>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !newName.trim()}
              loading={loading}
              className="flex-1"
            >
              {t('cloneSkill')}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('cloneSkill')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('cloneConfirm', { name: skill.name })}
        </p>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleClone}
            loading={loading}
            className="flex-1"
          >
            {t('cloneSkill')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function replaceNameInFrontmatter(skillMd: string, newName: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = skillMd.match(frontmatterRegex);
  if (!match) return skillMd;

  const frontmatter = match[1];
  const updatedFrontmatter = frontmatter.replace(
    /^name:\s*.+$/m,
    `name: ${newName}`
  );

  return skillMd.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
}
