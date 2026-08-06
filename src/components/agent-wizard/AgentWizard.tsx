'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AgentCreatedResponse, AgentType } from '@/types';
import WizardStepper from './WizardStepper';
import WizardSummary from './WizardSummary';
import StepRole from './StepRole';
import StepSkills from './StepSkills';
import StepDone from './StepDone';
import StepDelivery from './StepDelivery';
import StepConnections from './StepConnections';
import StepExternalDone from './StepExternalDone';

// A skill selected in the wizard. Preset skills arrive without per-skill
// connector codes (the preset carries the union), library skills carry theirs.
export interface WizardSkill {
  id: string;
  title: string;
  description: string | null;
  connectorCodes?: string[];
}

// A connection picked on the external flow's connections step. Bound right
// after the agent exists — bindings need an agent id.
export interface WizardConnection {
  id: string;
  name: string;
  fullCode: string;
}

// Shared state accumulated as the user moves through the wizard. A preset is a
// pure prefill: everything stays editable and nothing is persisted until the
// single create request on the skills step.
export interface WizardData {
  // Name (slug) of the preset the wizard started from (funnel analytics); null = scratch.
  presetName: string | null;
  // Union of connector codes of the selected preset, display only.
  presetConnectorCodes: string[];
  // Non-null → the external-AI branch of the wizard (delivery instead of a
  // prompt and a model). The value is the delivery step's default, which the
  // user may still change there.
  agentType: AgentType | null;
  // Only sent for WEBHOOK delivery; the backend validates the field.
  webhookUrl: string;
  name: string;
  description: string;
  instructions: string;
  skills: WizardSkill[];
  // External flow: what the agent may reach outwards, bound after creation.
  connections: WizardConnection[];
  // Bindings that failed once the agent already existed — the agent is real, so
  // this is a to-do on its page rather than a failed creation.
  bindFailures: WizardConnection[];
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
  presetName: null,
  presetConnectorCodes: [],
  agentType: null,
  webhookUrl: '',
  name: '',
  description: '',
  instructions: '',
  skills: [],
  connections: [],
  bindFailures: [],
  created: null,
};

interface AgentWizardProps {
  // Creating inside an agentic team (?teamId=...) — sent as agenticTeamId.
  teamId?: string | null;
}

export default function AgentWizard({ teamId = null }: AgentWizardProps) {
  const t = useTranslations('AgentWizard');
  const [current, setCurrent] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [data, setDataState] = useState<WizardData>(EMPTY);
  const rootRef = useRef<HTMLDivElement>(null);

  // Steps are tall and their action bar sits at the bottom, so a step change
  // would otherwise leave the new step scrolled into its middle. The dashboard
  // scrolls <main>, not the window — walk up to whichever ancestor scrolls.
  useEffect(() => {
    let node = rootRef.current?.parentElement ?? null;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (node.scrollHeight > node.clientHeight && (overflowY === 'auto' || overflowY === 'scroll')) {
        node.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      node = node.parentElement;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current]);

  const setData = (patch: Partial<WizardData>) =>
    setDataState((prev) => ({ ...prev, ...patch }));

  // A preset carrying an agentType opens the external-AI branch: no prompt and
  // no model, a delivery step instead, and a key-and-connect finish. The branch
  // can only be chosen on the first step, so the index never has to be remapped.
  const external = data.agentType !== null;

  const steps = external
    ? [
        { key: 'name', label: t('stepName') },
        { key: 'delivery', label: t('stepDelivery') },
        { key: 'connections', label: t('stepConnections') },
        { key: 'connect', label: t('stepConnect') },
      ]
    : [
        { key: 'role', label: t('stepRole') },
        { key: 'skills', label: t('stepSkills') },
        { key: 'done', label: t('stepDone') },
      ];
  const stepCount = steps.length;

  // Switching branch (only possible on the gallery step) swaps the steps behind
  // the stepper, so progress made in the other branch is meaningless — step 2 of
  // "skills" is not step 2 of "delivery". Compared against stored state rather
  // than watching agentType: the delivery step writes that field too, and it
  // must not wipe the progress of the branch the user is already inside.
  const [branch, setBranch] = useState(external);
  if (branch !== external) {
    setBranch(external);
    setMaxReached(0);
  }

  const goTo = (index: number) => {
    // The agent exists after the create call — earlier steps are read-only history.
    if (data.created) return;
    const clamped = Math.max(0, Math.min(index, stepCount - 1));
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
  };
  const goNext = () => {
    // Landing on the final step must work even right after creation.
    const clamped = Math.min(current + 1, stepCount - 1);
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
  };
  const goBack = () => goTo(current - 1);

  const reset = () => {
    setDataState(EMPTY);
    setMaxReached(0);
    setCurrent(0);
  };

  // From step two on the header carries the draft, so the open step doesn't have
  // to repeat it. Step one needs none of it: the fields are right there.
  // Once the agent exists the server's name wins — it may have deduplicated it.
  const name = data.created?.agent.name ?? data.name.trim();

  const stepProps: WizardStepProps = { data, setData, goNext, goBack, teamId };

  return (
    <div ref={rootRef} className="space-y-6">
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

        {current > 0 && name && (
          <WizardSummary
            name={name}
            skills={data.skills}
            onRemoveSkill={
              data.created || external
                ? undefined
                : (id) => setData({ skills: data.skills.filter((s) => s.id !== id) })
            }
          />
        )}
      </div>

      {/* No padding here and no overflow clipping: each step pads its own body so
          its sticky action bar can sit flush at the card's bottom edge. */}
      <div className="bg-surface rounded-xl border border-border">
        {current === 0 && <StepRole {...stepProps} />}
        {external ? (
          <>
            {current === 1 && <StepDelivery {...stepProps} />}
            {current === 2 && <StepConnections {...stepProps} />}
            {current === 3 && <StepExternalDone {...stepProps} onReset={reset} />}
          </>
        ) : (
          <>
            {current === 1 && <StepSkills {...stepProps} />}
            {current === 2 && <StepDone {...stepProps} onReset={reset} />}
          </>
        )}
      </div>
    </div>
  );
}
