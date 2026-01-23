// Smart Actions types

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SmartAction {
  id: string;
  title: string;
  severity: Priority;
  description: string;
  recommendation: string;
  estimatedImpact: string;
  createdAt: string;
}
