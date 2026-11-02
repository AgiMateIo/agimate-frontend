'use client';

import { useTranslations } from 'next-intl';
import LlmProvidersList from '@/components/llm-providers/LlmProvidersList';
import { useLlmProviderCacheActions, useLlmProvidersQuery } from '@/queries/llm-providers';

// Platform rows arrive to ADMINs only (the backend filters them by role) and the
// page guards the route before this mounts. The same card as the personal list,
// pointed at the admin detail route.
export default function AdminPlatformProvidersList() {
  const t = useTranslations('LlmProviders');
  const { data: providers } = useLlmProvidersQuery();
  const { setProvider } = useLlmProviderCacheActions();

  const platformProviders = providers.filter((p) => p.platform);

  return (
    <LlmProvidersList
      providers={platformProviders}
      onUpdate={setProvider}
      hrefBase="/dashboard/admin/platform-providers"
      emptyText={t('platformProvidersEmpty')}
    />
  );
}
