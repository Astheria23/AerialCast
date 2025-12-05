export interface MaintenanceLog {
  log_id: string
  drone_id: string
  notes: string
  log_date: string
  serviced_by_user_id?: string
  serviced_by_name?: string
}

export interface CreateMaintenanceLogPayload {
  notes: string
  log_date?: string
}

export interface UpdateMaintenanceLogPayload {
  notes?: string
  log_date?: string
}

export interface MaintenanceFormValues {
  drone_id: string
  notes: string
  log_date: string
}
