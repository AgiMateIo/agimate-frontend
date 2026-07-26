import type { ComponentType, SVGProps } from 'react';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CodeBracketIcon,
  CommandLineIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  PhotoIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/solid';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Telegram's paper plane — the only third-party brand in the catalog, so it is
// the only mark drawn by hand; everything else is an in-house connector and
// gets a glyph instead of a logo.
function TelegramMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

export interface ConnectorLogo {
  Icon: IconType;
  // Tinted tile classes (background + glyph), mirroring the initials fallback.
  tone: string;
}

// The catalog carries no logo or icon field, so the marks are hardcoded per
// connector code. Codes come from the backend's connector registry — see the
// seed texts in control-api (`seed/en/connectors.properties`), which is the
// enforced list. An unknown code (a connector added backend-side before this
// map catches up) falls back to the initials tile — never to a broken image.
const CONNECTOR_LOGOS: Record<string, ConnectorLogo> = {
  telegram: { Icon: TelegramMark, tone: 'bg-sky-500/15 text-sky-500' },
  'claude-code': { Icon: CommandLineIcon, tone: 'bg-orange-500/15 text-orange-500' },
  // Not indigo — that is the app's accent, reserved for `platform` below.
  acp: { Icon: CodeBracketIcon, tone: 'bg-teal-500/15 text-teal-500' },
  app: { Icon: DevicePhoneMobileIcon, tone: 'bg-slate-500/15 text-slate-500' },
  mcp: { Icon: PuzzlePieceIcon, tone: 'bg-violet-500/15 text-violet-500' },
  astro: { Icon: MoonIcon, tone: 'bg-purple-500/15 text-purple-500' },
  divination: { Icon: SparklesIcon, tone: 'bg-fuchsia-500/15 text-fuchsia-500' },
  board: { Icon: ViewColumnsIcon, tone: 'bg-emerald-500/15 text-emerald-500' },
  media: { Icon: PhotoIcon, tone: 'bg-rose-500/15 text-rose-500' },
  'persist-memory': { Icon: BookOpenIcon, tone: 'bg-amber-500/15 text-amber-500' },
  platform: { Icon: Squares2X2Icon, tone: 'bg-accent/10 text-accent' },
  sheets: { Icon: TableCellsIcon, tone: 'bg-green-500/15 text-green-500' },
  time: { Icon: ClockIcon, tone: 'bg-cyan-500/15 text-cyan-500' },
  webchat: { Icon: ChatBubbleLeftRightIcon, tone: 'bg-blue-500/15 text-blue-500' },
};

export const getConnectorLogo = (connectorCode: string): ConnectorLogo | undefined =>
  CONNECTOR_LOGOS[connectorCode];
