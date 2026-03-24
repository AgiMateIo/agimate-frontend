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

// Skill connector bindings

export type SkillConnectorType = 'TOOL' | 'TRIGGER';

export interface SkillConnectorResponse {
  id: string;
  connectorCode: string;
  type: SkillConnectorType | null;
  name: string | null;
}

export interface SkillConnectorRequest {
  connectorCode: string;
  type?: SkillConnectorType | null;
  name?: string | null;
}

// Connector catalog entry (from GET /device/manage/connectors/)

export interface ConnectorCatalogEntry {
  code: string;
  type: string;
  name: string;
  description: string;
}
