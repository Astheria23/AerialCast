import { ISODateTimeString, UUID } from './common';
import { DroneStatus } from './enums';

export interface Drone {
  drone_id: UUID;
  name: string;
  model: string;
  lora_id: string;
  status: DroneStatus;
  created_at: ISODateTimeString;
}

export interface CreateDronePayload {
  name: string;
  model: string;
  lora_id: string;
}

export interface UpdateDronePayload {
  name?: string;
  model?: string;
  lora_id?: string;
  status?: DroneStatus;
}
