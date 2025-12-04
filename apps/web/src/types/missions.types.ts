import { ISODateTimeString, UUID } from './common';
import { ChecklistRef } from './checklists.types';
import { MissionStatus } from './enums';

export interface MissionWaypoint {
  waypoint_id: UUID;
  latitude: number;
  longitude: number;
  altitude: number;
  order: number;
}

export interface Mission {
  mission_id: UUID;
  mission_name: string;
  notes?: string | null;
  drone_id: UUID;
  created_by_user_id: UUID;
  created_at: ISODateTimeString;
  status: MissionStatus;
  waypoints: MissionWaypoint[];
  required_checklists: ChecklistRef[];
}

export interface MissionPayload {
  mission_name: string;
  notes?: string;
  drone_id: UUID;
  waypoints: Array<Omit<MissionWaypoint, 'waypoint_id'>>;
  checklist_ids?: UUID[];
  save_as_draft?: boolean;
}

export type MissionUpdatePayload = Partial<MissionPayload> & {
  waypoints?: Array<Omit<MissionWaypoint, 'waypoint_id'>>;
};
