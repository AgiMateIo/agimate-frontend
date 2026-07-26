'use client';

import { CheckIcon } from '@heroicons/react/24/solid';

export interface StepperStep {
  key: string;
  label: string;
}

interface WizardStepperProps {
  steps: StepperStep[];
  current: number;
  // Furthest step the user has reached; earlier steps are clickable.
  maxReached: number;
  onStepClick: (index: number) => void;
}

export default function WizardStepper({ steps, current, maxReached, onStepClick }: WizardStepperProps) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((step, i) => {
        const isActive = i === current;
        const isVisited = i !== current && i <= maxReached;
        const reachable = i <= maxReached;
        const isLast = i === steps.length - 1;

        return (
          <li key={step.key} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <button
              type="button"
              onClick={() => reachable && onStepClick(i)}
              disabled={!reachable}
              className={`flex items-center gap-2.5 shrink-0 ${reachable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border transition-colors
                  ${isActive
                    ? 'bg-accent text-accent-foreground border-accent'
                    : isVisited
                      ? 'bg-accent/15 text-accent border-accent/40'
                      : 'bg-surface-secondary text-muted border-border'
                  }`}
              >
                {isVisited ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`text-sm font-medium hidden sm:block transition-colors
                  ${isActive ? 'text-foreground' : isVisited ? 'text-foreground/80' : 'text-muted'}`}
              >
                {step.label}
              </span>
            </button>

            {!isLast && (
              <span
                className={`flex-1 h-px mx-3 ${i < maxReached ? 'bg-accent/40' : 'bg-border'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
