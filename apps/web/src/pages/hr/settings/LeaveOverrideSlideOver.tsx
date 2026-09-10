import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  SelectField,
  useToast,
  SectionCard,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { policyApi, requestApi } from "@/shared/lib/core";
import { type PolicyRecord, type ScopeType, type RequestType } from "@stanforte/shared";
import { useDirectory } from "@/shared/lib/use-directory";

type Props = {
  policy?: PolicyRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function LeaveOverrideSlideOver({ policy, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const { organizations, teams, employees } = useDirectory();

  const [scopeType, setScopeType] = useState<ScopeType>(policy?.scope_type || "organization");
  const [scopeId, setScopeId] = useState(policy?.scope_id || "");
  const [priority, setPriority] = useState(policy?.priority || 200);
  const [isActive, setIsActive] = useState(policy?.is_active ?? true);
  const [entitlements, setEntitlements] = useState<Record<string, number>>(policy?.config_json || {});

  useEffect(() => {
    requestApi.listTypes().then(setRequestTypes).catch(() => setRequestTypes([]));
  }, []);

  const updateEntitlement = (slug: string, days: number) => {
    setEntitlements(prev => ({ ...prev, [slug]: days }));
  };

  async function handleSubmit() {
    if (scopeType !== "global" && !scopeId.trim()) {
      showToast({ tone: "warning", title: "Missing ID", message: "Please provide the Target ID." });
      return;
    }
    try {
      setSaving(true);
      await policyApi.savePolicy({
        module: "leave",
        policy_key: "leave_entitlements",
        scope_type: scopeType,
        scope_id: scopeType === "global" ? undefined : scopeId.trim(),
        priority: Number(priority),
        is_active: isActive,
        config_json: entitlements,
      }, policy?.id);

      showToast({ tone: "success", title: "Saved", message: "Leave entitlements updated." });
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
        title={policy ? "Edit Entitlements" : "Add Entitlement Override"}
        subtitle="Leave Policies"
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Target Scope">
          <div className="grid gap-4">
            <SelectField
              label="Scope Type"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as ScopeType)}
              disabled={!!policy}
            >
              <option value="global">Global (Default for everyone)</option>
              <option value="organization">Organization</option>
              <option value="team">Team</option>
              <option value="staff_type">Staff Type</option>
              <option value="user">Specific User</option>
            </SelectField>

            {scopeType === "global" && (
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs text-primary leading-relaxed">
                <strong>Global Rule:</strong> These entitlements will apply to all employees in the system unless overridden by a more specific rule (Organization, Team, or User).
              </div>
            )}

            {scopeType === "organization" && (
              <SelectField label="Target Organization" value={scopeId} onChange={(e) => setScopeId(e.target.value)} disabled={!!policy}>
                <option value="">Select organization…</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </SelectField>
            )}

            {scopeType === "team" && (
              <SelectField label="Target Team" value={scopeId} onChange={(e) => setScopeId(e.target.value)} disabled={!!policy}>
                <option value="">Select team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            )}

            {scopeType === "staff_type" && (
              <SelectField label="Staff Type" value={scopeId} onChange={(e) => setScopeId(e.target.value)} disabled={!!policy}>
                <option value="">Select type…</option>
                <option value="staff">Regular Staff</option>
                <option value="vendor">Vendor</option>
                <option value="client">Client</option>
                <option value="board_member">Board Member</option>
              </SelectField>
            )}

            {scopeType === "user" && (
              <SelectField label="Target Employee" value={scopeId} onChange={(e) => setScopeId(e.target.value)} disabled={!!policy}>
                <option value="">Select staff member…</option>
                {employees.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subtitle})</option>)}
              </SelectField>
            )}

            <TextField 
              label="Priority" 
              type="number"
              value={priority} 
              onChange={(e) => setPriority(Number(e.target.value))} 
            />
          </div>
        </SectionCard>

        <SectionCard title="Annual Day Entitlements">
          <p className="mb-4 text-xs text-slate-500">
            Set the number of allowed days per year for each leave type.
          </p>
          <div className="space-y-4">
            {requestTypes.map(type => (
              <div key={type.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-700">{type.name}</span>
                <div className="w-24">
                  <TextField 
                    label="" 
                    type="number" 
                    placeholder="0"
                    value={entitlements[type.slug] || ""} 
                    onChange={(e) => updateEntitlement(type.slug, Number(e.target.value))} 
                  />
                </div>
              </div>
            ))}
            {requestTypes.length === 0 && <p className="text-sm text-slate-400 italic">Loading leave types...</p>}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="leave-active"
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-900"
            />
            <label htmlFor="leave-active" className="text-sm font-medium text-slate-700">Override is Active</label>
          </div>
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving..." : "Save Entitlements"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </SlideOverFooter>
    </SlideOver>
  );
}