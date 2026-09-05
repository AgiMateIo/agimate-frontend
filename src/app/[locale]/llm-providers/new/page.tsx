import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Public deep-link handed out by the meta-agent's `create_llm_provider` tool:
 * `/llm-providers/new?providerType=<type>&name=<displayName>&baseUrl=<url>`.
 *
 * The tool writes nothing — it validates the fields and sends the user here, so
 * the API key is typed by a person and never travels through the model. The
 * whitelist below is what keeps that true: only those three parameters are
 * forwarded, whatever else the link carries.
 *
 * As with `/connections/new`, the real screen lives under the locale-prefixed
 * dashboard and this shim only forwards the query there.
 */
export default async function LlmProviderDeepLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const resolved = await searchParams;

  const query = new URLSearchParams();
  for (const key of ['providerType', 'name', 'baseUrl'] as const) {
    const value = resolved[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }
  const qs = query.toString();

  redirect({
    href: `/dashboard/llm-providers${qs ? `?${qs}` : ''}`,
    locale: resolveLocale(locale),
  });
}
