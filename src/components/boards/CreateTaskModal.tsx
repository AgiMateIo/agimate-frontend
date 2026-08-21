'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import apiService from '@/services/api';
import type { TaskType, BoardTask } from '@/types';
import { TASK_TYPES } from '@/types';

interface CreateTaskModalProps {
  boardId: string;
  allTasks: BoardTask[];
  agentMap: Map<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({
  boardId,
  allTasks,
  agentMap,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const t = useTranslations('Board');
  const tCommon = useTranslations('Common');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('TASK');
  const [createdByAgentId, setCreatedByAgentId] = useState('');
  const [assigneeAgentId, setAssigneeAgentId] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm<BoardTask>({
    onSuccess: () => onSuccess(),
    defaultError: t('createTaskError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createBoardTask(boardId, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        createdByAgentId,
        assigneeAgentId: assigneeAgentId || undefined,
        parentTaskId: parentTaskId || undefined,
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
        {error && <ErrorAlert>{error}</ErrorAlert>}

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('taskType')} required>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TaskType);
                setParentTaskId(''); // Reset parent on type change
              }}
            >
              {TASK_TYPES.map((tt) => (
                <option key={tt} value={tt}>
                  {t(`type.${tt}`)}
                </option>
              ))}
            </Select>
          </FormField>

          {type !== 'EPIC' && (
            <FormField label={t('parentTask')} required={parentRequired}>
              <Select
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
                required={parentRequired}
              >
                <option value="">{t('noParent')}</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('createdBy')} required>
            <Select
              value={createdByAgentId}
              onChange={(e) => setCreatedByAgentId(e.target.value)}
              required
            >
              <option value="">{t('selectAgent')}</option>
              {agentEntries.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('assignee')}>
            <Select
              value={assigneeAgentId}
              onChange={(e) => setAssigneeAgentId(e.target.value)}
            >
              <option value="">{t('noAssignee')}</option>
              {agentEntries.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || !createdByAgentId || (parentRequired && !parentTaskId)}
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
