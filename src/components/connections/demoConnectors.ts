// Placeholder ("coming soon") connectors shown in the connector picker next to
// the real catalog. They are NOT selectable — the backend has no code for them,
// so creating a connection would fail. Purely a preview of what is planned.
//
// When one of these ships in the backend catalog, delete its entry here: the
// picker filters out any placeholder whose code the real catalog already
// carries, and the mark in connectorLogo.tsx keeps working.
export interface DemoConnector {
  code: string;
  name: string;
  // Key inside the `Connections` namespace holding the one-line description.
  descriptionKey: string;
}

// `as const` keeps `descriptionKey` a literal union so `t()` stays type-checked.
export const DEMO_CONNECTORS = [
  { code: 'google-drive', name: 'Google Drive', descriptionKey: 'demoGoogleDrive' },
  { code: 'google-sheets', name: 'Google Sheets', descriptionKey: 'demoGoogleSheets' },
  { code: 'google-docs', name: 'Google Docs', descriptionKey: 'demoGoogleDocs' },
  { code: 'notion', name: 'Notion', descriptionKey: 'demoNotion' },
  { code: 'zapier', name: 'Zapier', descriptionKey: 'demoZapier' },
  { code: 'slack', name: 'Slack', descriptionKey: 'demoSlack' },
  { code: 'dropbox', name: 'Dropbox', descriptionKey: 'demoDropbox' },
  { code: 'github', name: 'GitHub', descriptionKey: 'demoGithub' },
  { code: 'gmail', name: 'Gmail', descriptionKey: 'demoGmail' },
  { code: 'google-calendar', name: 'Google Calendar', descriptionKey: 'demoGoogleCalendar' },
  { code: 'discord', name: 'Discord', descriptionKey: 'demoDiscord' },
  { code: 'airtable', name: 'Airtable', descriptionKey: 'demoAirtable' },
] as const satisfies readonly DemoConnector[];

// How many placeholders the picker reveals per "More" click. Six fills two rows
// of the three-column grid, and the list length is a multiple of it so the
// button disappears on a full page rather than a ragged one.
export const DEMO_PAGE_SIZE = 6;
