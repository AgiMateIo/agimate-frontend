'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { resolveControlFileUrl } from '@/utils/api-url';

// Pages run to hundreds of kilobytes and the link lives ~15 minutes, so the
// body is fetched when the user asks for it and never while history renders.
// Past this the card offers the download alone — a megabyte of markup inside a
// `srcdoc` attribute is a frozen tab, not a preview.
export const HTML_PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

// What went wrong, in the terms the card has to answer in: `gone` retires the
// attachment entirely, `noPreview` keeps the download.
export type PreviewFailure = 'gone' | 'noPreview' | 'expired' | 'failed';

interface FetchOutcome {
  html?: string;
  // Absent on success and on an aborted load.
  failure?: PreviewFailure;
}

// One attempt at a page's body through its own signed link. No `credentials`:
// the signature *is* the authorization (SigV4 in a storage URL, exp+sig in
// ours), and cookies would only cost a preflight the storage host would fail.
//
// The server hands HTML out as `application/octet-stream` with
// `Content-Disposition: attachment` deliberately — so that following the link
// downloads a file instead of running a model-written page on our origin. That
// header says nothing about the body: the type is the attachment's `mime`, and
// `Response.text()` decodes UTF-8 whatever the header claimed.
async function fetchOnce(url: string, signal: AbortSignal): Promise<FetchOutcome> {
  let res: Response;
  try {
    res = await fetch(resolveControlFileUrl(url), { credentials: 'omit', signal });
  } catch {
    if (signal.aborted) return {};
    // A cross-origin storage link with no CORS headers never lets the status
    // through — a 403 there is indistinguishable from a network failure, so
    // re-signing would be guesswork. The card drops the preview and keeps the
    // download, which needs neither CORS nor a header.
    return { failure: 'noPreview' };
  }
  if (res.status === 404) return { failure: 'gone' };
  if (res.status === 403) return { failure: 'expired' };
  if (!res.ok) return { failure: 'failed' };
  return { html: await res.text() };
}

// A readable 403 only reaches us on the control-api path shape, and there it
// says one thing: the signature timed out. Fresh ones come from re-reading
// history — once, and never in a loop.
async function loadPageBody(
  url: string,
  signal: AbortSignal,
  refreshedUrl: () => Promise<string | null>
): Promise<FetchOutcome> {
  const first = await fetchOnce(url, signal);
  if (first.failure !== 'expired') return first;
  const fresh = await refreshedUrl();
  if (signal.aborted) return {};
  if (!fresh || fresh === url) return { failure: 'failed' };
  const second = await fetchOnce(fresh, signal);
  return second.failure === 'expired' ? { failure: 'failed' } : second;
}

// The page itself, in a document of its own.
//
// `sandbox` without `allow-same-origin` is the whole security model, not a
// setting: a model wrote this markup and anything that reached the agent's
// context could have dictated it. With `allow-same-origin` its scripts would
// run on the dashboard's origin — cookies, localStorage, the access token and
// the API under the user's name. Without it the document's origin is opaque and
// the page can see nothing of ours.
//
// Deliberately absent as well: `allow-top-navigation` (walks the tab off to
// another site), `allow-forms`, `allow-modals`, `allow-popups-to-escape-sandbox`
// (all let the page talk to the user around the chat).
//
// A `srcdoc` document inherits the embedder's CSP, so the day the dashboard
// forbids inline scripts the preview turns static. That is the right trade —
// reports and documents an agent writes are static anyway, and the CSP is not
// to be loosened for this.
function PageFrame({ html, title }: { html: string; title: string }) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      // An iframe has no intrinsic height and the modal scrolls, so without an
      // explicit one the page would collapse to nothing.
      className="h-[70vh] w-full rounded-lg border border-border bg-white"
    />
  );
}

export function HtmlAttachmentPreview({
  url,
  title,
  onClose,
  onGone,
  onNoPreview,
  refreshedUrl,
}: {
  // The attachment's signed link as the message carries it — already signed for
  // this message's version of the file, so there is nothing to build here.
  url: string;
  title: string;
  onClose: () => void;
  // The file is gone for good — the card retires both of its actions.
  onGone: () => void;
  // Only the preview is impossible (a storage link JS may not read); the card
  // keeps offering the download.
  onNoPreview: () => void;
  // Re-reads history and answers with this attachment's freshly signed link.
  refreshedUrl: () => Promise<string | null>;
}) {
  const t = useTranslations('Chat');
  const [html, setHtml] = useState<string | null>(null);
  // Why there is nothing to show — a deleted file and an unreachable one are
  // different news, and the card behaves differently after each.
  const [failure, setFailure] = useState<PreviewFailure | null>(null);
  // The body belongs to one version of one file; the modal is mounted per
  // opening, so there is nothing to invalidate — a refreshed signature points
  // at the same version, and another version is another message's card.
  const urlRef = useRef(url);

  useEffect(() => {
    const controller = new AbortController();
    loadPageBody(urlRef.current, controller.signal, refreshedUrl)
      .then(({ html: body, failure: reason }) => {
        if (controller.signal.aborted) return;
        if (body !== undefined) {
          setHtml(body);
          return;
        }
        setFailure(reason ?? 'failed');
        if (reason === 'gone') onGone();
        if (reason === 'noPreview') onNoPreview();
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailure('failed');
      });
    // Closing mid-fetch must not land state on a gone component.
    return () => controller.abort();
    // Mount-only: the modal exists for one opening of one attachment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal isOpen onClose={onClose} title={title} size="xl">
      {failure ? (
        <ErrorAlert>{failure === 'gone' ? t('fileGone') : t('previewUnavailable')}</ErrorAlert>
      ) : html === null ? (
        <Placeholder size="sm">{t('previewLoading')}</Placeholder>
      ) : (
        <PageFrame html={html} title={title} />
      )}
    </Modal>
  );
}
