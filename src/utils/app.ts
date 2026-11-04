// The app names itself at link time; until then `code`/`title` are null. A row
// connected before that change keeps its old user label in `code`.
export function appLabel(app: {
  title?: string | null;
  code?: string | null;
}): string | null {
  return app.title || app.code || null;
}
