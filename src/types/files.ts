// User files — one layer for everything that passed through it, whatever the
// origin: chat attachments, media a messenger delivered, images an agent
// generated, spreadsheet exports. One entity with one id, not several stores.
//
// The access boundary is the *user*, not the agent and not the conversation:
// somebody else's `agf_` never resolves, and `agentId`/`origin`/`sessionId` are
// provenance and navigation rather than permissions.

// What to render: a preview or an icon.
export type UserFileType = 'image' | 'video' | 'audio' | 'file';

export interface UserFileResponse {
  // Opaque `agf_<uuid>` — never parse it or strip the prefix. The same string
  // is the currency everywhere: `parts[].fileId` of a message, an
  // `[[attach:agf_…]]` marker in an agent's answer, an agent tool's argument.
  id: string;
  // Null wherever a name never existed (a messenger photo, a generated image).
  // The backend refuses to invent one — the UI falls back to type + size.
  // Such a file is also invisible to the `name` filter, which has nothing to
  // match against.
  name: string | null;
  type: UserFileType;
  mime: string;
  size: number;
  // The agent that *created* the file; null when it came from outside (the user
  // uploaded it, it arrived in an incoming message). Provenance only — the
  // `agentId` *filter* is wider than this field (see UserFilesFilters), so a
  // filtered list legitimately contains rows with a different agent or none.
  agentId: string | null;
  // Technical provenance string (`user:chat`, `telegram:<id>`, `media:<model>`,
  // `sheets:export`, `app:<id>`) — an upload's own `origin` label arrives here
  // under the `user:` prefix. Not a contract — tooltip/debug only, never parse.
  origin: string;
  // The conversation the file belongs to, when it has one. Navigation, not
  // access — a file is reachable by id regardless.
  sessionId?: string | null;
  createdAt: string;
  // Automatic deletion moment. Retention depends on where the file came from:
  // 90 days for what a person uploaded, 7 for what a connector produced (a
  // screenshot, a generated image, an export). Cannot be extended from the UI,
  // so the remaining time has to stay visible — and an `agf_` out of old
  // history that no longer opens is the normal end of that, not an error.
  expiresAt: string;
  // Signed link to the content, valid ~15 min. Either a path under the control
  // context path (`/files/agf_…?exp=…&sig=…`, a public route that takes no
  // Authorization header — that is what makes <img src> work) or, with
  // presigning on, an absolute storage URL. Route it through
  // `resolveControlFileUrl` and never persist it: a 403 on an image is a dead
  // signature, and re-reading the listing is how a fresh one is obtained.
  url: string;
}

export interface UserFilesFilters {
  // Everything *related* to the agent — what it produced and what it was shown.
  // Wider than the row's own `agentId` field, which names the producer alone.
  agentId?: string;
  // Everything that passed through one conversation: sent by the user, returned
  // by the agent, produced by a tool inside it — the attachment panel of a
  // dialogue, ready-made.
  sessionId?: string;
  // Case-insensitive substring of the name; empty means no filter. Files
  // without a name are not findable this way.
  name?: string;
}
