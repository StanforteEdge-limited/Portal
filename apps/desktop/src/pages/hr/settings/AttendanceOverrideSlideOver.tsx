import { useState } from "react";
import {
  Button,
  TextField,
  SelectField,
  useToast,
  SectionCard,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { policyApi } from "@/shared/lib/core";
import { type PolicyRecord, type ScopeType } from "@stanforte/shared";
import { useDirectory } from "@/shared/lib/use-directory";

type Props = {
  policy?: PolicyRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

const WEEKDAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

const WORK_WEEKDAYS = [1, 2, 3, 4, 5];

export default function AttendanceOverrideSlideOver({ policy, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const { organizations, teams, employees } = useDirectory();

  const [scopeType, setScopeType] = useState<ScopeType>(policy?.scope_type || "organization");
  const [scopeId, setScopeId] = useState(policy?.scope_id || "");
  const [priority, setPriority] = useState(policy?.priority || 200);
  const [scopeTypeChanged, setScopeTypeChanged] = useState(false);

  const [startTime, setStartTime] = useState(policy?.config_json?.start_time || "09:00");
  const [endTime, setEndTime] = useState(policy?.config_json?.end_time || "17:00");
  const [grace, setGrace] = useState(policy?.config_json?.grace_minutes || 15);
  const [onsiteDays, setOnsiteDays] = useState<number[]>(policy?.config_json?.onsite_weekdays || [1, 2, 3, 4, 5]);
  const [enforceClockInMode, setEnforceClockInMode] = useState<boolean>(
    Boolean(policy?.config_json?.enforce_expected_mode_clock_in ?? false)
  );
  const [enforceClockOutModeMatch, setEnforceClockOutModeMatch] = useState<boolean>(
    Boolean(policy?.config_json?.enforce_clock_out_match_clock_in_mode ?? true)
  );
  const [isActive, setIsActive] = useState(policy?.is_active ?? true);

  const toggleDay = (day: number) => {
    setOnsiteDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  async function handleSubmit() {
    if (!scopeId.trim()) {
      showToast({ tone: "warning", title: "Missing ID", message: "Please provide the Target ID (e.g. Org ID, Team ID or User Email)." });
      return;
    }

    const isScopeChanged = scopeTypeChanged || 
      (policy && (policy.scope_type !== scopeType || policy.scope_id !== scopeId));

    try {
      setSaving(true);
      
      if (isScopeChanged && policy?.id) {
        await policyApi.deletePolicy(policy.id);
      }
      
      await policyApi.savePolicy({
        module: "attendance",
        policy_key: "schedule",
        scope_type: scopeType,
        scope_id: scopeId.trim(),
        priority: Number(priority),
        is_active: isActive,
        config_json: {
          start_time: startTime,
          end_time: endTime,
          grace_minutes: Number(grace),
          onsite_weekdays: onsiteDays,
          remote_weekdays: WORK_WEEKDAYS.filter(d => !onsiteDays.includes(d)),
          enforce_expected_mode_clock_in: enforceClockInMode,
          enforce_clock_out_match_clock_in_mode: enforceClockOutModeMatch,
        },
      }, policy?.id);

      showToast({ tone: "success", title: "Saved", message: "Policy override saved successfully." });
      onSaved();
    } catch (err) {
      showToast({ tone: "danger", title: "Failed", message: err instanceof Error ? err.message : "Unable to save override." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="lg">
      <SlideOverHeader
        title={policy ? "Edit Override" : "Add Policy Override"}
        subtitle="Attendance Policies"
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Target Scope">
          <div className="grid gap-4">
            <SelectField
              label="Scope Type"
              value={scopeType}
              onChange={(e) => {
                setScopeType(e.target.value as ScopeType);
                setScopeTypeChanged(true);
                setScopeId("");
              }}
            >
              <option value="organization">Organization</option>
              <option value="team">Team</option>
              <option value="user">Specific User</option>
            </SelectField>

            {scopeType === "organization" && (
              <SelectField label="Target Organization" value={scopeId} onChange={(e) => { setScopeId(e.target.value); setScopeTypeChanged(true); }}>
                <option value="">Select organization…</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </SelectField>
            )}

            {scopeType === "team" && (
              <SelectField label="Target Team" value={scopeId} onChange={(e) => { setScopeId(e.target.value); setScopeTypeChanged(true); }}>
                <option value="">Select team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            )}

            {scopeType === "user" && (
              <SelectField label="Target Employee" value={scopeId} onChange={(e) => { setScopeId(e.target.value); setScopeTypeChanged(true); }}>
                <option value="">Select staff member…</option>
                {employees.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subtitle})</option>)}
              </SelectField>
            )}

            <TextField 
              label="Priority (Higher wins)" 
              type="number"
              value={priority} 
              onChange={(e) => setPriority(Number(e.target.value))} 
            />
          </div>
        </SectionCard>

        <SectionCard title="Schedule Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <TextField label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <TextField label="Grace Period (mins)" type="number" value={grace} onChange={(e) => setGrace(Number(e.target.value))} />
          </div>
          
          <div className="mt-6">
            <p className="field-label mb-2">Required Onsite Days</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    onsiteDays.includes(day.value) 
                      ? "bg-brand-900 text-white border-brand-900" 
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="policy-active"
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-900"
            />
            <label htmlFor="policy-active" className="text-sm font-medium text-slate-700">Policy is Active</label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mode Enforcement</p>
            <div className="mt-3 space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={enforceClockInMode}
                  onChange={(e) => setEnforceClockInMode(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-900"
                />
                <span className="text-sm text-slate-700">Require clock-in mode to match expected mode</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={enforceClockOutModeMatch}
                  onChange={(e) => setEnforceClockOutModeMatch(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-900"
                />
                <span className="text-sm text-slate-700">Require clock-out mode to match clock-in mode</span>
              </label>
            </div>
          </div>
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving..." : "Save Override"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
