import { httpRequest } from "@/shared/lib/core";

export type AttendanceMode = "onsite" | "remote" | "field";

export type AttendanceEntry = {
  id: string;
  user_id: string;
  entry_type: "clock_in" | "clock_out" | string;
  entry_at: string;
  work_date: string;
  attendance_mode?: string | null;
  office_location_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_status?: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type AttendanceDaily = {
  id: string;
  user_id: string;
  work_date: string;
  status: string;
  attendance_mode?: string | null;
  expected_mode?: string | null;
  reconciliation_status?: string | null;
  office_location_id?: string | null;
  geofence_status?: string | null;
  scheduled_minutes: number;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  first_in_at: string | null;
  last_out_at: string | null;
  computed_at: string;
};

export type AttendanceCorrection = {
  id: string;
  user_id: string | null;
  request_type: string;
  status: string;
  work_date: string;
  reason: string;
  proposed_at: string | null;
  proposed_mode: string | null;
  proposed_office_location_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

export type AttendanceException = {
  id: string;
  user_id: string | null;
  exception_type: string;
  status: string;
  work_date: string;
  attendance_mode: string | null;
  reason: string;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type OfficeLocation = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  organizations: Array<{ id: string; name: string; code: string | null; is_primary?: boolean }>;
  created_at: string;
  updated_at: string;
};

export type MyAttendanceResponse = {
  entries: AttendanceEntry[];
  daily: AttendanceDaily[];
  current_state: {
    is_clocked_in: boolean;
    last_clock_in_at: string | null;
    last_clock_in_work_date?: string | null;
    can_clock_in?: boolean;
    can_clock_out?: boolean;
    reason?: string | null;
  };
  today?: AttendanceDaily | null;
  policy?: {
    start_time: string;
    end_time: string;
    grace_minutes: number;
    onsite_weekdays?: number[];
    remote_weekdays?: number[];
    required_extra_onsite_day_count?: number;
  };
  corrections?: AttendanceCorrection[];
  exceptions?: AttendanceException[];
  office_locations?: OfficeLocation[];
};

export async function getMyAttendance(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/hr/attendance/me${suffix}`);
  return (res?.data ?? res) as MyAttendanceResponse;
}

export type AttendanceStatusResponse = {
  current_state: {
    is_clocked_in: boolean;
    last_clock_in_at: string | null;
    last_clock_in_work_date: string | null;
    can_clock_in: boolean;
    can_clock_out: boolean;
    reason: string | null;
  };
  policy: {
    start_time: string;
    end_time: string;
    onsite_weekdays: number[];
    remote_weekdays: number[];
  };
};

export async function getAttendanceStatus() {
  const res = await httpRequest<any>("/hr/attendance/status");
  return (res?.data ?? res) as AttendanceStatusResponse;
}

export async function clockIn(payload?: {
  source?: string;
  at?: string;
  attendance_mode?: string;
  office_location_id?: string;
  latitude?: number;
  longitude?: number;
}) {
  return httpRequest<{ success: boolean; daily: AttendanceDaily }>("/hr/attendance/clock-in", {
    method: "POST",
    body: payload ?? {},
  });
}

export async function clockOut(payload?: {
  source?: string;
  at?: string;
  attendance_mode?: string;
  office_location_id?: string;
  latitude?: number;
  longitude?: number;
}) {
  return httpRequest<{ success: boolean; daily: AttendanceDaily }>("/hr/attendance/clock-out", {
    method: "POST",
    body: payload ?? {},
  });
}

export async function createAttendanceCorrection(payload: {
  work_date: string;
  request_type: string;
  reason: string;
  proposed_at?: string;
  proposed_mode?: string;
  proposed_office_location_id?: string;
  proposed_latitude?: number;
  proposed_longitude?: number;
}) {
  return httpRequest<{ success: boolean; data: AttendanceCorrection }>("/hr/attendance/corrections", {
    method: "POST",
    body: payload,
  });
}
