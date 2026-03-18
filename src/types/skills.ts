// Skill types

export type SkillType = 'TRIGGER' | 'COMMON';

export interface SkillResponse {
  id: string;
  name: string;
  description: string | null;
  type: SkillType;
  version: number;
  isPublic: boolean;
  userPubId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetailResponse extends SkillResponse {
  skillMd: string;
}

export interface CreateSkillRequest {
  skillMd: string;
  type: SkillType;
  isPublic?: boolean;
}

export interface UpdateSkillRequest {
  skillMd: string;
  type: SkillType;
  isPublic?: boolean;
}

export interface SkillFileEntry {
  path: string;
  name: string;
  size: number;
  directory: boolean;
}
