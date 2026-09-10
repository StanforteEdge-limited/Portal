import {
  Button,
  Chip,
  Icon,
  PageHeader,
  RightRail,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  useToast,
} from "@/shared";
import { formatRelativeTime, humanize, hasNextDay } from "@stanforte/shared";
import { deriveAttendanceStatus, toneFromStatus } from "./attendance-data";
import { TimeWithNextDay } from "@/shared/components/ui/TimeWithNextDay";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useCachedQuery } from "@/shared/lib/core";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";
import {
  clockIn,
  clockOut,
  createAttendanceCorrection,
  getMyAttendance,
  type AttendanceCorrection,
  type AttendanceDaily,
  type AttendanceEntry,
  type AttendanceException,
  type AttendanceMode,
  type OfficeLocation,
} from "./attendance-api";

const defaultCorrectionForm = {
  work_date: new Date().toISOString().slice(0, 10),
  request_type: "clock_in",
  proposed_at: "",
  proposed_mode: "",
  proposed_office_location_id: "",
  reason: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatClockTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMinutes(minutes?: number | null) {
  const safe = Number(minutes ?? 0);
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function mapAttendanceActionError(message: string, type: "in" | "out") {
  const raw = String(message || "").trim();
  const expectedModeMatch = raw.match(/Clock in mode must match expected mode \(([^)]+)\)/i);
  if (expectedModeMatch) {
    const mode = humanize(expectedModeMatch[1], "expected mode");
    return `Clock in mode must match ${mode}. Select ${mode} and try again.`;
  }

  const clockOutModeMatch = raw.match(/Clock out mode must match clock in mode \(([^)]+)\)/i);
  if (clockOutModeMatch) {
    const mode = humanize(clockOutModeMatch[1], "clock-in mode");
    return `Clock out mode must match your clock-in mode (${mode}).`;
  }

  return raw || (type === "in" ? "Unable to clock in. Please try again." : "Unable to clock out. Please try again.");
}

function StatusDot({
  tone,
}: {
  tone: "success" | "warning" | "danger" | "pending" | "neutral";
}) {
  const toneClass: Record<typeof tone, string> = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    pending: "bg-pending",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={["inline-flex h-2.5 w-2.5 rounded-full", toneClass[tone]].join(
        " ",
      )}
    />
  );
}

function issueDescription(
  item:
    | (AttendanceCorrection & { kind: "correction" })
    | (AttendanceException & { kind: "exception" }),
) {
  if (item.kind === "correction") {
    return item.reason || item.review_notes || "No details provided.";
  }
  return item.reason || item.notes || "No details provided.";
}

function SummaryTile({
  label,
  value,
  accentClass = "text-slate-950",
  note,
  hint,
}: {
  label: string;
  value: string;
  accentClass?: string;
  note?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p
            className={[
              "text-2xl font-semibold tracking-tight",
              accentClass,
            ].join(" ")}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-[0.68rem] text-slate-400">{hint}</p>
          )}
        </div>
        {note ? (
          <span className="text-[0.72rem] font-semibold text-success">
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AttendancePage() {
  const { showToast } = useToast();
  const [selectedMode, setSelectedMode] = useState<AttendanceMode>("onsite");
  const [selectedOfficeLocationId, setSelectedOfficeLocationId] = useState("");
  const [acting, setActing] = useState<"in" | "out" | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionForm, setCorrectionForm] = useState(defaultCorrectionForm);

  const attendanceRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    return { from, to };
  }, []);

  const { data, loading, error, refetch } = useCachedQuery(
    `attendance:me:${attendanceRange.from}:${attendanceRange.to}`,
    () => getMyAttendance({ from: attendanceRange.from, to: attendanceRange.to }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const entries = data?.entries ?? [];
  const daily = data?.daily ?? [];
  const corrections = data?.corrections ?? [];
  const exceptions = data?.exceptions ?? [];
  const officeLocations = data?.office_locations ?? [];
  const today = data?.today ?? null;
  const policy = data?.policy ?? null;
  const currentState = data?.current_state;

  useEffect(() => {
    const inferredMode = String(
      today?.expected_mode || today?.attendance_mode || "onsite",
    ).toLowerCase() as AttendanceMode;
    setSelectedMode(
      inferredMode === "remote" || inferredMode === "field"
        ? inferredMode
        : "onsite",
    );
    setSelectedOfficeLocationId(
      String(today?.office_location_id || officeLocations[0]?.id || ""),
    );
  }, [
    officeLocations,
    today?.attendance_mode,
    today?.expected_mode,
    today?.office_location_id,
  ]);

  useEffect(() => {
    if (today?.geofence_status === "outside") {
      showToast({
        tone: "warning",
        title: "Premises check alert",
        message:
          "You appear to be outside the designated premises for today's onsite attendance.",
      });
    }
  }, [showToast, today?.geofence_status]);

  const stats = useMemo(() => {
    let present = 0;
    let remote = 0;
    let late = 0;
    let absent = 0;
    for (const row of daily) {
      const status = deriveAttendanceStatus(row);
      if (status === "present") present++;
      if (status === "late") { late++; present++; }
      if (status === "absent") absent++;
      if (String(row.attendance_mode || row.expected_mode || "").toLowerCase() === "remote" && row.first_in_at) remote++;
    }

    const onsiteWeekdays = policy?.onsite_weekdays ?? [1, 2, 3, 4, 5];
    const remoteWeekdays = policy?.remote_weekdays ?? [];
    const allWorkDays = new Set([...onsiteWeekdays, ...remoteWeekdays]);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let expectedWorkDays = 0;
    let elapsedWorkDays = 0;
    const todayDate = today.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (allWorkDays.has(dow)) {
        expectedWorkDays++;
        if (d <= todayDate) elapsedWorkDays++;
      }
    }

    return [
      {
        label: "Present",
        value: String(present),
        hint: `of ${elapsedWorkDays} expected`,
        accentClass: "text-slate-950",
      },
      {
        label: "Remote",
        value: String(remote),
        hint: policy?.remote_weekdays?.length ? `${remoteWeekdays.length} planned day${remoteWeekdays.length > 1 ? "s" : ""}/wk` : undefined,
        accentClass: "text-slate-950",
      },
      {
        label: "Late",
        value: String(late),
        accentClass: "text-warning",
      },
      {
        label: "Absent",
        value: String(absent),
        accentClass: "text-danger",
      },
    ];
  }, [daily, policy]);

  const recentDaily = daily.slice(0, 10);
  const recentEntries = entries.slice(0, 8);
  const recentIssues = useMemo(
    () =>
      [
        ...corrections.map((row) => ({ ...row, kind: "correction" as const })),
        ...exceptions.map((row) => ({ ...row, kind: "exception" as const })),
      ]
        .sort((a, b) =>
          String(
            "requested_at" in b ? b.requested_at : b.created_at,
          ).localeCompare(
            String("requested_at" in a ? a.requested_at : a.created_at),
          ),
        )
        .slice(0, 4),
    [corrections, exceptions],
  );

  async function getCoords() {
    if (!("geolocation" in navigator)) return {};
    return new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
      );
    });
  }

  async function runClockAction(type: "in" | "out") {
    try {
      setActing(type);
      const isOnsite = selectedMode === "onsite";
      const isField = selectedMode === "field";
      const needsOfficeLocation = isOnsite;
      const hasOfficeLocation = Boolean(selectedOfficeLocationId);

      if (type === "in" && needsOfficeLocation && !hasOfficeLocation) {
        showToast({
          tone: "warning",
          title: "Office location required",
          message: "Select an office location before clocking in onsite.",
        });
        return;
      }

      const coords = await getCoords();
      const hasCoords =
        typeof coords.latitude === "number" &&
        typeof coords.longitude === "number";

      if (type === "in" && isOnsite && !hasCoords) {
        const proceed = window.confirm(
          "We couldn't confirm your location. Do you want to clock in anyway? This will be marked as location unverified.",
        );
        if (!proceed) return;
      }

      if (type === "in" && hasCoords === false && !isOnsite) {
        showToast({
          tone: "warning",
          title: "Location not confirmed",
          message:
            "We couldn't confirm your location. We'll record the clock-in but mark location as unverified.",
        });
      }

      if (type === "in" && isField) {
        showToast({
          tone: "warning",
          title: "Field work confirmation",
          message:
            "Field work should be pre-approved. Ensure your location and details are recorded in your request.",
        });
      }

      const payload = {
        attendance_mode: selectedMode,
        office_location_id: isOnsite
          ? selectedOfficeLocationId || undefined
          : undefined,
        ...coords,
      };

      if (type === "in") {
        await clockIn(payload);
      } else {
        await clockOut(payload);
      }
      await refetch();
      showToast({
        tone: "success",
        title: type === "in" ? "Clock in recorded" : "Clock out recorded",
        message:
          type === "in"
            ? "Your attendance entry was saved."
            : "Your workday has been closed out.",
      });
    } catch (actionError) {
      const rawMessage = actionError instanceof Error ? actionError.message : "";
      showToast({
        tone: "danger",
        title: type === "in" ? "Clock in failed" : "Clock out failed",
        message: mapAttendanceActionError(rawMessage, type),
      });
    } finally {
      setActing(null);
    }
  }

  async function submitCorrection() {
    if (!correctionForm.work_date || !correctionForm.reason.trim()) {
      showToast({
        tone: "warning",
        title: "Correction incomplete",
        message: "Correction date and reason are required.",
      });
      return;
    }
    try {
      setSubmittingCorrection(true);
      const proposedAt = correctionForm.proposed_at
        ? new Date(
            `${correctionForm.work_date}T${correctionForm.proposed_at}:00`,
          ).toISOString()
        : undefined;
      await createAttendanceCorrection({
        work_date: correctionForm.work_date,
        request_type: correctionForm.request_type,
        reason: correctionForm.reason.trim(),
        proposed_at: proposedAt,
        proposed_mode: correctionForm.proposed_mode || undefined,
        proposed_office_location_id:
          correctionForm.proposed_office_location_id || undefined,
      });
      setCorrectionForm(defaultCorrectionForm);
      setShowCorrectionForm(false);
      await refetch();
      showToast({
        tone: "success",
        title: "Correction submitted",
        message: "Your attendance correction has been sent for review.",
      });
    } catch (submitError) {
      showToast({
        tone: "danger",
        title: "Unable to submit correction",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Please try again.",
      });
    } finally {
      setSubmittingCorrection(false);
    }
  }

  const todayStatus = humanize(
    String(
      today?.status ||
        (currentState?.is_clocked_in ? "present" : "not_started"),
    ),
  );
  const todayMode = humanize(
    String(today?.attendance_mode || today?.expected_mode || selectedMode),
  );
  const openSessionDate = currentState?.last_clock_in_work_date
    ? formatDate(currentState.last_clock_in_work_date)
    : null;
  const openSessionDateLabel = currentState?.last_clock_in_work_date
    ? formatDate(currentState.last_clock_in_work_date)
    : null;
  const openSessionMessage = currentState?.is_clocked_in
    ? currentState?.last_clock_in_at
      ? `Open session started ${formatDateTime(currentState.last_clock_in_at)}${openSessionDate ? ` (${openSessionDate})` : ""}. Clock out is available now, even if the shift crossed into another day.`
      : "An open session is active. Clock out is available now, even if the shift crossed into another day."
    : null;
  const locationName =
    officeLocations.find(
      (location) =>
        location.id ===
        String(today?.office_location_id || selectedOfficeLocationId),
    )?.name ||
    officeLocations[0]?.name ||
    "No office selected";
  const premisesTone = toneFromStatus(
    today?.geofence_status ||
      (selectedMode === "onsite" ? "unknown" : "not_applicable"),
  );

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="Attendance"
      user={{ name: "Alex Sterling", role: "Fleet Operations" }}
      mobileNav={buildAppMobileNav("Attendance")}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[{ label: "Home", path: "/" }, { label: "Attendance" }]}
          title="Staff Attendance"
          description={formatDate(new Date().toISOString())}
          actions={
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => void refetch()}
              disabled={loading}
            >
              <Icon name="refresh" className="text-[18px]" />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />

        {error ? (
          <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <SectionCard title="Today's Attendance">
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Current Status
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {todayStatus}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Shift Hours
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {policy
                        ? `${policy.start_time} - ${policy.end_time}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                {!currentState?.is_clocked_in && (
                  <>
                    <div className="space-y-3">
                      <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Select Attendance Mode
                      </p>
                      <div
                        className="grid grid-cols-3 gap-3"
                        role="group"
                        aria-label="Attendance mode"
                      >
                        {(["onsite", "remote", "field"] as AttendanceMode[]).map(
                          (mode) => {
                            const active = selectedMode === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setSelectedMode(mode)}
                                aria-pressed={active}
                                className={[
                                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                                  active
                                    ? "border-brand-900 bg-brand-900/5 text-brand-900 shadow-[0_0_0_1px_rgba(3,71,133,0.12)]"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                ].join(" ")}
                              >
                                <Icon
                                  name={
                                    mode === "onsite"
                                      ? "location_on"
                                      : mode === "remote"
                                        ? "home_work"
                                        : "travel_explore"
                                  }
                                  className="text-[18px]"
                                  fill={active}
                                />
                                {humanize(mode)}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      Onsite requires an office location and a verified device
                      location. Remote can proceed without an office location.
                      Field work should be pre-approved with location/details
                      recorded.
                    </div>

                    <SelectField
                      label="Office/Location"
                      value={selectedOfficeLocationId}
                      onChange={(event) =>
                        setSelectedOfficeLocationId(event.target.value)
                      }
                      disabled={selectedMode !== "onsite"}
                    >
                      <option value="">Select office location</option>
                      {officeLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </SelectField>
                  </>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    className="w-full justify-center py-4 text-base shadow-soft"
                    onClick={() => void runClockAction("in")}
                    disabled={acting !== null || !currentState?.can_clock_in}
                  >
                    {acting === "in"
                      ? "Clocking In..."
                      : currentState?.is_clocked_in
                        ? "Clocked In"
                        : "Clock In Now"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center py-4 text-base"
                    onClick={() => void runClockAction("out")}
                    disabled={acting !== null || !currentState?.can_clock_out}
                  >
                    {acting === "out" ? "Clocking Out..." : "Clock Out"}
                  </Button>
                </div>

                {openSessionMessage ? (
                  <div className="rounded-2xl border border-brand-900/10 bg-brand-900/5 px-4 py-4 text-sm leading-6 text-slate-700">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-900 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white">
                        Open session
                      </span>
                      {openSessionDateLabel ? (
                        <span className="rounded-full border border-brand-900/10 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-900">
                          Since {openSessionDateLabel}
                        </span>
                      ) : null}
                    </div>
                    <span className="font-semibold text-brand-900">
                      Open session:
                    </span>{" "}
                    {openSessionMessage}
                  </div>
                ) : null}

                {currentState?.reason ? (
                  <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-4 text-sm text-warning">
                    {currentState.reason}
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Premises Check">
              <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      premisesTone === "danger"
                        ? "bg-danger/10 text-danger"
                        : premisesTone === "success"
                          ? "bg-success/10 text-success"
                          : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    <Icon
                      name={
                        premisesTone === "danger"
                          ? "location_off"
                          : "location_on"
                      }
                      className="text-[22px]"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {locationName}
                      </p>
                      <Chip
                        variant={
                          premisesTone === "danger"
                            ? "danger"
                            : premisesTone === "success"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {humanize(
                          String(
                            today?.geofence_status ||
                              (selectedMode === "onsite"
                                ? "unknown"
                                : "not_applicable"),
                          ),
                        )}
                      </Chip>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {selectedMode === "onsite"
                        ? "Onsite attendance validates against the selected office location when coordinates are available."
                        : `You are marked as ${humanize(selectedMode)} today, so office radius checks are secondary.`}
                    </p>
                  </div>
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-500">
                  {today?.geofence_status === "outside"
                    ? "Your latest attendance event appears outside the configured office radius."
                    : today?.geofence_status === "inside"
                      ? "Your latest onsite attendance event was validated within the expected office radius."
                      : "No conclusive geofence result has been captured yet."}
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Attendance History"
              action={<Chip variant="neutral">{recentDaily.length} days</Chip>}
            >
              <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
                <Table caption="Attendance historyss">
                  <TableHead>
                    <TableHeaderRow>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Clock In</TableHeaderCell>
                      <TableHeaderCell>Clock Out</TableHeaderCell>
                      <TableHeaderCell>Mode</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableHeaderRow>
                  </TableHead>
                  <TableBody>
                    {recentDaily.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="rounded-l-2xl">
                          <p className="text-sm font-semibold text-slate-950">
                            {formatDate(row.work_date)}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-700">
                          {formatClockTime(row.first_in_at)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-700">
                          <TimeWithNextDay time={row.last_out_at} referenceDate={row.first_in_at} />
                        </TableCell>
                        <TableCell>
                          <Chip variant="neutral">
                            {humanize(
                              String(
                                row.attendance_mode || row.expected_mode || "-",
                              ),
                            )}
                          </Chip>
                        </TableCell>
                        <TableCell className="rounded-r-2xl">
                          <Chip
                            variant={
                              toneFromStatus(deriveAttendanceStatus(row)) === "neutral"
                                ? "neutral"
                                : toneFromStatus(deriveAttendanceStatus(row))
                            }
                          >
                            {humanize(deriveAttendanceStatus(row))}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && recentDaily.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-sm text-slate-500"
                        >
                          No attendance history yet.
                        </td>
                      </tr>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </div>

          <RightRail className="lg:col-span-4">
            <SectionCard
              title="Activity Summary"
              action={<Chip variant="neutral">This Month</Chip>}
            >
              <div className="grid grid-cols-2 gap-3">
                {stats.map((metric) => (
                  <SummaryTile
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    accentClass={metric.accentClass}
                    hint={(metric as any).hint}
                  />
                ))}
              </div>
            </SectionCard>

            <div className="section-card relative overflow-hidden bg-brand-900 px-5 py-5 text-white">
              <div className="relative z-10">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/70">
                  Worked This Cycle
                </p>
                <p className="mt-3 text-5xl font-semibold tracking-tight">
                  {formatMinutes(
                    recentDaily.reduce(
                      (sum, row) => sum + (row.worked_minutes || 0),
                      0,
                    ),
                  )}
                </p>
                <p className="mt-3 max-w-[16rem] text-sm leading-6 text-white/85">
                  Total worked time captured across your recent attendance days.
                </p>
              </div>
            </div>

            <SectionCard
              title="Corrections"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setShowCorrectionForm((value) => !value)}
                >
                  <Icon name="add" className="text-[18px]" />
                  {showCorrectionForm ? "Close" : " New"}
                </Button>
              }
            >
              {showCorrectionForm ? (
                <div className="mb-5 space-y-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4">
                    <TextField
                      label="Work Date"
                      type="date"
                      value={correctionForm.work_date}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          work_date: event.target.value,
                        }))
                      }
                    />
                    <SelectField
                      label="Request Type"
                      value={correctionForm.request_type}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          request_type: event.target.value,
                        }))
                      }
                    >
                      <option value="clock_in">Missed Clock In</option>
                      <option value="clock_out">Missed Clock Out</option>
                      <option value="mode_change">Mode Change</option>
                      <option value="location_change">Location Change</option>
                    </SelectField>
                    <TextField
                      label="Proposed Time"
                      type="time"
                      value={correctionForm.proposed_at}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          proposed_at: event.target.value,
                        }))
                      }
                    />
                    <SelectField
                      label="Proposed Mode"
                      value={correctionForm.proposed_mode}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          proposed_mode: event.target.value,
                        }))
                      }
                    >
                      <option value="">Keep current</option>
                      <option value="onsite">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="field">Field</option>
                    </SelectField>
                    <SelectField
                      label="Proposed Office Location"
                      value={correctionForm.proposed_office_location_id}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          proposed_office_location_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Not applicable</option>
                      {officeLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </SelectField>
                    <TextAreaField
                      label="Reason"
                      value={correctionForm.reason}
                      onChange={(event) =>
                        setCorrectionForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Explain what needs correction and why."
                    />
                    <Button
                      className="w-full justify-center"
                      onClick={() => void submitCorrection()}
                      disabled={submittingCorrection}
                    >
                      {submittingCorrection
                        ? "Submitting..."
                        : "Submit Correction"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {recentIssues.map((item) => (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className="rounded-[18px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                          {formatDate(item.work_date)}
                        </p>
                        <h3 className="mt-2 text-sm font-semibold text-slate-950">
                          {humanize(
                            item.kind === "correction"
                              ? item.request_type
                              : item.exception_type,
                          )}
                        </h3>
                      </div>
                      <Chip
                        variant={
                          toneFromStatus(item.status) === "neutral"
                            ? "neutral"
                            : toneFromStatus(item.status)
                        }
                      >
                        {humanize(item.status)}
                      </Chip>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {issueDescription(item)}
                    </p>
                  </article>
                ))}
                {!loading && recentIssues.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No corrections or exceptions yet.
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </RightRail>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Home</span>
            <Icon name="chevron_right" className="text-[15px] text-slate-400" />
            <span className="text-brand-900">Attendance</span>
          </div>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
            Attendance
          </h1>
        </div>

        {error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <SectionCard title="Today's Attendance">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Current Status
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {todayStatus}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Shift Hours
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {policy
                    ? `${policy.start_time} - ${policy.end_time}`
                    : "Not set"}
                </p>
              </div>
            </div>

            {!currentState?.is_clocked_in && (
              <>
                <div className="space-y-2">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Attendance Mode
                  </p>
                  <div
                    className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-2"
                    role="group"
                    aria-label="Attendance mode"
                  >
                    {(["onsite", "remote", "field"] as AttendanceMode[]).map(
                      (mode) => {
                        const active = selectedMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSelectedMode(mode)}
                            aria-pressed={active}
                            className={[
                              "flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-xs font-semibold transition",
                              active
                                ? "bg-brand-900 text-white shadow-soft"
                                : "text-slate-600",
                            ].join(" ")}
                          >
                            <Icon
                              name={
                                mode === "onsite"
                                  ? "location_on"
                                  : mode === "remote"
                                    ? "home_work"
                                    : "travel_explore"
                              }
                              className="text-[16px]"
                              fill={active}
                            />
                            {humanize(mode)}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <SelectField
                  label="Office/Location"
                  value={selectedOfficeLocationId}
                  onChange={(event) =>
                    setSelectedOfficeLocationId(event.target.value)
                  }
                  disabled={selectedMode !== "onsite"}
                >
                  <option value="">Select office location</option>
                  {officeLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </SelectField>
              </>
            )}

            <div className="grid gap-3">
              <Button
                className="w-full justify-center py-4 text-base shadow-soft"
                onClick={() => void runClockAction("in")}
                disabled={acting !== null || !currentState?.can_clock_in}
              >
                {acting === "in" ? "Clocking In..." : "Clock In Now"}
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-center py-4 text-base"
                onClick={() => void runClockAction("out")}
                disabled={acting !== null || !currentState?.can_clock_out}
              >
                {acting === "out" ? "Clocking Out..." : "Clock Out"}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Premises Check">
          <div className="flex items-start gap-3 rounded-[20px] bg-slate-100 px-4 py-4">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                premisesTone === "danger"
                  ? "bg-danger/10 text-danger"
                  : premisesTone === "success"
                    ? "bg-success/10 text-success"
                    : "bg-slate-200 text-slate-600",
              ].join(" ")}
            >
              <Icon
                name={
                  premisesTone === "danger" ? "location_off" : "location_on"
                }
                className="text-[20px]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">
                  {locationName}
                </p>
                <Chip
                  variant={
                    premisesTone === "danger"
                      ? "danger"
                      : premisesTone === "success"
                        ? "success"
                        : "neutral"
                  }
                >
                  {humanize(
                    String(
                      today?.geofence_status ||
                        (selectedMode === "onsite"
                          ? "unknown"
                          : "not_applicable"),
                    ),
                  )}
                </Chip>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {selectedMode === "onsite"
                  ? "Latest premises validation for your onsite attendance."
                  : `Working ${humanize(selectedMode)} today.`}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Activity Summary"
                action={<Chip variant="neutral">This Month</Chip>}>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((metric) => (
              <SummaryTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                accentClass={metric.accentClass}
                hint={(metric as any).hint}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Corrections"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => setShowCorrectionForm((value) => !value)}
            >
              <Icon name="add" className="text-[18px]" />
              {showCorrectionForm ? "Close" : "Submit New"}
            </Button>
          }
        >
          {showCorrectionForm ? (
            <div className="mb-4 grid gap-4">
              <TextField
                label="Work Date"
                type="date"
                value={correctionForm.work_date}
                onChange={(event) =>
                  setCorrectionForm((prev) => ({
                    ...prev,
                    work_date: event.target.value,
                  }))
                }
              />
              <SelectField
                label="Request Type"
                value={correctionForm.request_type}
                onChange={(event) =>
                  setCorrectionForm((prev) => ({
                    ...prev,
                    request_type: event.target.value,
                  }))
                }
              >
                <option value="clock_in">Missed Clock In</option>
                <option value="clock_out">Missed Clock Out</option>
                <option value="mode_change">Mode Change</option>
                <option value="location_change">Location Change</option>
              </SelectField>
              <TextAreaField
                label="Reason"
                value={correctionForm.reason}
                onChange={(event) =>
                  setCorrectionForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
              />
              <Button
                className="w-full justify-center"
                onClick={() => void submitCorrection()}
                disabled={submittingCorrection}
              >
                {submittingCorrection ? "Submitting..." : "Submit Correction"}
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {recentIssues.map((item) => (
              <article
                key={`${item.kind}-${item.id}`}
                className="rounded-[18px] border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {formatDate(item.work_date)}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950">
                      {humanize(
                        item.kind === "correction"
                          ? item.request_type
                          : item.exception_type,
                      )}
                    </h3>
                  </div>
                  <Chip
                    variant={
                      toneFromStatus(item.status) === "neutral"
                        ? "neutral"
                        : toneFromStatus(item.status)
                    }
                  >
                    {humanize(item.status)}
                  </Chip>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {issueDescription(item)}
                </p>
              </article>
            ))}
            {!loading && recentIssues.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No corrections or exceptions yet.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Attendance History">
          <div className="space-y-2">
            {recentDaily.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-white text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                    <span>
                      {new Date(row.work_date).toLocaleDateString("en-NG", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-sm tracking-normal text-slate-950">
                      {new Date(row.work_date).getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Chip
                        variant={
                          toneFromStatus(deriveAttendanceStatus(row)) === "neutral"
                            ? "neutral"
                            : toneFromStatus(deriveAttendanceStatus(row))
                        }
                      >
                        {humanize(deriveAttendanceStatus(row))}
                      </Chip>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      In {formatClockTime(row.first_in_at)} • Out{" "}
                      <TimeWithNextDay time={row.last_out_at} referenceDate={row.first_in_at} />
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {humanize(
                      String(row.attendance_mode || row.expected_mode || "-"),
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMinutes(row.worked_minutes)}
                  </p>
                </div>
              </div>
            ))}
            {!loading && recentDaily.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No attendance history yet.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity">
          <div className="space-y-3">
            {recentEntries.map((row) => (
              <article
                key={row.id}
                className="flex items-start gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-900/10 text-brand-900">
                  <Icon
                    name={row.entry_type === "clock_out" ? "logout" : "login"}
                    className="text-[18px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {humanize(row.entry_type)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {humanize(
                          String(row.attendance_mode || row.source || "-"),
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <StatusDot tone={toneFromStatus(row.geofence_status)} />
                      <span>{formatRelativeTime(row.entry_at)}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!loading && recentEntries.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No recent activity yet.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

export default AttendancePage;
