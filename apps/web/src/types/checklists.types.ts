export type ChecklistType = 'PRE_FLIGHT' | 'POST_FLIGHT'

export interface ChecklistItem {
  item_id?: string
  item_text: string
  order: number
}

export interface Checklist {
  checklist_id: string
  title: string
  type: ChecklistType | string
  items: ChecklistItem[]
  created_at?: string
  updated_at?: string
}

export interface ChecklistItemPayload {
  item_text: string
  order: number
}

export interface CreateChecklistPayload {
  title: string
  type: ChecklistType | string
  items: ChecklistItemPayload[]
}

export interface UpdateChecklistPayload {
  title?: string
  type?: ChecklistType | string
  items?: ChecklistItemPayload[]
}

export interface ChecklistFormValues {
  title: string
  type: ChecklistType | string
  items: ChecklistItemPayload[]
}
