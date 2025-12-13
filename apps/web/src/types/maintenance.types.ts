export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"

export interface MaintenanceLog {
  log_id: string
  drone_id: string
  notes: string
  scheduled_for: string
  status: MaintenanceStatus
  assigned_pilot_id?: string | null
  assigned_pilot_name?: string | null
  created_by_user_id?: string | null
  created_by_name?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface MaintenanceAssignee {
  user_id: string
  full_name: string
  email: string
}

export interface CreateMaintenanceLogPayload {
  notes: string
  scheduled_for?: string
  assigned_pilot_id: string
  status?: MaintenanceStatus
}

export interface UpdateMaintenanceLogPayload {
  notes?: string
  scheduled_for?: string
  assigned_pilot_id?: string
  status?: MaintenanceStatus
}

export interface MaintenanceFormValues {
  drone_id: string
  notes: string
  scheduled_for: string
  assigned_pilot_id: string
  status: MaintenanceStatus
}
