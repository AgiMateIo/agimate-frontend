// Skill types

export interface SkillResponse {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isPublic: boolean;
  isFeatured: boolean;
  userPubId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetailResponse extends SkillResponse {
  skillMd: string;
}

export interface CreateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

export interface UpdateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

export interface SkillFileEntry {
  path: string;
  name: string;
  size: number;
  directory: boolean;
}
