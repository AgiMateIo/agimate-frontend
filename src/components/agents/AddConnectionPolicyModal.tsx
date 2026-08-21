'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import {
  AgentConnectionResponse,
  AgentConnectionPolicyResponse,
  PolicyKind,
  AccessEffect,
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface AddConnectionPolicyModalProps {
  connection: AgentConnectionResponse;
  // present → edit mode (only effect/paramsFilter/description editable)
  policy?: AgentConnectionPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}

function tryParseJsonObject(
  text: string,
): { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: null };
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'object' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'object' };
  }
}

export default function AddConnectionPolicyModal({
  connection,
  policy,
  onClose,
  onSuccess,
}: AddConnectionPolicyModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const isEdit = !!policy;

  const [kind, setKind] = useState<PolicyKind>(policy?.kind ?? 'TOOL');
  const [name, setName] = useState(policy?.name ?? '');
  const [effect, setEffect] = useState<AccessEffect>(policy?.effect ?? 'ALLOW');
  const [paramsFilterText, setParamsFilterText] = useState(
    policy?.paramsFilter ? JSON.stringify(policy.paramsFilter, null, 2) : '',
  );
  const [description, setDescription] = useState(policy?.description ?? '');
  const [filterError, setFilterError] = useState('');

  // discovered tool/trigger names for the connector instance (datalist suggestions)
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    const code = connection.connectorCode;
    const fetcher =
      kind === 'TOOL'
        ? apiService.getConnectionTools(connection.connectionId).then((tools) => tools.map((x) => x.name))
        : apiService.getConnectorTriggers(code).then((trg) => trg.map((x) => x.name));
    fetcher
      .then((names) => {
        if (!cancelled) setSuggestions(names);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, isEdit, connection.connectionId, connection.connectorCode]);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: isEdit ? 'Failed to update policy' : 'Failed to create policy',
  });

  const onSubmit = (e: React.FormEvent) => {
    setFilterError('');
    const parsed = tryParseJsonObject(paramsFilterText);
    if (!parsed.ok) {
      e.preventDefault();
      setFilterError(t('paramsFilterInvalid'));
      return;
    }
    handleSubmit(e, async () => {
      if (isEdit) {
        await apiService.updateAgentConnectionPolicy(connection.id, policy!.id, {
          effect,
          paramsFilter: parsed.value,
          description: description.trim() || null,
        });
      } else {
        await apiService.createAgentConnectionPolicy(connection.id, {
          kind,
          name: name.trim() || null,
          effect,
          paramsFilter: parsed.value,
          description: description.trim() || null,
        });
      }
    });
  };

  const listId = 'policy-name-suggestions';
  const showSuggestions = !isEdit && suggestions.length > 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={isEdit ? t('editPolicy') : t('addPolicy')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Kind */}
        <FormField label={t('policyKind')}>
          <div className="flex gap-3">
            {(['TOOL', 'TRIGGER'] as PolicyKind[]).map((k) => (
              <label
                key={k}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-colors ${
                  isEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                } ${kind === k ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
              >
                <input
                  type="radio"
                  name="kind"
                  checked={kind === k}
                  disabled={isEdit}
                  onChange={() => setKind(k)}
                  className="accent-accent"
                />
                <span className="text-sm font-medium text-foreground">{k === 'TOOL' ? t('kindTool') : t('kindTrigger')}</span>
              </label>
            ))}
          </div>
        </FormField>

        {/* Name */}
        <FormField label={t('policyResourceName')} hint={t('policyResourceHint')}>
          <Input
            value={name}
            disabled={isEdit}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('policyResourceAll')}
            list={showSuggestions ? listId : undefined}
            className="font-mono text-sm"
          />
          {showSuggestions && (
            <datalist id={listId}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </FormField>

        {/* Effect */}
        <FormField label={t('effect')}>
          <div className="flex gap-3">
            <label
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                effect === 'ALLOW' ? 'border-success bg-success/5' : 'border-border hover:border-success/50'
              }`}
            >
              <input type="radio" name="effect" checked={effect === 'ALLOW'} onChange={() => setEffect('ALLOW')} className="accent-success" />
              <span className="text-sm font-bold text-success">{t('effectAllow')}</span>
            </label>
            <label
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                effect === 'DENY' ? 'border-error bg-error/5' : 'border-border hover:border-error/50'
              }`}
            >
              <input type="radio" name="effect" checked={effect === 'DENY'} onChange={() => setEffect('DENY')} className="accent-error" />
              <span className="text-sm font-bold text-error">{t('effectDeny')}</span>
            </label>
          </div>
        </FormField>

        {/* Params filter */}
        <FormField label={t('paramsFilter')} hint={t('paramsFilterHint')} error={filterError || undefined}>
          <TextArea
            value={paramsFilterText}
            onChange={(e) => setParamsFilterText(e.target.value)}
            placeholder={'{ "chatId": "123" }'}
            rows={3}
            className="font-mono text-sm"
          />
        </FormField>

        {/* Description */}
        <FormField label={t('description')}>
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {tCommon('cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading} className="flex-1">
            {tCommon('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
