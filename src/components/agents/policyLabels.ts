import type { PolicyKind } from '@/types';

/** Kind-specific translation keys used by policy components */
export function getPolicyLabels(kind: PolicyKind) {
  if (kind === 'tool') {
    return {
      resourceColumn: 'toolNameColumn',
      addPolicy: 'addToolPolicy',
      editPolicy: 'editToolPolicy',
      deletePolicy: 'deleteToolPolicy',
      noPolicies: 'noToolPolicies',
      loadingPolicies: 'loadingToolPolicies',
      stepResource: 'stepTool',
      selectResource: 'selectTool',
      loadingResources: 'loadingTools',
      noResourcesFound: 'noToolsFound',
      deletePolicyConfirm: 'deleteToolPolicyConfirm',
      deletePolicyWarning: 'deleteToolPolicyWarning',
    } as const;
  }
  return {
    resourceColumn: 'triggerNameColumn',
    addPolicy: 'addTriggerPolicy',
    editPolicy: 'editTriggerPolicy',
    deletePolicy: 'deleteTriggerPolicy',
    noPolicies: 'noTriggerPolicies',
    loadingPolicies: 'loadingTriggerPolicies',
    stepResource: 'stepTrigger',
    selectResource: 'selectTrigger',
    loadingResources: 'loadingTriggers',
    noResourcesFound: 'noTriggersFound',
    deletePolicyConfirm: 'deleteTriggerPolicyConfirm',
    deletePolicyWarning: 'deleteTriggerPolicyWarning',
  } as const;
}
