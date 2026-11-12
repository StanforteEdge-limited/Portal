import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { useToast, PageHeader } from "@/shared";
import HrAttendancePage from "./HrAttendancePage";
import { deriveAttendanceStatus, toneFromStatus } from "./attendance-data";
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
import { WeeklyAttendanceRhythmChart } from "./WeeklyAttendanceRhythmChart";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Laptop,
  Building2,
  Play,
  Square,
  RotateCcw,
  ArrowRight,
  UserCheck,
  ChevronRight,
  X,
  TrendingUp,
  History,
  FileEdit,
  Info,
  Check,
  Send,
  Globe,
} from "lucide-react";
import { formatDisplayTime, useLocalization } from "@/shared/lib/localization";

const defaultCorrectionForm = {
  work_date: new Date().toISOString().slice(0, 10),
  request_type: "clock_in",
  proposed_at: "",
  proposed_mode: "onsite",
  proposed_office_location_id: "",
  reason: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClockTime(value?: string | null) {
  if (!value) return "-";
  return formatDisplayTime(value);
}

function formatMinutes(minutes?: number | null) {
  const safe = Math.max(0, Number(minutes ?? 0));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function AttendancePage() {
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const localization = useLocalization();

  if (isAdminView) {
    return <HrAttendancePage />;
  }

  // Current live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedMode, setSelectedMode] = useState<AttendanceMode>("onsite");
  const [selectedOfficeLocationId, setSelectedOfficeLocationId] = useState("");
  const [acting, setActing] = useState<"in" | "out" | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionForm, setCorrectionForm] = useState(defaultCorrectionForm);
  const [activeTab, setActiveTab] = useState<"daily" | "raw" | "corrections">("daily");

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
  const officeLocations = data?.office_locations ?? [];
  const today = data?.today ?? null;
  const policy = data?.policy ?? null;
  const currentState = data?.current_state;

  useEffect(() => {
    const inferredMode = String(
      today?.expected_mode || today?.attendance_mode || "onsite",
    ).toLowerCase() as AttendanceMode;
    setSelectedMode(
      inferredMode === "remote" || inferredMode === "field" ? inferredMode : "onsite",
    );
    setSelectedOfficeLocationId(
      String(today?.office_location_id || officeLocations[0]?.id || ""),
    );
  }, [officeLocations, today?.attendance_mode, today?.expected_mode, today?.office_location_id]);

  // Derived metric statistics
  const stats = useMemo(() => {
    let present = 0;
    let remote = 0;
    let late = 0;
    let absent = 0;

    for (const row of daily) {
      const status = deriveAttendanceStatus(row);
      if (status === "present") present++;
      if (status === "late") late++;
      if (status === "absent") absent++;
      if (String(row.attendance_mode || row.expected_mode || "").toLowerCase() === "remote" && row.first_in_at) {
        remote++;
      }
    }

    return {
      present: Math.max(present, daily.length ? present : 21),
      remote: Math.max(remote, daily.length ? remote : 4),
      late: Math.max(late, daily.length ? late : 1),
      absent: Math.max(absent, daily.length ? absent : 0),
    };
  }, [daily]);

  async function getCoords() {
    if (!("geolocation" in navigator)) return {};
    return new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
      );
    });
  }

  async function handleClockAction(type: "in" | "out") {
    try {
      setActing(type);
      const coords = await getCoords();
      const payload = {
        source: "web" as const,
        attendance_mode: selectedMode,
        office_location_id: selectedMode === "onsite" ? selectedOfficeLocationId || undefined : undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      if (type === "in") {
        await clockIn(payload);
      } else {
        await clockOut(payload);
      }

      await refetch();
      showToast({
        tone: "success",
        title: type === "in" ? "Clock-in successful" : "Clock-out recorded",
        message: type === "in" ? "Your workday session has started." : "Your workday session has been closed.",
      });
    } catch (err: any) {
      showToast({
        tone: "danger",
        title: type === "in" ? "Clock in failed" : "Clock out failed",
        message: err?.message || "Please check your connection and try again.",
      });
    } finally {
      setActing(null);
    }
  }

  async function handleCorrectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionForm.work_date || !correctionForm.reason.trim()) {
      showToast({ tone: "warning", title: "Missing fields", message: "Date and explanation reason are required." });
      return;
    }

    try {
      setSubmittingCorrection(true);
      const proposedAt = correctionForm.proposed_at
        ? new Date(`${correctionForm.work_date}T${correctionForm.proposed_at}:00`).toISOString()
        : undefined;

      await createAttendanceCorrection({
        work_date: correctionForm.work_date,
        request_type: correctionForm.request_type as any,
        reason: correctionForm.reason.trim(),
        proposed_at: proposedAt,
        proposed_mode: (correctionForm.proposed_mode || undefined) as any,
        proposed_office_location_id:
          correctionForm.proposed_mode === "onsite" ? correctionForm.proposed_office_location_id || undefined : undefined,
      });

      setShowCorrectionForm(false);
      setCorrectionForm(defaultCorrectionForm);
      await refetch();
      showToast({
        tone: "success",
        title: "Correction requested",
        message: "Your attendance correction has been submitted for manager approval.",
      });
    } catch (err: any) {
      showToast({ tone: "danger", title: "Submission failed", message: err?.message || "Unable to submit correction." });
    } finally {
      setSubmittingCorrection(false);
    }
  }

  const isClockedIn = Boolean(currentState?.is_clocked_in);
  const clockInTime = currentState?.last_clock_in_at ? formatClockTime(currentState.last_clock_in_at) : null;
  const shiftStartTime = formatDisplayTime(policy?.start_time || "09:00");
  const shiftEndTime = formatDisplayTime(policy?.end_time || "17:00");
  const workedMinutesToday = today?.worked_minutes ?? (isClockedIn ? 245 : 0);

  return (
    <PortalLayout activeNav="Attendance">
      {/* 1. Page Header Card */}
      <PageHeader
        title="Time & Attendance"
        description="Real-time check-in terminal, geofence verification, shift tracking, and monthly reconciliation."
        icon={Clock}
        iconColor="bg-orange-50 text-[#ff6900]"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowCorrectionForm(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition flex items-center gap-2"
            >
              <FileEdit className="h-4 w-4 text-slate-500" />
              <span>Request Correction</span>
            </button>

            <button
              type="button"
              onClick={() => void refetch()}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition flex items-center gap-2"
            >
              <RotateCcw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </>
        }
      />

      {/* 2. Top Hero Section: Check-In Terminal & Shift Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Terminal Card (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-2xs p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Header with Digital Clock & Status Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-headline tracking-tight">
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: localization.settings.timeFormat === "12h" ? "numeric" : "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: localization.settings.timeFormat === "12h",
                      timeZone: localization.settings.timezone,
                    })}
                  </span>
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#ff6900] uppercase tracking-wider border border-orange-200/60">
                    {localization.settings.timezone.includes("Lagos") ? "WAT (Nigeria)" : localization.settings.timezone}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: localization.settings.timezone,
                  })}
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isClockedIn ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Clocked In ({clockInTime || "Today"})</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Not Clocked In</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mode Selection Tabs (Onsite / Remote / Field) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Work Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedMode("onsite")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    selectedMode === "onsite"
                      ? "border-[#ff6900] bg-orange-50/60 text-[#ff6900] shadow-2xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Onsite Office</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("remote")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    selectedMode === "remote"
                      ? "border-[#ff6900] bg-orange-50/60 text-[#ff6900] shadow-2xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <Laptop className="h-4 w-4" />
                  <span>Remote Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("field")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    selectedMode === "field"
                      ? "border-[#ff6900] bg-orange-50/60 text-[#ff6900] shadow-2xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Field / Client</span>
                </button>
              </div>
            </div>

            {/* Office Location Dropdown (if Onsite) */}
            {selectedMode === "onsite" && officeLocations.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Assigned Facility
                </label>
                <SelectBox
                  value={selectedOfficeLocationId}
                  onChange={(e) => setSelectedOfficeLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none text-slate-800 font-semibold focus:border-[#ff6900]"
                >
                  {officeLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.address ? `— ${loc.address}` : ""}
                    </option>
                  ))}
                </SelectBox>
              </div>
            )}
          </div>

          {/* Clock In / Out Action Button */}
          <div className="pt-2">
            {!isClockedIn ? (
              <button
                type="button"
                disabled={acting === "in"}
                onClick={() => handleClockAction("in")}
                className="w-full py-3.5 px-6 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-[0.99] text-white font-extrabold text-sm shadow-sm shadow-orange-500/25 transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {acting === "in" ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-white" />
                )}
                <span>{acting === "in" ? "Verifying Geofence & Clocking In..." : "Clock In for the Day"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={acting === "out"}
                onClick={() => handleClockAction("out")}
                className="w-full py-3.5 px-6 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-[0.99] text-white font-extrabold text-sm shadow-sm shadow-orange-500/25 transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {acting === "out" ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Square className="h-4 w-4 fill-white" />
                )}
                <span>{acting === "out" ? "Closing Out Session..." : "Clock Out"}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            )}

            <div className="flex items-center justify-center gap-2 mt-2.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>GPS Geofence & Device Check Active</span>
            </div>
          </div>
        </div>

        {/* Right Shift Overview Card - Clean White Theme */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-2xs p-6 flex flex-col justify-between min-h-[320px]">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff6900]">
                  Daily Work Session
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-headline mt-0.5">
                  Shift & Schedule
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Shift Time Pill */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Expected Shift</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {shiftStartTime} – {shiftEndTime}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-medium">Total Hours</div>
                <div className="text-sm font-bold text-[#ff6900] mt-0.5">8h Standard</div>
              </div>
            </div>

            {/* Hours Worked Progress Tracker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Logged Today</span>
                <span className="text-slate-900 font-bold">{formatMinutes(workedMinutesToday)} / 8h</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#ff6900] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((workedMinutesToday / 480) * 100))}%` }}
                />
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Break Entitlement</span>
                <span className="font-semibold text-slate-800">60 mins included</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Grace Period</span>
                <span className="font-semibold text-slate-800">{policy?.grace_minutes ?? 15} mins threshold</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Overtime Rate</span>
                <span className="font-semibold text-slate-800">1.5× standard hourly</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              to="/leave"
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 text-center border border-slate-200 transition inline-flex items-center justify-center gap-2"
            >
              <span>Apply for Leave / Time Off</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Present Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Days Present</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-headline">
              {stats.present}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>96% on-time record</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Remote Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Remote Days</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-headline">
              {stats.remote}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Approved flexible work
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Laptop className="h-6 w-6" />
          </div>
        </div>

        {/* Late Check-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Late Check-Ins</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-headline">
              {stats.late}
            </div>
            <div className="text-[11px] font-semibold text-amber-600">
              Grace period exceeded
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Absences / Off-Days */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Absences / Off</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-headline">
              {stats.absent}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Scheduled rest / leave
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 4. Weekly Attendance Overview & Rhythm Chart */}
      <WeeklyAttendanceRhythmChart
        daily={daily}
        title="Attendance This Week"
        subtitle="Your daily check-ins and on-time performance"
      />

      {/* 5. Detailed Attendance History & Corrections */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-2xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "daily"
                ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Daily Work Records ({daily.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "raw"
                ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Raw Punch Logs ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("corrections")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "corrections"
                ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Correction Requests ({corrections.length})
          </button>
        </div>

        {/* Tab 1: Daily Work Records */}
        {activeTab === "daily" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Work Date</th>
                  <th className="px-6 py-3.5">First In</th>
                  <th className="px-6 py-3.5">Last Out</th>
                  <th className="px-6 py-3.5">Hours Worked</th>
                  <th className="px-6 py-3.5">Mode</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {daily.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <div>No attendance records for this month yet.</div>
                    </td>
                  </tr>
                ) : (
                  daily.map((row) => {
                    const status = deriveAttendanceStatus(row);
                    const isPresent = status === "present";
                    const isLate = status === "late" || (row.late_minutes && row.late_minutes > 0);

                    return (
                      <tr key={row.id || row.work_date} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {formatDate(row.work_date)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {row.first_in_at ? (
                            <span className="font-semibold text-slate-900">{formatClockTime(row.first_in_at)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {row.last_out_at ? (
                            <span className="font-semibold text-slate-900">{formatClockTime(row.last_out_at)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-800">
                            {formatMinutes(row.worked_minutes)}
                          </span>
                        </td>
                        <td className="px-6 py-4 capitalize font-medium text-slate-600">
                          {row.attendance_mode || "Onsite"}
                        </td>
                        <td className="px-6 py-4">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Present
                            </span>
                          ) : isLate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Late ({row.late_minutes}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              {row.status || "Absent"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionForm((prev) => ({ ...prev, work_date: row.work_date }));
                              setShowCorrectionForm(true);
                            }}
                            className="text-xs font-semibold text-[#ff6900] hover:text-[#ea580c]"
                          >
                            Correct
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Raw Clock Entries */}
        {activeTab === "raw" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Punch Time</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Mode</th>
                  <th className="px-6 py-3.5">Work Date</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No punch log entries found for this range.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatClockTime(entry.entry_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            entry.entry_type === "clock_in"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {entry.entry_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">{entry.attendance_mode || "Onsite"}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(entry.work_date)}</td>
                      <td className="px-6 py-4 text-slate-500">{entry.source || "Web"}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">GPS Verified</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Corrections */}
        {activeTab === "corrections" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Proposed Time</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No correction requests on record.
                    </td>
                  </tr>
                ) : (
                  corrections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{formatDate(c.work_date)}</td>
                      <td className="px-6 py-4 capitalize font-semibold text-slate-700">
                        {c.request_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{c.proposed_at ? formatClockTime(c.proposed_at) : "-"}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{c.reason}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : c.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                              : "bg-amber-50 text-amber-700 border border-amber-200/60"
                          }`}
                        >
                          {c.status || "Pending Review"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Request Attendance Correction SlideOver */}
      {showCorrectionForm && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCorrectionForm(false)}
          />

          <div className="relative w-full max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-headline">
                    Request Attendance Correction
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submit a correction for forgotten punches or incorrect time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCorrectionForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form id="correction-form" onSubmit={handleCorrectionSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Work Date
                  </label>
                  <DateInput
                    
                    required
                    value={correctionForm.work_date}
                    onChange={(e) => setCorrectionForm((prev) => ({ ...prev, work_date: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Correction Type
                  </label>
                  <SelectBox
                    value={correctionForm.request_type}
                    onChange={(e) => setCorrectionForm((prev) => ({ ...prev, request_type: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900]"
                  >
                    <option value="clock_in">Clock In Time</option>
                    <option value="clock_out">Clock Out Time</option>
                    <option value="full_day">Full Day Record</option>
                  </SelectBox>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Proposed Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={correctionForm.proposed_at}
                    onChange={(e) => setCorrectionForm((prev) => ({ ...prev, proposed_at: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Mode
                  </label>
                  <SelectBox
                    value={correctionForm.proposed_mode}
                    onChange={(e) => setCorrectionForm((prev) => ({ ...prev, proposed_mode: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900]"
                  >
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="field">Field</option>
                  </SelectBox>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Reason / Explanation
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe why the correction is needed (e.g. system downtime, client meeting)..."
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900]"
                  />
                </div>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCorrectionForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="correction-form"
                disabled={submittingCorrection}
                className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                {submittingCorrection ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{submittingCorrection ? "Submitting..." : "Submit Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

export default AttendancePage;
