const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';
const DEFAULT_STYLE = 'bottts';

export function getAgentAvatarUrl(name: string, style = DEFAULT_STYLE): string {
  return `${DICEBEAR_BASE}/${style}/svg?seed=${encodeURIComponent(name)}`;
}
