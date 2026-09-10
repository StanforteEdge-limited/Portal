export function toneFromStatus(
  status?: string | null,
): "success" | "warning" | "danger" | "pending" | "neutral" {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  if (["present", "approved", "resolved", "corrected"].includes(key))
    return "success";
  if (["late", "pending", "submitted", "review"].includes(key))
    return "warning";
  if (["absent", "rejected", "outside"].includes(key)) return "danger";
  if (["remote", "field"].includes(key)) return "success";
  if (["holiday", "off_day", "leave"].includes(key)) return "neutral";
  return "neutral";
}

export function deriveAttendanceStatus(row: { status?: string | null; first_in_at?: string | null }): string {
  const status = String(row.status || "").trim().toLowerCase();
  if (["remote", "field", "onsite"].includes(status)) {
    return row.first_in_at ? "present" : "absent";
  }
  return status || (row.first_in_at ? "present" : "not_started");
}

export type AttendanceMode = {
  label: string;
  icon: string;
  active?: boolean;
};

export type AttendanceSummaryMetric = {
  label: string;
  value: string;
  accent: string;
  note?: string;
};

export type AttendanceHistoryRow = {
  date: string;
  clockIn: string;
  clockOut: string;
  mode: string;
  status: string;
  statusTone: "success" | "warning" | "pending" | "danger" | "neutral";
};

export type AttendanceCorrection = {
  date: string;
  title: string;
  status: string;
  statusTone: "success" | "warning" | "pending" | "danger" | "neutral";
  description: string;
  borderTone: string;
};

export const attendanceModes: AttendanceMode[] = [
  { label: "Onsite", icon: "location_on", active: true },
  { label: "Remote", icon: "home_work" },
  { label: "Field", icon: "location_searching" },
];

export const attendanceSummary: AttendanceSummaryMetric[] = [
  { label: "Present", value: "18", accent: "text-slate-950", note: "+2" },
  { label: "Remote", value: "04", accent: "text-slate-950", note: "" },
  { label: "Late", value: "02", accent: "text-warning", note: "" },
  { label: "Absent", value: "01", accent: "text-danger", note: "" },
];

export const attendanceHistoryRows: AttendanceHistoryRow[] = [
  {
    date: "Oct 23, 2023",
    clockIn: "08:52 AM",
    clockOut: "06:05 PM",
    mode: "Onsite",
    status: "Present",
    statusTone: "success",
  },
  {
    date: "Oct 22, 2023",
    clockIn: "09:14 AM",
    clockOut: "05:58 PM",
    mode: "Remote",
    status: "Late",
    statusTone: "warning",
  },
  {
    date: "Oct 21, 2023",
    clockIn: "08:45 AM",
    clockOut: "06:12 PM",
    mode: "Onsite",
    status: "Present",
    statusTone: "success",
  },
];

export const mobileAttendanceHistoryRows: AttendanceHistoryRow[] = [
  {
    date: "Wed 18",
    clockIn: "08:45",
    clockOut: "18:12",
    mode: "Onsite",
    status: "Present",
    statusTone: "success",
  },
  {
    date: "Tue 17",
    clockIn: "09:34",
    clockOut: "18:05",
    mode: "Remote",
    status: "Late",
    statusTone: "warning",
  },
  {
    date: "Mon 16",
    clockIn: "08:58",
    clockOut: "19:20",
    mode: "Onsite",
    status: "Present",
    statusTone: "success",
  },
];

export const attendanceCorrections: AttendanceCorrection[] = [
  {
    date: "Oct 19",
    title: "Late Entry",
    status: "Pending",
    statusTone: "warning",
    description: "Requested change from 09:45 AM to 08:50 AM due to network failure.",
    borderTone: "border-l-warning",
  },
  {
    date: "Oct 15",
    title: "Forgot Clock-out",
    status: "Approved",
    statusTone: "success",
    description: "Clock-out time set to 06:15 PM per supervisor verification.",
    borderTone: "border-l-success",
  },
];

export const mobileCorrections: AttendanceCorrection[] = [
  {
    date: "Oct 19",
    title: "Late Entry",
    status: "Pending",
    statusTone: "warning",
    description: "Traffic delay at the bridge.",
    borderTone: "border-l-warning",
  },
  {
    date: "Oct 15",
    title: "Forgot Clock-out",
    status: "Approved",
    statusTone: "success",
    description: "Clock-out corrected to 06:15 PM.",
    borderTone: "border-l-success",
  },
];
