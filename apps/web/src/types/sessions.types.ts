import { ISODateTimeString, UUID } from './common';
import { SessionStatus } from './enums';

export interface FlightSession {
  session_id: UUID;
  status: SessionStatus;
  start_time: ISODateTimeString;
  end_time: ISODateTimeString | null;
  mission_id: UUID | null;
  drone_id: UUID;
  pilot_id: UUID;
  mission_name?: string;
  drone_name?: string;
  pilot_name?: string;
}
