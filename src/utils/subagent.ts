// The incoming message of a subagent's session is not something a person typed:
// it is the errand block the agent handed to the model, XML and all. Rendering
// it as a chat bubble shows the reader the wire format instead of the task, so
// the pieces are picked out here and drawn as fields.
//
// Everything is deliberately forgiving. This is not a parser of a format we own
// — the backend writes it for the model, not for us — so a shape that doesn't
// match is not an error to report but a reason to show the raw text unchanged,
// which is always readable and never wrong.

export interface SubagentRequest {
  // The errand's name — the same string the session is titled with.
  title: string | null;
  mode: string | null;
  // What the subagent was told to do, and what it was given to do it with.
  // `context` is legitimately absent.
  instructions: string;
  context: string | null;
}

const ROOT = 'subagent_request';

// XML's five, plus the numeric forms the escaper may emit. Ordered so `&amp;`
// is undone last: doing it first would turn `&amp;lt;` into a tag.
function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function attribute(openTag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(openTag);
  return match ? unescapeXml(match[1]) : null;
}

function child(body: string, name: string): string | null {
  const match = new RegExp(`<${name}\\s*>([\\s\\S]*?)</${name}\\s*>`).exec(body);
  return match ? unescapeXml(match[1]).trim() : null;
}

/**
 * Reads the errand out of a subagent session's incoming message.
 *
 * Returns null for anything that isn't one — an ordinary message, a block the
 * backend has since reshaped, a truncated one. The caller renders the text as
 * it stands in that case; there is no half-parsed state.
 */
export function parseSubagentRequest(text: string | null): SubagentRequest | null {
  if (!text) return null;

  const open = new RegExp(`<${ROOT}(\\s[^>]*)?>`).exec(text);
  if (!open) return null;
  const closeAt = text.indexOf(`</${ROOT}>`, open.index + open[0].length);
  if (closeAt < 0) return null;

  const body = text.slice(open.index + open[0].length, closeAt);
  const instructions = child(body, 'instructions');
  // The one field the block exists for. Without it there is nothing to show
  // that the raw text wouldn't show better.
  if (!instructions) return null;

  const openTag = open[0];
  return {
    title: attribute(openTag, 'title'),
    mode: attribute(openTag, 'mode'),
    instructions,
    context: child(body, 'context'),
  };
}
