export interface Drone {
  drone_id: string;
  name: string;
  model: string;
  lora_id: string;
  status: string | null;
  created_at: string;
  specs?: DroneSpecs | null;
}

export interface CreateDronePayload {
  name: string;
  model: string;
  lora_id: string;
  specs?: DroneSpecsInput;
}

export interface UpdateDronePayload {
  name?: string;
  model?: string;
  lora_id?: string;
  status?: string | null;
  specs?: DroneSpecsInput;
}

export interface DroneSpecs {
  spec_id?: string;
  drone_id?: string;
  flight_controller?: string | null;
  motor?: string | null;
  esc?: string | null;
  propeller?: string | null;
  battery?: string | null;
  gps_module?: string | null;
  weight_g?: number | null;
  max_flight_time_min?: number | null;
  additional_info?: string | null;
  image_url?: string | null;
}

export interface DroneSpecsInput extends Omit<DroneSpecs, "spec_id" | "drone_id" | "image_url"> {
  image_base64?: string | null;
}

export interface DronesResponse {
  drones: Drone[];
  total: number;
}
