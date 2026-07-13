'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AgentCreatedResponse } from '@/types';
import WizardStepper from './WizardStepper';
import StepRole from './StepRole';
import StepSkills from './StepSkills';
import StepDone from './StepDone';

// A skill selected in the wizard. Preset skills arrive without per-skill
// connector codes (the preset carries the union), library skills carry theirs.
export interface WizardSkill {
  id: string;
  name: string;
  description: string | null;
  connectorCodes?: string[];
}

// Shared state accumulated as the user moves through the wizard. A preset is a
// pure prefill: everything stays editable and nothing is persisted until the
// single create request on the skills step.
export interface WizardData {
  // Code of the preset the wizard started from (funnel analytics); null = scratch.
  presetCode: string | null;
  // Union of connector codes of the selected preset, display only.
  presetConnectorCodes: string[];
  name: string;
  description: string;
  instructions: string;
  skills: WizardSkill[];
  // Result of the create call; fullKey is shown once on the final step.
  created: AgentCreatedResponse | null;
}

export interface WizardStepProps {
  data: WizardData;
  setData: (patch: Partial<WizardData>) => void;
  goNext: () => void;
  goBack: () => void;
  teamId: string | null;
}

const EMPTY: WizardData = {
  presetCode: null,
  presetConnectorCodes: [],
  name: '',
  description: '',
  instructions: '',
  skills: [],
  created: null,
};

const STEP_COUNT = 3;

interface AgentWizardProps {
  // Creating inside an agentic team (?teamId=...) — sent as agenticTeamId.
  teamId?: string | null;
}

export default function AgentWizard({ teamId = null }: AgentWizardProps) {
  const t = useTranslations('AgentWizard');
  const [current, setCurrent] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [data, setDataState] = useState<WizardData>(EMPTY);

  const setData = (patch: Partial<WizardData>) =>
    setDataState((prev) => ({ ...prev, ...patch }));

  const goTo = (index: number) => {
    // The agent exists after the create call — earlier steps are read-only history.
    if (data.created) return;
    const clamped = Math.max(0, Math.min(index, STEP_COUNT - 1));
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
  };
  const goNext = () => {
    // Landing on the final step must work even right after creation.
    const clamped = Math.min(current + 1, STEP_COUNT - 1);
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
  };
  const goBack = () => goTo(current - 1);

  const reset = () => {
    setDataState(EMPTY);
    setMaxReached(0);
    setCurrent(0);
  };

  const steps = [
    { key: 'role', label: t('stepRole') },
    { key: 'skills', label: t('stepSkills') },
    { key: 'done', label: t('stepDone') },
  ];

  const stepProps: WizardStepProps = { data, setData, goNext, goBack, teamId };

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
          maxReached={data.created ? current : maxReached}
          onStepClick={goTo}
        />
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        {current === 0 && <StepRole {...stepProps} />}
        {current === 1 && <StepSkills {...stepProps} />}
        {current === 2 && <StepDone {...stepProps} onReset={reset} />}
      </div>
    </div>
  );
}
