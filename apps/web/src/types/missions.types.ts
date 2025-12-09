import type { ChecklistType } from './checklists.types';
import type { GeofencePoint, GeofenceType } from './geofences.types';

export type MissionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'READY_FOR_FLIGHT'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

export type PreflightStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface MissionPreflightItem {
  preflight_item_id: string;
  preflight_id?: string;
  source_checklist_id?: string | null;
  source_checklist_item_id?: string | null;
  section_title?: string | null;
  section_order?: number | null;
  item_text: string;
  order?: number | null;
  is_completed: boolean;
  note?: string | null;
  completed_by_user_id?: string | null;
  completed_by_name?: string | null;
  completed_at?: string | null;
}

export interface MissionPreflightChecklist {
  preflight_id: string;
  mission_id: string;
  status: PreflightStatus;
  created_at?: string;
  completed_at?: string | null;
  template_checklist_ids?: string[];
  items: MissionPreflightItem[];
}

export interface MissionPreflightUpdateItem {
  preflight_item_id: string;
  is_completed?: boolean;
  note?: string | null;
}

export interface MissionPreflightUpdatePayload {
  items: MissionPreflightUpdateItem[];
}

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
  approval_notes?: string | null;
  drone_id: string;
  drone_name?: string | null;
  created_by_user_id?: string;
  pilot_name?: string | null;
  created_at?: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  ready_for_flight_at?: string | null;
  rejected_at?: string | null;
  status?: MissionStatus | string | null;
  waypoints: MissionWaypoint[];
  save_as_draft?: boolean;
  checklist_ids?: string[];
  geofence_ids?: string[];
  required_checklists?: MissionChecklistRef[];
  active_geofences?: MissionGeofenceRef[];
  assigned_pilot_id?: string | null;
  assigned_pilot_name?: string | null;
  preflight_checklist?: MissionPreflightChecklist | null;
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
