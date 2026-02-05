'use client';

import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import {
  EyeIcon,
  HandRaisedIcon,
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  BellAlertIcon,
  ShoppingCartIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  MegaphoneIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

/* ── Use-case data ────────────────────────────────────── */

const useCases = [
  {
    icon: ChatBubbleLeftRightIcon,
    emoji: '\u{1F916}',
    title: 'AI-секретарь',
    description:
      'Мониторинг входящих сообщений в Email, Telegram, WhatsApp. AI анализирует, категоризирует и отвечает на типовые вопросы.',
    flow: ['Входящее сообщение', 'AI-анализ', 'Автоответ или эскалация'],
  },
  {
    icon: DocumentTextIcon,
    emoji: '\u{1F4C4}',
    title: 'Автоматизация документов',
    description:
      'Отслеживание новых файлов, распознавание типа документа, извлечение данных и загрузка в 1С или CRM.',
    flow: ['Новый файл', 'Распознавание', 'Выгрузка в 1С/CRM'],
  },
  {
    icon: BellAlertIcon,
    emoji: '\u{1F514}',
    title: 'Мониторинг и алерты',
    description:
      'Отслеживание событий на устройстве — скриншоты, уведомления, изменения. AI анализирует и отправляет алерты.',
    flow: ['Событие на устройстве', 'AI-анализ', 'Алерт в Telegram'],
  },
  {
    icon: ShoppingCartIcon,
    emoji: '\u{1F4E6}',
    title: 'E-commerce помощник',
    description:
      'Мониторинг заказов на Ozon и Wildberries, автоматическое обновление статусов, ответы покупателям.',
    flow: ['Новый заказ', 'Обновление статуса', 'Ответ покупателю'],
  },
  {
    icon: ChartBarIcon,
    emoji: '\u{1F4CA}',
    title: 'Мониторинг цен конкурентов',
    description:
      'Отслеживание цен на товары конкурентов на маркетплейсах. AI анализирует изменения и предлагает корректировки.',
    flow: ['Изменение цены', 'AI-анализ', 'Рекомендация + алерт'],
  },
  {
    icon: CpuChipIcon,
    emoji: '\u{1F5A5}',
    title: 'Legacy Software Bridge',
    description:
      'AI управляет desktop-приложениями без API — 1С, Excel, специализированное ПО. Интеграция с современными сервисами.',
    flow: ['Команда от AI', 'Действие в приложении', 'Результат в облако'],
  },
  {
    icon: SpeakerWaveIcon,
    emoji: '\u{1F50A}',
    title: 'Голосовые уведомления',
    description:
      'Важные события озвучиваются через TTS на устройстве. Не пропустите критичные алерты, даже если не смотрите на экран.',
    flow: ['Критичное событие', 'AI-приоритизация', 'Голосовое уведомление'],
  },
  {
    icon: MegaphoneIcon,
    emoji: '\u{1F4C8}',
    title: 'Сбор данных и отчёты',
    description:
      'Автоматический сбор данных из разных источников, агрегация и формирование отчётов по расписанию.',
    flow: ['Сбор из источников', 'AI-агрегация', 'Отчёт в Notion/Sheets'],
  },
];

/* ── Page ─────────────────────────────────────────────── */

export default function HomePage() {
  const { user, loading } = useUser();

  return (
    <div className="min-h-screen text-foreground">
      {/* ─── Background gradient mesh ─────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient - Cloud Dancer */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0EEE9] to-[#F8F7F5] dark:from-[#1a1715] dark:to-[#0f0e0d]" />

        {/* Blob 1 - top right, Mocha Mousse */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#A47764]/30 dark:bg-[#A47764]/15 blur-3xl" />

        {/* Blob 2 - bottom left, Mocha Mousse lighter */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#A47764]/20 dark:bg-[#A47764]/10 blur-3xl" />

        {/* Blob 3 - center, subtle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#A47764]/10 dark:bg-[#A47764]/5 blur-3xl" />
      </div>

      {/* ═══════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">AgiMate</span>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <a href="#how-it-works" className="hidden sm:inline hover:text-foreground transition-colors">
              Как это работает
            </a>
            <a href="#use-cases" className="hidden sm:inline hover:text-foreground transition-colors">
              Сценарии
            </a>
            <a href="#download" className="hidden sm:inline hover:text-foreground transition-colors">
              Скачать
            </a>
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Войти
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          SECTION 1 — Hero
         ═══════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Дайте вашему AI{' '}
          <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
            тело
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          AgiMate подключает AI-агентов к вашим устройствам и сервисам.
          <br className="hidden sm:block" />
          Пусть AI не только говорит — пусть действует.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            Попробовать бесплатно
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Как это работает
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — Problem → Solution
         ═══════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        {/* Two columns: problem / solution */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Problem */}
          <div className="rounded-2xl border border-border/50 bg-surface p-8">
            <div className="mb-4 inline-block rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
              Проблема
            </div>
            <p className="text-lg leading-relaxed text-muted">
              Ваш AI-помощник умеет отвечать на вопросы. Но попросите его сделать
              скриншот, отследить файл или отправить сообщение — и он разводит
              руками.
            </p>
          </div>

          {/* Solution */}
          <div className="rounded-2xl border border-accent/30 bg-surface p-8 shadow-lg shadow-accent/5">
            <div className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Решение
            </div>
            <p className="text-lg leading-relaxed text-muted">
              AgiMate даёт AI глаза, уши и руки. Установите приложение на
              устройство — и ваш AI-агент сможет видеть, слышать и действовать.
            </p>
          </div>
        </div>

        {/* Three capability cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <CapabilityCard
            icon={<EyeIcon className="h-7 w-7" />}
            title="Видеть"
            description="Скриншоты, отслеживание файлов, события на устройстве"
          />
          <CapabilityCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-7 w-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                />
              </svg>
            }
            title="Слышать"
            description="Уведомления из 100+ сервисов — Ozon, WB, Telegram и другие"
          />
          <CapabilityCard
            icon={<HandRaisedIcon className="h-7 w-7" />}
            title="Действовать"
            description="Выполнять команды, отправлять сообщения, управлять приложениями"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — How it works
         ═══════════════════════════════════════════════ */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          Как это работает
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">
          AgiMate — мост между AI-агентами и реальным миром
        </p>

        {/* 3-box diagram */}
        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {/* Box 1 — AI */}
          <div className="rounded-2xl border border-border/50 bg-surface p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Ваш AI (любой)
            </div>
            <div className="space-y-1 text-sm text-muted">
              <div>Claude</div>
              <div>ChatGPT</div>
              <div>Ваш бот</div>
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="hidden items-center justify-center md:flex">
            <div className="flex items-center gap-1 text-accent">
              <div className="h-px w-8 bg-accent" />
              <ArrowRightIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-center py-2 md:hidden">
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
            </svg>
          </div>

          {/* Box 2 — Platform */}
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 text-center shadow-lg shadow-accent/10">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">
              AgiMate Platform
            </div>
            <div className="text-sm font-medium text-muted">&laquo;Мост&raquo;</div>
          </div>

          {/* Arrow 2 */}
          <div className="hidden items-center justify-center md:flex">
            <div className="flex items-center gap-1 text-accent">
              <div className="h-px w-8 bg-accent" />
              <ArrowRightIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-center py-2 md:hidden">
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
            </svg>
          </div>

          {/* Box 3 — Devices & Services */}
          <div className="rounded-2xl border border-border/50 bg-surface p-6 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Устройства и сервисы
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted">
              <span className="flex items-center justify-center gap-1.5">
                <DevicePhoneMobileIcon className="h-4 w-4 text-accent" />
                Телефон
              </span>
              <span className="flex items-center justify-center gap-1.5">
                <ComputerDesktopIcon className="h-4 w-4 text-accent" />
                Компьютер
              </span>
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingCartIcon className="h-4 w-4 text-accent" />
                Ozon, WB
              </span>
              <span className="flex items-center justify-center gap-1.5">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-accent" />
                Telegram
              </span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-10 text-center text-muted">
          Работает с любым AI через MCP-протокол или n8n.
          <br className="hidden sm:block" />
          Подключите один раз — используйте везде.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — Use-cases
         ═══════════════════════════════════════════════ */}
      <section id="use-cases" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          Что можно автоматизировать
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-muted">
          Реальные задачи, которые AgiMate решает для бизнеса
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="group rounded-2xl border border-border/50 bg-surface p-6 transition-colors hover:border-accent/30"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <uc.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{uc.title}</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                {uc.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                {uc.flow.map((step, i) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded bg-accent/10 px-2 py-1 text-accent">
                      {step}
                    </span>
                    {i < uc.flow.length - 1 && (
                      <span className="text-accent/60">&rarr;</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 5 — CTA / Download
         ═══════════════════════════════════════════════ */}
      <section id="download" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Попробуйте сейчас
          </h2>
          <p className="mx-auto mb-6 max-w-md text-muted">
            Open-source. Бесплатно. Плагины от сообщества.
          </p>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="mb-14 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            Зарегистрироваться бесплатно
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {/* Android */}
          <DownloadCard
            icon={<DevicePhoneMobileIcon className="h-8 w-8" />}
            title="Android"
            description="Установите агент на телефон"
            buttonLabel="Скачать APK"
            disabled
          />
          {/* Desktop */}
          <DownloadCard
            icon={<ComputerDesktopIcon className="h-8 w-8" />}
            title="Desktop"
            description="Установите агент на компьютер"
            buttons={['Windows', 'macOS', 'Linux']}
            disabled
          />
          {/* n8n */}
          <DownloadCard
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            }
            title="n8n нода"
            description="Подключите к вашим workflow"
            buttonLabel="Документация"
            disabled
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 6 — Footer
         ═══════════════════════════════════════════════ */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <span className="text-sm text-muted">AgiMate &copy; 2025</span>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="#" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Telegram
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Документация
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function CapabilityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-6 text-center transition-colors hover:border-accent/30">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function DownloadCard({
  icon,
  title,
  description,
  buttonLabel,
  buttons,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel?: string;
  buttons?: string[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-surface p-8 text-center">
      <div className="mb-4 text-accent">{icon}</div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="mb-6 text-sm text-muted">{description}</p>
      {buttons ? (
        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((label) => (
            <button
              key={label}
              disabled={disabled}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <button
          disabled={disabled}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
