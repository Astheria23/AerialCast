import type { ChecklistType } from './checklists.types';
import type { GeofencePoint, GeofenceType } from './geofences.types';

export type MissionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

export interface MissionChecklistRef {
  checklist_id: string;
  title: string;
  type: ChecklistType | string;
}

export interface MissionGeofenceRef {
  geofence_id: string;
  area_name: string;
  type: GeofenceType | string;
  points?: GeofencePoint[];
}

export interface MissionWaypoint {
  waypoint_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  order: number;
}

export interface Mission {
  mission_id: string;
  mission_name: string;
  notes?: string | null;
  drone_id: string;
  drone_name?: string | null;
  created_by_user_id?: string;
  pilot_name?: string | null;
  created_at?: string;
  status?: MissionStatus | string | null;
  waypoints: MissionWaypoint[];
  save_as_draft?: boolean;
  checklist_ids?: string[];
  geofence_ids?: string[];
  required_checklists?: MissionChecklistRef[];
  active_geofences?: MissionGeofenceRef[];
}

export interface MissionFormValues {
  mission_name: string;
  drone_id: string;
  notes?: string;
  save_as_draft?: boolean;
  status?: MissionStatus | string;
  waypoints: MissionWaypoint[];
  checklist_ids?: string[];
  geofence_ids?: string[];
}

export interface CreateMissionPayload {
  mission_name: string;
  drone_id: string;
  notes?: string;
  save_as_draft?: boolean;
  waypoints: MissionWaypoint[];
  checklist_ids?: string[];
  geofence_ids?: string[];
}

export interface UpdateMissionPayload {
  mission_name?: string;
  drone_id?: string;
  notes?: string;
  status?: MissionStatus | string;
  save_as_draft?: boolean;
  waypoints?: MissionWaypoint[];
  checklist_ids?: string[];
  geofence_ids?: string[];
}

export type MissionStatusAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'start'
  | 'complete'
  | 'cancel';
