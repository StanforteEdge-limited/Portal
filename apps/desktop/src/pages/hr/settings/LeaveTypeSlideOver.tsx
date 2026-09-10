import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  SelectField,
  ApprovalFlowBuilder,
  createApprovalFlowStep,
  parseApprovalFlowSteps,
  serializeApprovalFlowSteps,
  type ApprovalFlowEditorStep,
  useToast,
  SectionCard,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { cacheStore, requestApi } from "@/shared/lib/core";
import { type RequestType } from "@stanforte/shared";

type Props = {
  requestType?: RequestType | null;
  onClose: () => void;
  onSaved: () => void;
};

function fsVal(schema: Record<string, unknown> | null | undefined, key: string, fallback: unknown = "") {
  const v = schema?.[key];
  return v !== undefined && v !== null ? String(v) : String(fallback);
}

function fsBool(schema: Record<string, unknown> | null | undefined, key: string, fallback = false) {
  return Boolean(schema?.[key] ?? fallback);
}

function fsNum(schema: Record<string, unknown> | null | undefined, key: string, fallback = 0) {
  const v = schema?.[key];
  return v !== undefined && v !== null ? Number(v) : fallback;
}

export default function LeaveTypeSlideOver({ requestType, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [hrGroupId, setHrGroupId] = useState<string>("");

  const fs = (requestType?.form_schema ?? {}) as Record<string, unknown>;
  const meta = fs.metadata as Record<string, unknown> | undefined;

  useEffect(() => {
    requestApi.listGroups().then((groups) => {
      const hrGroup = groups.find(g => g.code?.toLowerCase() === 'hr' || g.name?.toLowerCase().includes('human'));
      if (hrGroup) setHrGroupId(hrGroup.id);
    }).catch(console.error);
  }, []);

  const [name, setName] = useState(requestType?.name || "");
  const [slug, setSlug] = useState(requestType?.slug || "");
  const [isActive, setIsActive] = useState(requestType?.is_active ?? true);

  const [leaveTypeKey, setLeaveTypeKey] = useState(fsVal(fs, "leave_type_key"));
  const [entitledDays, setEntitledDays] = useState(fsVal(fs, "entitled_days_per_year"));
  const [maxDaysPerRequest, setMaxDaysPerRequest] = useState(fsVal(fs, "max_days_per_request"));
  const [allowHalfDay, setAllowHalfDay] = useState(fsBool(fs, "allow_half_day"));
  const [halfDayAttachment, setHalfDayAttachment] = useState(fsBool(fs, "half_day_requires_attachment"));

  const initAccrualType = fsVal(fs, "accrual_type") || (meta ? String(meta.accrual_type ?? "") : "") || "upfront";
  const [accrualType, setAccrualType] = useState(initAccrualType);
  const [prorateNewHires, setProrateNewHires] = useState(fsBool(fs, "prorate") || (meta ? Boolean(meta.prorate) : true));
  const [allowNegative, setAllowNegative] = useState(fsBool(fs, "allow_negative") || (meta ? Boolean(meta.allow_negative) : false));
  const [allowCarryOver, setAllowCarryOver] = useState(fsBool(fs, "allow_carry_over") || (meta ? Boolean(meta.allow_carry_over) : false));
  const [maxCarryOver, setMaxCarryOver] = useState(fsNum(fs, "max_carryover_days") || (meta ? Number(meta.max_carry_over) : 5));
  const [noticeDays, setNoticeDays] = useState(fsNum(fs, "min_notice_days") || (meta ? Number(meta.notice_days) : 0));

  const [approvalSteps, setApprovalSteps] = useState<ApprovalFlowEditorStep[]>(() =>
    parseApprovalFlowSteps(requestType?.approval_flow_json || requestType?.approvalFlowJson, [
      createApprovalFlowStep("role", "team_lead"),
      createApprovalFlowStep("role", "hr"),
    ]),
  );

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ tone: "warning", title: "Required", message: "Type name is required." });
      return;
    }
    if (!requestType?.id && !hrGroupId) {
      showToast({ tone: "danger", title: "Error", message: "HR Request Group not found. Cannot create type." });
      return;
    }
    if (approvalSteps.length === 0) {
      showToast({ tone: "warning", title: "Approval flow required", message: "Add at least one approval step." });
      return;
    }
    const hasMissingStepValue = approvalSteps.some((step) => !step.value.trim());
    if (hasMissingStepValue) {
      showToast({ tone: "warning", title: "Missing step value", message: "Each approval step needs a value." });
      return;
    }
    const approvalFlowJson = serializeApprovalFlowSteps(approvalSteps) as Record<string, unknown>;
    const normalizedKey = leaveTypeKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    try {
      setSaving(true);
      const payload: Partial<RequestType> = {
        name: name.trim(),
        is_active: isActive,
        approval_flow_json: approvalFlowJson,
        form_schema: {
          leave_type_key: normalizedKey || undefined,
          entitled_days_per_year: entitledDays ? Number(entitledDays) : 0,
          max_days_per_request: maxDaysPerRequest ? Number(maxDaysPerRequest) : 0,
          allow_half_day: allowHalfDay,
          half_day_requires_attachment: allowHalfDay && halfDayAttachment,
          accrual_type: accrualType,
          prorate: prorateNewHires,
          allow_negative: allowNegative,
          allow_carry_over: allowCarryOver,
          max_carryover_days: allowCarryOver ? Number(maxCarryOver) : 0,
          min_notice_days: Number(noticeDays),
        },
      };
      if (!requestType?.id) {
        payload.slug = slug.trim() || name.toLowerCase().replace(/\s+/g, "_");
        payload.category = "leave";
      }
      await requestApi.saveType(payload, requestType?.id, hrGroupId);

      cacheStore.invalidateCache("requests:types");
      cacheStore.invalidateCache("hr:leave_types");
      showToast({ tone: "success", title: "Saved", message: `Leave type ${requestType ? "updated" : "created"}.` });
      onSaved();
    } catch (err) {
      showToast({ tone: "danger", title: "Failed", message: err instanceof Error ? err.message : "Unable to save leave type." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="xl">
      <SlideOverHeader title={requestType ? "Edit Leave Type" : "Add Leave Type"} subtitle="Settings" onClose={onClose} />
      <SlideOverContent>
        <SectionCard title="Basic Info">
          <div className="grid gap-4">
            <TextField label="Type Name" placeholder="e.g. Annual Leave, Sick Leave" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Slug (Auto-generated if empty)" placeholder="e.g. annual_leave" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!!requestType} />
            {requestType && <p className="text-xs text-slate-400 -mt-2">Slug is fixed after type creation.</p>}
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="type-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900" />
              <label htmlFor="type-active" className="text-sm font-medium text-slate-700">Active Type</label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Business Rules">
          <p className="mb-4 text-xs text-slate-500">Define how this leave type is calculated and requested.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField label="Accrual Type" value={accrualType} onChange={(e) => setAccrualType(e.target.value)}>
              <option value="upfront">Upfront (All days available Jan 1st)</option>
              <option value="monthly">Monthly Accrual</option>
              <option value="yearly">Yearly Anniversary Accrual</option>
            </SelectField>
            <TextField label="Leave Type Key" value={leaveTypeKey} onChange={(e) => setLeaveTypeKey(e.target.value)} placeholder="e.g. annual_leave" />
            <TextField label="Entitled Days / Year" type="number" value={entitledDays} onChange={(e) => setEntitledDays(e.target.value)} placeholder="e.g. 20" />
            <TextField label="Required Notice (Days)" type="number" value={noticeDays} onChange={(e) => setNoticeDays(Number(e.target.value))} placeholder="0 for no notice" />
            <TextField label="Max Days Per Request" type="number" value={maxDaysPerRequest} onChange={(e) => setMaxDaysPerRequest(e.target.value)} placeholder="e.g. 20" />

            <div className="space-y-4 pt-2 lg:col-span-2">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="rule-halfday" checked={allowHalfDay} onChange={(e) => setAllowHalfDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900" />
                  <div className="flex flex-col">
                    <label htmlFor="rule-halfday" className="text-sm font-medium text-slate-700">Allow Half Day</label>
                    <span className="text-xs text-slate-500">Staff can request half-day leave.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="rule-halfday-attach" checked={halfDayAttachment} onChange={(e) => setHalfDayAttachment(e.target.checked)} disabled={!allowHalfDay} className="h-4 w-4 rounded border-slate-300 text-brand-900 disabled:opacity-50" />
                  <div className="flex flex-col">
                    <label htmlFor="rule-halfday-attach" className={`text-sm font-medium ${allowHalfDay ? "text-slate-700" : "text-slate-400"}`}>Half Day Needs Attachment</label>
                    <span className="text-xs text-slate-500">Requires supporting document for half-day requests.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="rule-prorate" checked={prorateNewHires} onChange={(e) => setProrateNewHires(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900" />
                <div className="flex flex-col">
                  <label htmlFor="rule-prorate" className="text-sm font-medium text-slate-700">Prorate for New Hires</label>
                  <span className="text-xs text-slate-500">Adjust total days based on the employee's hire date.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="rule-negative" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900" />
                <div className="flex flex-col">
                  <label htmlFor="rule-negative" className="text-sm font-medium text-slate-700">Allow Negative Balance</label>
                  <span className="text-xs text-slate-500">Employees can take leave in advance of accrual.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="rule-carry" checked={allowCarryOver} onChange={(e) => setAllowCarryOver(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900" />
                <div className="flex flex-col">
                  <label htmlFor="rule-carry" className="text-sm font-medium text-slate-700">Permit Carry-Over</label>
                  <span className="text-xs text-slate-500">Allow unused days to roll into the next year.</span>
                </div>
              </div>

              {allowCarryOver && (
                <div className="pl-7 mt-2 lg:col-span-2">
                  <TextField label="Max Days to Carry Over" type="number" value={maxCarryOver} onChange={(e) => setMaxCarryOver(Number(e.target.value))} />
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Approval Flow">
          <ApprovalFlowBuilder steps={approvalSteps} onChange={setApprovalSteps} roleOptions={["team_lead", "hr", "coo", "ed", "ceo"]} />
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>{saving ? "Saving..." : "Save Leave Type"}</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
