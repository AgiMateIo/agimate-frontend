const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';
const DEFAULT_STYLE = 'bottts';

export function getAgentAvatarUrl(name: string): string {
  return `${DICEBEAR_BASE}/${DEFAULT_STYLE}/svg?seed=${encodeURIComponent(name)}`;
}
