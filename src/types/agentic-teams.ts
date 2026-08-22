export interface AgenticTeam {
  id: string;          // UUID from backend
  name: string;
  // Clearable, and cleared by sending `""` — so a description that was wiped
  // comes back as null, not as an empty string.
  description: string | null;
  createdAt: string;   // yyyy-MM-dd'T'HH:mm:ss
  updatedAt: string;   // yyyy-MM-dd'T'HH:mm:ss
}

export interface CreateAgenticTeamRequest {
  name: string;
  description: string;
}

// Body of PATCH /manage/agentic-teams/{id}. Same three states as the agent's:
// absent or null leaves a field alone, "" clears it, and "" in `name` is a 400.
// The name-taken check runs only when a name is actually sent, so editing the
// description alone can no longer fail on a name conflict.
export interface PatchAgenticTeamRequest {
  name?: string;
  description?: string | null;
}
