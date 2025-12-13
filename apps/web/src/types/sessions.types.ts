export type SessionStatus = 'LIVE' | 'COMPLETED' | 'FAILED';

export interface FlightSession {
  session_id: string;
  mission_id?: string | null;
  drone_id: string;
  pilot_id: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: SessionStatus | string | null;
  mission_name?: string | null;
  drone_name?: string | null;
  pilot_name?: string | null;
  drone_lora_id?: string | null;
}
