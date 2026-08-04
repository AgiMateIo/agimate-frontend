// User files — everything that passed through the file layer, whatever its
// origin: chat attachments, media a messenger delivered, images an agent
// generated, spreadsheet exports. One entity with one id, not several stores.

// What to render: a preview or an icon.
export type UserFileType = 'image' | 'video' | 'audio' | 'file';

export interface UserFileResponse {
  // Opaque `agf_<uuid>` — never parse it or strip the prefix; it is what every
  // other endpoint accepts.
  id: string;
  // Null wherever a name never existed (a messenger photo, a generated image).
  // The backend refuses to invent one — the UI falls back to type + size.
  name: string | null;
  type: UserFileType;
  mime: string;
  size: number;
  // The agent that *created* the file; null when it came from outside (the user
  // uploaded it, it arrived in an incoming message). Ownership is not the
  // question — every file in the list belongs to the current user.
  agentId: string | null;
  // Technical provenance string (`webchat`, `telegram:<id>`, `media:<model>`,
  // `sheets:export`, `app:<id>`). Not a contract — tooltip/debug only, never parse.
  origin: string;
  createdAt: string;
  // Automatic deletion moment (default 7 days after createdAt). Cannot be
  // extended from the UI.
  expiresAt: string;
  // Signed link relative to the control context path, valid ~15 min. Do not
  // persist it — re-read the list for fresh signatures.
  url: string;
}

export interface UserFilesFilters {
  agentId?: string;
  // Case-insensitive substring of the name; empty means no filter.
  name?: string;
}
