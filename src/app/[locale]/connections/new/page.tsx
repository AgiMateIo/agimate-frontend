import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Public deep-link handed out by the meta-agent's `create_connection` tool:
 * `/connections/new?connector=<code>&name=<displayName>`.
 *
 * The real screen lives under the locale-prefixed dashboard, so this shim only
 * forwards the query there — that way the link the backend builds stays free of
 * our route layout (locale prefix, `/dashboard`).
 */
export default async function ConnectionDeepLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const resolved = await searchParams;

  const query = new URLSearchParams();
  for (const key of ['connector', 'name'] as const) {
    const value = resolved[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }
  const qs = query.toString();

  redirect({
    href: `/dashboard/connections/create${qs ? `?${qs}` : ''}`,
    locale: resolveLocale(locale),
  });
}
