export type GeofenceType = 'SAFE_ZONE' | 'NO_FLY_ZONE';

export interface GeofencePoint {
  point_id?: string;
  latitude: number;
  longitude: number;
  order: number;
}

export interface Geofence {
  geofence_id: string;
  area_name: string;
  type: GeofenceType;
  created_at?: string;
  points: GeofencePoint[];
}

export interface GeofenceFormValues {
  area_name: string;
  type: GeofenceType;
  points: GeofencePoint[];
}

export interface CreateGeofencePayload {
  area_name: string;
  type: GeofenceType;
  points: GeofencePoint[];
}

export interface UpdateGeofencePayload {
  area_name?: string;
  type?: GeofenceType;
  points?: GeofencePoint[];
}
