import {
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  LinkIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { DashboardResources } from '@/queries/dashboard';

// Label/empty keys are unions rather than template strings so next-intl can
// still check them.
export interface ResourceCardSpec {
  key: keyof DashboardResources & (
    'agents' | 'skills' | 'connections' | 'channels' | 'teams' | 'apps'
  );
  labelKey: 'agents' | 'skills' | 'connections' | 'channels' | 'teams' | 'apps';
  emptyKey: 'noAgents' | 'noSkills' | 'noConnections' | 'noChannels' | 'noTeams' | 'noApps';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  // Where "create the first one" goes, when that differs from the list page.
  createHref?: string;
}

// Icons mirror the sidebar so a card and its nav entry read as the same thing.
export const RESOURCE_CARDS: ResourceCardSpec[] = [
  {
    key: 'agents',
    labelKey: 'agents',
    emptyKey: 'noAgents',
    icon: UserCircleIcon,
    href: '/dashboard/agents',
    createHref: '/dashboard/agents/create',
  },
  {
    key: 'skills',
    labelKey: 'skills',
    emptyKey: 'noSkills',
    icon: AcademicCapIcon,
    href: '/dashboard/skills',
  },
  {
    key: 'connections',
    labelKey: 'connections',
    emptyKey: 'noConnections',
    icon: LinkIcon,
    href: '/dashboard/connections',
  },
  {
    key: 'channels',
    labelKey: 'channels',
    emptyKey: 'noChannels',
    icon: ChatBubbleLeftRightIcon,
    href: '/dashboard/channels',
  },
  {
    key: 'teams',
    labelKey: 'teams',
    emptyKey: 'noTeams',
    icon: UserGroupIcon,
    href: '/dashboard/agentic-teams',
  },
  {
    key: 'apps',
    labelKey: 'apps',
    emptyKey: 'noApps',
    icon: DevicePhoneMobileIcon,
    href: '/dashboard/apps',
  },
];
