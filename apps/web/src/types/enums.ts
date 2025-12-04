export type UserRole = 'ADMIN' | 'PILOT';

export type DroneStatus = 'READY' | 'MAINTENANCE' | 'FLYING' | 'RETIRED';

export type ChecklistType = 'PRE_FLIGHT' | 'POST_FLIGHT';

export type MissionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

export type SessionStatus = 'LIVE' | 'COMPLETED' | 'FAILED';

export type GeofenceType = 'SAFE_ZONE' | 'NO_FLY_ZONE';

export type AlertType =
  | 'LOW_BATTERY'
  | 'GEOFENCE_BREACH'
  | 'SIGNAL_LOST'
  | 'MISSION_ERROR';
