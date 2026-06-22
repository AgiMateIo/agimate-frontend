'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AgentLlmResponse,
  AgentResponse,
  ChannelResponse,
  SkillResponse,
} from '@/types';
import WizardStepper from './WizardStepper';
import Step1Describe from './Step1Describe';
import Step2Provider from './Step2Provider';
import Step3Channel from './Step3Channel';
import Step4Skills from './Step4Skills';
import Step5Done from './Step5Done';

// Shared state accumulated as the user moves through the wizard. Each step
// persists its entity to the backend immediately (step-by-step), then records
// the result here so later steps (and the summary) can use it.
export interface WizardData {
  agent: AgentResponse | null;
  // One-time agent key, kept in memory so it can be shown/copied on later steps.
  agentKey: string | null;
  binding: AgentLlmResponse | null;
  channel: ChannelResponse | null;
  // Skills bound to the agent during the wizard.
  skills: SkillResponse[];
}

export interface WizardStepProps {
  data: WizardData;
  setData: (patch: Partial<WizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

const EMPTY: WizardData = {
  agent: null,
  agentKey: null,
  binding: null,
  channel: null,
  skills: [],
};

const STEP_COUNT = 5;

export default function AgentWizard() {
  const t = useTranslations('AgentWizard');
  const [current, setCurrent] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [data, setDataState] = useState<WizardData>(EMPTY);

  const setData = (patch: Partial<WizardData>) =>
    setDataState((prev) => ({ ...prev, ...patch }));

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, STEP_COUNT - 1));
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
  };
  const goNext = () => goTo(current + 1);
  const goBack = () => goTo(current - 1);

  const reset = () => {
    setDataState(EMPTY);
    setMaxReached(0);
    setCurrent(0);
  };

  const steps = [
    { key: 'describe', label: t('stepDescribe') },
    { key: 'provider', label: t('stepProvider') },
    { key: 'channel', label: t('stepChannel') },
    { key: 'skills', label: t('stepSkills') },
    { key: 'done', label: t('stepDone') },
  ];

  const stepProps: WizardStepProps = { data, setData, goNext, goBack };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5">
        <WizardStepper
          steps={steps}
          current={current}
          maxReached={maxReached}
          onStepClick={goTo}
        />
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        {current === 0 && <Step1Describe {...stepProps} />}
        {current === 1 && <Step2Provider {...stepProps} />}
        {current === 2 && <Step3Channel {...stepProps} />}
        {current === 3 && <Step4Skills {...stepProps} />}
        {current === 4 && <Step5Done {...stepProps} onReset={reset} />}
      </div>
    </div>
  );
}
