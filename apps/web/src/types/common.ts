export type UUID = string;
export type ISODateTimeString = string;
export type ISODateString = string;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface ApiMessageResponse {
  message: string;
}
