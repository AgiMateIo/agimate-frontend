'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  UserCircleIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import apiService from '@/services/api';
import type { BoardTask, BoardTaskComment } from '@/types';

interface TaskSlideOverProps {
  task: BoardTask;
  agentMap: Map<string, string>;
  onClose: () => void;
}

const TYPE_BADGE: Record<string, string> = {
  EPIC: 'bg-purple-500/20 text-purple-400',
  TASK: 'bg-blue-500/20 text-blue-400',
  SUBTASK: 'bg-surface-secondary text-muted',
};

export default function TaskSlideOver({
  task,
  agentMap,
  onClose,
}: TaskSlideOverProps) {
  const t = useTranslations('Board');

  const [comments, setComments] = useState<BoardTaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentAgentId, setCommentAgentId] = useState('');

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const data = await apiService.getTaskComments(task.id);
      setComments(data);
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : t('loadError'));
    } finally {
      setCommentsLoading(false);
    }
  }, [task.id, t]);

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const { loading: commentLoading, error: commentError, handleSubmit } = useAsyncForm<BoardTaskComment>({
    onSuccess: () => {
      setNewComment('');
      fetchComments();
    },
    defaultError: t('commentError'),
  });

  const onCommentSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createTaskComment(task.id, {
        agentId: commentAgentId,
        content: newComment.trim(),
      })
    );

  const createdByName = agentMap.get(task.createdByAgentId) ?? t('unknownAgent');
  const assigneeName = task.assigneeAgentId
    ? agentMap.get(task.assigneeAgentId) ?? t('unknownAgent')
    : null;

  const agentEntries = Array.from(agentMap.entries());

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface border-l border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground truncate pr-4">
            {task.title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors shrink-0"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Task info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${TYPE_BADGE[task.type] ?? ''}`}>
                {t(`type.${task.type}`)}
              </span>
              <span className="text-xs text-muted px-2 py-0.5 bg-surface-secondary rounded">
                {t(`status.${task.status}`)}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted text-xs">{t('createdBy')}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <UserCircleIcon className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-foreground">{createdByName}</span>
                </div>
              </div>
              <div>
                <span className="text-muted text-xs">{t('assignee')}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <UserCircleIcon className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-foreground">{assigneeName ?? t('noAssignee')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              {t('comments')} ({comments.length})
            </h3>

            {commentsError ? (
              <Alert variant="error">{commentsError}</Alert>
            ) : commentsLoading ? (
              <p className="text-sm text-muted">{t('loadingComments')}</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted">{t('noComments')}</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const authorName = agentMap.get(comment.agentId) ?? t('unknownAgent');
                  return (
                    <div key={comment.id} className="bg-surface-secondary rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-4 w-4 text-muted shrink-0" />
                        <span className="text-xs font-medium text-foreground">{authorName}</span>
                        <span className="text-xs text-muted ml-auto">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Add comment footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <form onSubmit={onCommentSubmit} className="space-y-3">
            {commentError && <Alert variant="error">{commentError}</Alert>}

            {agentEntries.length > 0 && (
              <select
                value={commentAgentId}
                onChange={(e) => setCommentAgentId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">{t('commentAgent')}</option>
                {agentEntries.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('addCommentPlaceholder')}
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-foreground resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!newComment.trim() || !commentAgentId}
                loading={commentLoading}
              >
                {t('addComment')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
