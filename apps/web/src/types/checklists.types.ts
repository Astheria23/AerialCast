import { UUID } from './common';
import { ChecklistType } from './enums';

export interface ChecklistItem {
  item_id: UUID;
  item_text: string;
  order: number;
}

export interface Checklist {
  checklist_id: UUID;
  title: string;
  type: ChecklistType;
  items: ChecklistItem[];
}

export interface ChecklistRef {
  checklist_id: UUID;
  title: string;
  type: ChecklistType;
}

export interface ChecklistPayload {
  title: string;
  type: ChecklistType;
  items: Array<Omit<ChecklistItem, 'item_id'>>;
}

export type ChecklistUpdatePayload = Partial<ChecklistPayload>;
