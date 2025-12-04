import { ISODateTimeString, UUID } from './common';
import { GeofenceType } from './enums';

export interface GeofencePoint {
	point_id: UUID;
	latitude: number;
	longitude: number;
	order: number;
}

export interface Geofence {
	geofence_id: UUID;
	area_name: string;
	type: GeofenceType;
	created_at: ISODateTimeString;
	points: GeofencePoint[];
}

export interface CreateGeofencePayload {
	area_name: string;
	type: GeofenceType;
	points: Array<Omit<GeofencePoint, 'point_id'>>;
}

export type UpdateGeofencePayload = Partial<CreateGeofencePayload>;
