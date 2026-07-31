'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Публичный номер счётчика — намеренно в коде, а не в NEXT_PUBLIC_*:
// Docker-сборка в CI не пробрасывает build-args, а NEXT_PUBLIC_* инлайнится
// на этапе сборки, так что переменная окружения там просто не доедет.
const COUNTER_ID = 111195543;

// Только на проде: в dev-режиме визиты с localhost иначе попадают в отчёты.
// Проверка попадает в бандл как константа, так что вне прода весь компонент
// вырезается сборщиком.
const ENABLED = process.env.NODE_ENV === 'production';

type YandexMetrikaFn = (
  counterId: number,
  action: string,
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    ym?: YandexMetrikaFn;
  }
}

/**
 * Счётчик Яндекс.Метрики. Инициализируется с `defer: true`, поэтому первый и
 * все последующие хиты шлём вручную: в App Router переходы идут через History
 * API и Метрика их сама не видит.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!ENABLED) return;
    // href, а не pathname: в отчёте нужен полный URL со строкой запроса.
    const url = window.location.href;
    if (url === previousUrl.current) return;
    const referer = previousUrl.current ?? document.referrer;
    previousUrl.current = url;
    window.ym?.(COUNTER_ID, 'hit', url, { referer });
  }, [pathname]);

  if (!ENABLED) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}", "ym");

        ym(${COUNTER_ID}, "init", {
          defer: true,
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: "dataLayer",
          accurateTrackBounce: true,
          trackLinks: true
        });`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
