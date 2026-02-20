export interface AgenticTeam {
  id: string;          // UUID from backend
  name: string;
  description: string;
  createdAt: string;   // yyyy-MM-dd'T'HH:mm:ss
  updatedAt: string;   // yyyy-MM-dd'T'HH:mm:ss
}

export interface CreateAgenticTeamRequest {
  name: string;
  description: string;
}

export interface UpdateAgenticTeamRequest {
  name: string;
  description: string;
}
