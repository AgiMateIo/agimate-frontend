'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import apiService from '@/services/api';
import type { TaskType, BoardTask } from '@/types';
import { TASK_TYPES } from '@/types';

interface CreateTaskModalProps {
  boardPubId: string;
  allTasks: BoardTask[];
  agentMap: Map<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({
  boardPubId,
  allTasks,
  agentMap,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const t = useTranslations('Board');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('TASK');
  const [createdByAgentPubId, setCreatedByAgentPubId] = useState('');
  const [assigneeAgentPubId, setAssigneeAgentPubId] = useState('');
  const [parentTaskPubId, setParentTaskPubId] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm<BoardTask>({
    onSuccess: () => onSuccess(),
    defaultError: t('createTaskError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createBoardTask(boardPubId, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        createdByAgentPubId,
        assigneeAgentPubId: assigneeAgentPubId || undefined,
        parentTaskPubId: parentTaskPubId || undefined,
      })
    );

  const agentEntries = Array.from(agentMap.entries());

  // Filter parent task options based on type hierarchy
  const parentOptions = allTasks.filter((task) => {
    if (type === 'EPIC') return false; // EPICs can't have parents
    if (type === 'TASK') return task.type === 'EPIC'; // TASK parent must be EPIC
    if (type === 'SUBTASK') return task.type === 'TASK'; // SUBTASK parent must be TASK
    return false;
  });

  // SUBTASK must have a parent
  const parentRequired = type === 'SUBTASK';

  return (
    <Modal isOpen onClose={onClose} title={t('createTask')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <FormField label={t('taskTitle')} required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('taskTitlePlaceholder')}
            required
            maxLength={500}
          />
        </FormField>

        <FormField label={t('taskDescription')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('taskDescriptionPlaceholder')}
            maxLength={5000}
            rows={4}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('taskType')} required>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TaskType);
                setParentTaskPubId(''); // Reset parent on type change
              }}
              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground text-sm"
            >
              {TASK_TYPES.map((tt) => (
                <option key={tt} value={tt}>
                  {t(`type.${tt}`)}
                </option>
              ))}
            </select>
          </FormField>

          {type !== 'EPIC' && (
            <FormField label={t('parentTask')} required={parentRequired}>
              <select
                value={parentTaskPubId}
                onChange={(e) => setParentTaskPubId(e.target.value)}
                required={parentRequired}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">{t('noParent')}</option>
                {parentOptions.map((task) => (
                  <option key={task.pubId} value={task.pubId}>
                    {task.title}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('createdBy')} required>
            <select
              value={createdByAgentPubId}
              onChange={(e) => setCreatedByAgentPubId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground text-sm"
            >
              <option value="">{t('selectAgent')}</option>
              {agentEntries.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </FormField>

          <FormField label={t('assignee')}>
            <select
              value={assigneeAgentPubId}
              onChange={(e) => setAssigneeAgentPubId(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground text-sm"
            >
              <option value="">{t('noAssignee')}</option>
              {agentEntries.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || !createdByAgentPubId || (parentRequired && !parentTaskPubId)}
            loading={loading}
            className="flex-1"
          >
            {t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
