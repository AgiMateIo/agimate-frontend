import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { brandFontVariables } from '@/app/fonts';
import { THEME_BOOT_SCRIPT } from '@/utils/theme';
import { resolveHeaderLocale } from './locale';
import '../../globals.css';

/**
 * The Android app's App Link return address, `https://www.agimate.io/app/auth`.
 * When everything works the browser hands the URL to the app and this page is
 * never seen; it renders for the cases where that did not happen — the app is
 * not installed, the link was opened on another device, or the person turned
 * link-opening off. It is then the only thing they see after signing in.
 *
 * **Deliberately outside `[locale]`, and that is the security requirement, not a
 * routing preference.** The URL arrives carrying `code`, `link_proof` or
 * `error`; the first two are single-use secrets that open the account. Under
 * `[locale]` this page would inherit two things that send that URL onwards:
 * `YandexMetrika`, which reports `origin + pathname + search` on every view, and
 * the locale middleware, which would 307 `/app/auth` to `/ru/app/auth` and write
 * the query into a second access-log line on the way. Here it inherits neither —
 * the root layout is a pass-through, and `src/proxy.ts` skips this path. Nothing
 * on the server reads `searchParams`, and no third-party script runs on it.
 *
 * Keeping the address locale-less is also what the backend requires: it matches
 * `app.oauth.native-redirect-urls` by exact equality, no prefix, no query.
 *
 * One thing that is *not* fixable from here: React's flight payload inlined in
 * the HTML carries the request URL, query and all, because the route renders per
 * request (`Accept-Language` decides the language). That copy travels to the one
 * browser that already holds the URL, over the same connection, under
 * `no-store` — it is not the leak the design is about, which is the URL leaving
 * for somewhere it can be read later. Removing it would mean prerendering the
 * page and showing every visitor Russian.
 */

// Strips the query before anything else runs — before hydration, before the
// first paint, before any link on the page can be clicked, so the secrets do not
// settle into browser history or the address bar and a reload cannot replay them.
// On Android it also keeps the allowed keys in a closure, as an `intent://` link
// for the "back to the app" button: Samsung Internet does not follow App Links by
// default. The link never reaches the DOM (no `href` to long-press and copy) and
// is spent on the first tap — a second exchange of the code revokes the session.
const QUERY_STRIP_SCRIPT = `(function(){try{
var s=location.search;
if(s)history.replaceState(null,'',location.pathname);
if(!s||!/Android/i.test(navigator.userAgent))return;
var q=new URLSearchParams(s),out=new URLSearchParams();
['code','link_proof','provider','error'].forEach(function(k){var v=q.get(k);if(v)out.set(k,v)});
if(!out.has('code')&&!out.has('link_proof')&&!out.has('error'))return;
var href='intent://auth?'+out.toString()+'#Intent;scheme=agimate;package=ru.agimate.chat;S.browser_fallback_url='+encodeURIComponent('https://www.rustore.ru/catalog/app/ru.agimate.chat')+';end';
var root=document.documentElement;
root.setAttribute('data-app-return','');
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest&&e.target.closest('[data-app-return-link]');
if(!a)return;
e.preventDefault();
if(!href)return;
var go=href;href=null;
a.disabled=true;
root.setAttribute('data-app-returning','');
location.href=go;
},true);
}catch(e){}})();`;

// Server-rendered both ways; the attributes the script sets on <html> pick one.
const APP_RETURN_STYLE = `
[data-app-return-link],[data-app-return-only],[data-app-returning-only]{display:none}
html[data-app-return] [data-app-return-link]{display:inline-flex}
html[data-app-return] [data-app-return-only]{display:block}
html[data-app-return] [data-app-return-hidden]{display:none}
html[data-app-returning] [data-app-returning-only]{display:inline}
html[data-app-returning] [data-app-returning-hidden]{display:none}
`;

export async function generateMetadata() {
  const locale = await resolveHeaderLocale();
  const t = await getTranslations({ locale, namespace: 'AppAuth' });

  return {
    title: t('meta.title'),
    // A URL with a live credential in it must never reach an index — and
    // `no-referrer` keeps it out of the `Referer` of the install link too, which
    // is the one outbound navigation this page offers.
    robots: { index: false, follow: false },
    referrer: 'no-referrer' as const,
  };
}

export default async function AppAuthLayout({ children }: { children: ReactNode }) {
  const locale = await resolveHeaderLocale();

  return (
    <html lang={locale} className={brandFontVariables} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: QUERY_STRIP_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: APP_RETURN_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Locale only, no messages: everything here is server-rendered, and the
            provider is present solely so the shared shell's locale-aware <Link>
            knows which prefix to write. */}
        <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
