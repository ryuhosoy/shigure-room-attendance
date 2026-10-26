export type UserId = string | number;

export interface Visit {
  visit_date: string;
  entered_at: string;
}

export interface AttendanceUser {
  user_id: UserId;
  display_name: string;
  visit_count: number;
  visited_today: boolean;
  last_entered_at: string | null;
  visits: Visit[];
}

export interface AttendanceResponse {
  users: AttendanceUser[];
  today?: string;
  db_ok?: boolean;
}
