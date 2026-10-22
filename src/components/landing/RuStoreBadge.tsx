// Where the Android chat client is distributed.
export const RUSTORE_URL = 'https://www.rustore.ru/catalog/app/ru.agimate.chat';

// RuStore's own mark, as served by rustore.ru.
function RuStoreLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48 100C25.37 100 14.06 100 7.03 92.97C0 85.94 0 74.63 0 52L0 48C0 25.37 0 14.06 7.03 7.03C14.06 0 25.37 0 48 0L52 0C74.63 0 85.94 0 92.97 7.03C100 14.06 100 25.37 100 48L100 52C100 74.63 100 85.94 92.97 92.97C85.94 100 74.63 100 52 100L48 100Z"
        fill="#2B71F6"
      />
      <path d="M57.8261 61.6261C55.1318 60.953 53.2427 58.5429 53.2427 55.7787L53.2427 23.213C53.2427 20.0733 56.2095 17.7706 59.2697 18.5351L78.6493 23.3762C81.3436 24.0492 83.2327 26.4593 83.2327 29.2235L83.2327 61.7893C83.2327 64.929 80.2659 67.2317 77.2057 66.4672L57.8261 61.6261Z" fill="white" />
      <path d="M21.3505 76.6223C18.6562 75.9493 16.7671 73.5392 16.7671 70.775L16.7671 38.2092C16.7671 35.0695 19.7339 32.7669 22.7941 33.5313L42.1737 38.3724C44.868 39.0455 46.7571 41.4556 46.7571 44.2198L46.7571 76.7856C46.7571 79.9252 43.7903 82.2279 40.7301 81.4634L21.3505 76.6223Z" fill="white" />
      <path d="M39.5888 69.1243C36.8945 68.4512 35.0054 66.0411 35.0054 63.2769L35.0054 30.7112C35.0054 27.5715 37.9722 25.2688 41.0324 26.0333L60.412 30.8744C63.1063 31.5474 64.9954 33.9575 64.9954 36.7218L64.9954 69.2875C64.9954 72.4272 62.0286 74.7299 58.9684 73.9654L39.5888 69.1243Z" fill="white" />
      <path d="M52.2724 72.3017C51.4238 72.0856 50.8198 71.3351 50.7901 70.4599L49.947 45.5896C49.7031 42.298 47.2598 39.6802 44.7064 38.9092C44.5631 38.8659 44.41 38.9242 44.3251 39.0476C44.2388 39.1729 44.2721 39.3464 44.3925 39.4396C45.023 39.9276 46.7584 41.5205 46.7584 44.2678L46.7532 70.9031L52.2724 72.3017Z" fill="#2B71F6" />
      <path d="M70.5142 64.797C69.6663 64.5848 69.0616 63.8366 69.0319 62.963L68.1887 38.0945C67.9448 34.8029 65.5015 32.185 62.9481 31.4141C62.8048 31.3708 62.6517 31.4291 62.5668 31.5524C62.4805 31.6778 62.5138 31.8513 62.6342 31.9445C63.2647 32.4325 65.0001 34.0253 65.0001 36.7727L64.995 63.4171L70.5142 64.797Z" fill="#2B71F6" />
    </svg>
  );
}

// A store button in the shape store badges have: mark, small caption, store name.
export default function RuStoreBadge({ caption }: { caption: string }) {
  return (
    <a
      href={RUSTORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 rounded-xl bg-foreground px-5 py-2.5 text-background shadow-lg transition-opacity hover:opacity-90"
    >
      <RuStoreLogo className="h-9 w-9 shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs">{caption}</span>
        <span className="text-lg font-semibold">RuStore</span>
      </span>
    </a>
  );
}
