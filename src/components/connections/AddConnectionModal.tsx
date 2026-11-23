'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ConnectionResponse, ConnectorCatalogEntry } from '@/types';
import { Modal } from '@/components/ui/Modal';
import ConnectionSetupFlow, { type FlowStep } from './ConnectionSetupFlow';

interface AddConnectionModalProps {
  platforms: ConnectorCatalogEntry[];
  connections: ConnectionResponse[];
  onClose: () => void;
  onSuccess: (connection: ConnectionResponse) => void;
}

// Modal chrome over the shared create sequence; the sequence itself lives in
// ConnectionSetupFlow so the agent's bind modal can use the same one.
export default function AddConnectionModal({
  platforms,
  connections,
  onClose,
  onSuccess,
}: AddConnectionModalProps) {
  const t = useTranslations('Connections');
  const [step, setStep] = useState<FlowStep>('pick');

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={step === 'pick' ? t('selectConnector') : t('configureConnection')}
      size={step === 'pick' ? 'xl' : 'md'}
    >
      <ConnectionSetupFlow
        platforms={platforms}
        connections={connections}
        onStepChange={setStep}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
