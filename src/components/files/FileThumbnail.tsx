'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentIcon,
  MusicalNoteIcon,
  PhotoIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { resolveControlFileUrl } from '@/utils/api-url';
import { fileFormatLabel } from '@/utils/files';
import type { UserFileResponse, UserFileType } from '@/types';

const TYPE_ICONS: Record<UserFileType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  image: PhotoIcon,
  video: VideoCameraIcon,
  audio: MusicalNoteIcon,
  file: DocumentIcon,
};

/**
 * A file's visual: the image itself when there is one, a type icon plus format
 * badge otherwise. The caller owns the box (`className`) so the same component
 * fills a card's media band, a compact tile and a table cell.
 *
 * Signed links expire (~15 min). The first load failure asks the caller for
 * fresh rows; a second one falls back to the icon rather than leaving the user
 * with a broken image.
 */
export function FileThumbnail({
  file,
  onLinkExpired,
  className,
  iconClassName = 'h-8 w-8',
  showFormat = true,
}: {
  file: UserFileResponse;
  onLinkExpired?: () => void;
  className: string;
  iconClassName?: string;
  showFormat?: boolean;
}) {
  const t = useTranslations('Files');
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);
  const Icon = TYPE_ICONS[file.type];

  if (file.type !== 'image' || failed) {
    return (
      <div className={`${className} grid place-items-center gap-1 text-muted`}>
        <Icon className={iconClassName} />
        {showFormat && (
          <span className="text-[10px] font-semibold tracking-wide">
            {fileFormatLabel(file)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed cross-origin URL, not a local asset */}
      <img
        src={resolveControlFileUrl(file.url)}
        alt={t('previewAlt')}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => {
          if (retriedRef.current || !onLinkExpired) {
            setFailed(true);
            return;
          }
          retriedRef.current = true;
          onLinkExpired();
        }}
      />
    </div>
  );
}
