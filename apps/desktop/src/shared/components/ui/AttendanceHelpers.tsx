export type ChipVariant = "success" | "warning" | "danger" | "neutral";

export function attendanceStatusVariant(status: string | null | undefined): ChipVariant {
  const s = String(status ?? "").toLowerCase();
  switch (s) {
    case "present":
    case "approved":
    case "corrected":
      return "success";
    case "late":
      return "warning";
    case "absent":
    case "rejected":
    case "cancelled":
      return "danger";
    case "pending":
    case "pending_approval":
    case "exception_pending":
      return "warning";
    default:
      return "neutral";
  }
}

export function workModeVariant(mode: string | null | undefined): ChipVariant {
  const m = String(mode ?? "").toLowerCase();
  switch (m) {
    case "onsite":
      return "success";
    case "remote":
      return "neutral";
    case "field":
      return "warning";
    case "off_day":
    case "holiday":
      return "danger";
    default:
      return "neutral";
  }
}