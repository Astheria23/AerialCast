import { ISODateString, UUID } from './common';

export interface MaintenanceLog {
  log_id: UUID;
  drone_id: UUID;
  serviced_by_user_id: UUID | null;
  log_date: ISODateString;
  notes: string;
  serviced_by_name?: string;
}

export interface MaintenanceLogPayload {
  drone_id: UUID;
  notes: string;
  log_date?: ISODateString;
  serviced_by_user_id?: UUID;
}

export type MaintenanceLogUpdatePayload = Partial<MaintenanceLogPayload>;
