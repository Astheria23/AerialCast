export interface Drone {
  drone_id: string;
  name: string;
  model: string;
  lora_id: string;
  status: string | null;
  created_at: string;
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
  status?: string | null;
}

export interface DronesResponse {
  drones: Drone[];
  total: number;
}
