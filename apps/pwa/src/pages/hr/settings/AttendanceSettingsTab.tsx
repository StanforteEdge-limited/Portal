import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  SelectField,
  useToast,
  Chip,
  Icon,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { policyApi } from "@/shared/lib/core";
import { type PolicyRecord } from "@stanforte/shared";

const WEEKDAYS = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 0 },
];

type Props = {
  onEditPolicy: (policy: PolicyRecord | null | boolean) => void;
};

export default function AttendanceSettingsTab({ onEditPolicy }: Props) {
  const { showToast } = useToast();
  const [globalPolicy, setGlobalPolicy] = useState<PolicyRecord | null>(null);
  const [overrides, setOverrides] = useState<PolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [grace, setGrace] = useState(15);
  const [onsiteDays, setOnsiteDays] = useState<number[]>([]);
  const [enforceClockInMode, setEnforceClockInMode] = useState(false);
  const [enforceClockOutModeMatch, setEnforceClockOutModeMatch] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const filtered = await policyApi.listPolicies("attendance");
      const global = filtered.find(p => p.scope_type === "global" && p.policy_key === "schedule");
      const list = filtered.filter(p => (p.scope_type !== "global" || p.policy_key !== "schedule") && p.module === "attendance");
      
      setGlobalPolicy(global || null);
      setOverrides(list);

      if (global?.config_json) {
        setStartTime(global.config_json.start_time || "09:00");
        setEndTime(global.config_json.end_time || "17:00");
        setGrace(global.config_json.grace_minutes || 15);
        setOnsiteDays(global.config_json.onsite_weekdays || [1, 5]);
        setEnforceClockInMode(Boolean(global.config_json.enforce_expected_mode_clock_in ?? false));
        setEnforceClockOutModeMatch(Boolean(global.config_json.enforce_clock_out_match_clock_in_mode ?? true));
      }
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load attendance settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this override?")) return;
    try {
      await policyApi.deletePolicy(id);
      showToast({ tone: "success", title: "Deleted", message: "Override removed successfully." });
      await load();
    } catch {
      showToast({ tone: "danger", title: "Error", message: "Failed to delete override." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSaveGlobal = async () => {
    try {
      setSaving(true);
      const config = {
        start_time: startTime,
        end_time: endTime,
        grace_minutes: Number(grace),
        onsite_weekdays: onsiteDays,
        enforce_expected_mode_clock_in: enforceClockInMode,
        enforce_clock_out_match_clock_in_mode: enforceClockOutModeMatch,
      };
      await policyApi.savePolicy({
        module: "attendance",
        policy_key: "schedule",
        scope_type: "global",
        config_json: config,
        priority: 100,
        is_active: true,
      }, globalPolicy?.id);
      
      showToast({ tone: "success", title: "Success", message: "Global attendance policy updated." });
      await load();
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to save policy." });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setOnsiteDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading attendance settings...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Global Attendance Policy</h3>
        <p className="text-sm text-slate-500 mt-1">These settings apply to everyone by default.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <TextField label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <TextField label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          <TextField label="Grace Period (mins)" type="number" value={grace} onChange={(e) => setGrace(Number(e.target.value))} />
        </div>

        <div className="mt-6">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Onsite Days</label>
          <div className="flex gap-2 mt-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
                  onsiteDays.includes(day.value)
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-110"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 italic">Selected days are onsite, others are remote.</p>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={() => void handleSaveGlobal()} disabled={saving}>
            {saving ? "Saving..." : "Save Policy"}
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Mode Enforcement</p>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={enforceClockInMode}
                onChange={(e) => setEnforceClockInMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Require clock-in mode to match expected mode</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={enforceClockOutModeMatch}
                onChange={(e) => setEnforceClockOutModeMatch(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Require clock-out mode to match clock-in mode</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Policy Overrides</h3>
            <p className="text-sm text-slate-500 mt-1">Exceptions for specific organizations, teams, or staff.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditPolicy(true)}>
            <Icon name="add" className="mr-1" />
            Add Override
          </Button>
        </div>

        <DataTable
          columns={[
            { header: "Target", className: "font-medium text-slate-900", cell: (row: any) => row.scope_id || "-" },
            { header: "Scope", cell: (row: any) => <Chip variant="neutral">{row.scope_type}</Chip> },
            { header: "Priority", cell: (row: any) => row.priority },
            { header: "Status", cell: (row: any) => (
              <Chip variant={row.is_active ? "success" : "neutral"}>
                {row.is_active ? "Active" : "Disabled"}
              </Chip>
            ) },
            { header: "Action", cell: (row: any) => (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEditPolicy(row)}>
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(row.id)}
                  className="ml-2 text-danger hover:text-danger"
                >
                  Delete
                </Button>
              </>
            ) },
          ]}
          data={overrides}
        />
      </div>
      </div>
  );
}
