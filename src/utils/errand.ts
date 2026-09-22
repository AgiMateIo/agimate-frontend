// The incoming message of an errand's session is not something a person typed:
// it is the block the delegating agent handed to the model, XML and all.
// Rendering it as a chat bubble shows the reader the wire format instead of the
// task, so the pieces are picked out here and drawn as fields.
//
// Two blocks, one shape. `<subagent_request>` is an agent sending a copy of
// itself on an errand; `<agent_request>` is one agent of a team handing work to
// another, and carries who sent it — the only difference that reaches the
// reader, since in the second case the session belongs to somebody else.
//
// Everything is deliberately forgiving. This is not a parser of a format we own
// — the backend writes it for the model, not for us — so a shape that doesn't
// match is not an error to report but a reason to show the raw text unchanged,
// which is always readable and never wrong.

export interface ErrandRequest {
  // The errand's name — the same string the session is titled with.
  title: string | null;
  mode: string | null;
  // What the addressee was told to do, and what it was given to do it with.
  // `context` is legitimately absent.
  instructions: string;
  context: string | null;
  // Who handed the errand over. Null on a subagent's errand: there the sender
  // is the agent whose copy is working, so naming it would say nothing.
  fromAgent: string | null;
  fromAgentId: string | null;
}

// Newest first: a block that carries an author is an `<agent_request>`, and the
// older root is what everything else is.
const ROOTS = ['agent_request', 'subagent_request'] as const;

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
 * Reads the errand out of the first message of a delegated session.
 *
 * Returns null for anything that isn't one — an ordinary message, a block the
 * backend has since reshaped, a truncated one. The caller renders the text as
 * it stands in that case; there is no half-parsed state.
 */
export function parseErrandRequest(text: string | null): ErrandRequest | null {
  if (!text) return null;

  for (const root of ROOTS) {
    const open = new RegExp(`<${root}(\\s[^>]*)?>`).exec(text);
    if (!open) continue;
    const closeAt = text.indexOf(`</${root}>`, open.index + open[0].length);
    if (closeAt < 0) continue;

    const body = text.slice(open.index + open[0].length, closeAt);
    const instructions = child(body, 'instructions');
    // The one field the block exists for. Without it there is nothing to show
    // that the raw text wouldn't show better.
    if (!instructions) continue;

    const openTag = open[0];
    return {
      title: attribute(openTag, 'title'),
      mode: attribute(openTag, 'mode'),
      instructions,
      context: child(body, 'context'),
      fromAgent: attribute(openTag, 'from_agent'),
      fromAgentId: attribute(openTag, 'from_agent_id'),
    };
  }

  return null;
}
