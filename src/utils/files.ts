// Human-readable byte size (e.g. "384 KB", "1.2 MB").
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

// Subtypes whose own text is not a usable label (the xlsx one is a 60-character
// `vnd.openxmlformats-…` string).
const MIME_LABELS: Record<string, string> = {
  'text/csv': 'CSV',
  'text/plain': 'TXT',
  'text/html': 'HTML',
  'application/pdf': 'PDF',
  'application/json': 'JSON',
  'application/zip': 'ZIP',
  'application/vnd.ms-excel': 'XLS',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
};

// Short format badge for a file without a preview ("PDF", "XLSX", "PNG").
// The name's extension is what the user recognises, so it wins over the MIME
// whenever the MIME is not one of the known long ones.
export function fileFormatLabel(file: { name: string | null; mime: string }): string {
  const known = MIME_LABELS[file.mime];
  if (known) return known;
  const dot = file.name?.lastIndexOf('.') ?? -1;
  const ext = dot > 0 ? file.name!.slice(dot + 1) : '';
  if (ext && ext.length <= 5) return ext.toUpperCase();
  const subtype = file.mime.split('/')[1]?.replace(/^x-/, '') ?? '';
  if (subtype && subtype.length <= 5) return subtype.toUpperCase();
  return file.mime.split('/')[0]?.toUpperCase() || 'FILE';
}

const HOUR_MS = 60 * 60 * 1000;

export type ExpiryStage = 'expired' | 'withinHour' | 'hours' | 'days';

export interface FileExpiry {
  stage: ExpiryStage;
  // Whole units left, matching `stage` ('hours' → hours, 'days' → days).
  count: number;
  // Under a day left: worth setting apart, because the file is about to go.
  urgent: boolean;
}

// Retention depends on where the file came from — 90 days for an upload, 7 for
// what a connector produced — and cannot be extended from the UI, so the
// remaining time is read off `expiresAt` rather than computed from a constant.
// It has to stay visible: files vanishing on schedule otherwise read as data
// loss.
export function getFileExpiry(expiresAt: string, now: number = Date.now()): FileExpiry {
  const at = new Date(expiresAt.replace(' ', 'T')).getTime();
  const left = at - now;
  if (Number.isNaN(at) || left <= 0) return { stage: 'expired', count: 0, urgent: true };
  if (left < HOUR_MS) return { stage: 'withinHour', count: 0, urgent: true };
  if (left < 24 * HOUR_MS) {
    return { stage: 'hours', count: Math.floor(left / HOUR_MS), urgent: true };
  }
  return { stage: 'days', count: Math.floor(left / (24 * HOUR_MS)), urgent: false };
}
