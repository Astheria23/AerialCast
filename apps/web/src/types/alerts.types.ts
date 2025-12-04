import { ISODateTimeString, UUID } from './common';
import { AlertType } from './enums';

export interface Alert {
  alert_id: UUID;
  session_id: UUID | null;
  alert_type: AlertType;
  message: string;
  timestamp: ISODateTimeString;
}
