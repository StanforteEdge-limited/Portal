import { WORKFLOW_FORM_SCHEMAS } from "@stanforte/shared";
import { Button } from "./Button";
import { SelectField, TextField } from "./fields";

export type ApprovalStepMode = "role" | "relation" | "permission" | "office";

export type ApprovalFlowCondition = {
  id: string;
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string;
};

export type ApprovalFlowEditorStep = {
  id: string;
  mode: ApprovalStepMode;
  value: string;
  minAmount: string;
  conditions: ApprovalFlowCondition[];
};

const MODE_OPTIONS: Array<{ value: ApprovalStepMode; label: string }> = [
  { value: "role", label: "Role" },
  { value: "relation", label: "Relation" },
  { value: "permission", label: "Permission" },
  { value: "office", label: "Office" },
];

const DEFAULT_ROLE_OPTIONS = [
  "team_lead",
  "hr",
  "accountant",
  "coo",
  "ed",
  "ceo",
];

export function createApprovalFlowStep(
  mode: ApprovalStepMode = "relation",
  value = "",
  minAmount = "",
  conditions: ApprovalFlowCondition[] = []
): ApprovalFlowEditorStep {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode,
    value,
    minAmount,
    conditions,
  };
}

export function parseApprovalFlowSteps(
  approvalFlow: unknown,
  fallback: ApprovalFlowEditorStep[],
): ApprovalFlowEditorStep[] {
  const rawSteps = Array.isArray((approvalFlow as any)?.steps)
    ? ((approvalFlow as any).steps as unknown[])
    : [];

  const parsed = rawSteps
    .map((raw): ApprovalFlowEditorStep | null => {
      if (!raw || typeof raw !== "object") return null;

      const rawConditions = Array.isArray((raw as any).conditions) ? (raw as any).conditions : [];
      const parsedConditions = rawConditions.map((c: any) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        field: String(c.field || ""),
        operator: String(c.operator || "equals") as ApprovalFlowCondition["operator"],
        value: String(c.value || "")
      }));

      const role = typeof (raw as any).role === "string" ? String((raw as any).role) : "";
      if (role) {
        const minAmount =
          (raw as any).min_amount !== undefined || (raw as any).minAmount !== undefined
            ? String((raw as any).min_amount ?? (raw as any).minAmount)
            : "";
        return createApprovalFlowStep("role", role, minAmount, parsedConditions);
      }

      const approver = (raw as any).approver;
      const approverType = typeof approver?.type === "string" ? String(approver.type).toLowerCase() : "";
      const approverValue = typeof approver?.value === "string" ? String(approver.value) : "";
      if (!approverType || !approverValue) return null;
      if (!["role", "relation", "permission", "office"].includes(approverType)) return null;

      const minAmount =
        (raw as any).min_amount !== undefined || (raw as any).minAmount !== undefined
          ? String((raw as any).min_amount ?? (raw as any).minAmount)
          : "";
      return createApprovalFlowStep(approverType as ApprovalStepMode, approverValue, minAmount, parsedConditions);
    })
    .filter((step): step is ApprovalFlowEditorStep => Boolean(step));

  return parsed.length > 0 ? parsed : fallback;
}

export function serializeApprovalFlowSteps(steps: ApprovalFlowEditorStep[]) {
  const serializedSteps = steps.map((step) => {
    const value = step.value.trim();
    const minAmountText = step.minAmount.trim();
    const minAmountNumber = Number(minAmountText);
    const hasMinAmount = minAmountText.length > 0 && Number.isFinite(minAmountNumber);

    const base =
      step.mode === "role"
        ? ({ role: value } as Record<string, unknown>)
        : ({ approver: { type: step.mode, value } } as Record<string, unknown>);

    if (hasMinAmount) {
      base.min_amount = minAmountNumber;
    }

    if (step.conditions && step.conditions.length > 0) {
      base.conditions = step.conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value
      }));
    }

    return base;
  });

  return { steps: serializedSteps };
}


type ApprovalFlowBuilderProps = {
  steps: ApprovalFlowEditorStep[];
  onChange: (steps: ApprovalFlowEditorStep[]) => void;
  roleOptions?: string[];
  workflowType?: string;
};

export function ApprovalFlowBuilder({
  steps,
  onChange,
  roleOptions = DEFAULT_ROLE_OPTIONS,
  workflowType,
}: ApprovalFlowBuilderProps) {
  const setStep = (id: string, patch: Partial<ApprovalFlowEditorStep>) => {
    onChange(
      steps.map((step) => {
        if (step.id !== id) return step;
        return { ...step, ...patch };
      }),
    );
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((step) => step.id !== id));
  };

  const addStep = () => {
    onChange([...steps, createApprovalFlowStep("role", roleOptions[0] ?? "team_lead")]);
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const effectiveRoleOptions = step.value && !roleOptions.includes(step.value)
          ? [step.value, ...roleOptions]
          : roleOptions;

        return (
          <div key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Step {index + 1}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(step.id)}
                disabled={steps.length <= 1}
                type="button"
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Approver Type"
                value={step.mode}
                onChange={(e) => {
                  const nextMode = e.target.value as ApprovalStepMode;
                  const nextValue =
                    nextMode === "role" ? (roleOptions[0] ?? "team_lead") : step.value;
                  setStep(step.id, { mode: nextMode, value: nextValue });
                }}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>

              {step.mode === "role" ? (
                <SelectField
                  label="Role"
                  value={step.value}
                  onChange={(e) => setStep(step.id, { value: e.target.value })}
                >
                  {effectiveRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <TextField
                  label={step.mode === "relation" ? "Relation Value" : step.mode === "permission" ? "Permission Key" : "Office Value"}
                  value={step.value}
                  onChange={(e) => setStep(step.id, { value: e.target.value })}
                  placeholder={
                    step.mode === "relation"
                      ? "requester_team_lead"
                      : step.mode === "permission"
                        ? "finance.approve"
                        : "coo"
                  }
                />
              )}

              <TextField
                label="Minimum Amount (Optional)"
                type="number"
                value={step.minAmount}
                onChange={(e) => setStep(step.id, { minAmount: e.target.value })}
                placeholder="e.g. 500000"
              />
            </div>

            <div className="mt-4 border-t border-slate-200/60 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Dynamic Conditions</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const newCond: ApprovalFlowCondition = {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      field: "",
                      operator: "equals",
                      value: ""
                    };
                    setStep(step.id, { conditions: [...(step.conditions || []), newCond] });
                  }}
                  type="button"
                >
                  + Add Condition
                </Button>
              </div>
              
              {(!step.conditions || step.conditions.length === 0) && (
                <p className="text-xs text-slate-400">No conditions. This step applies to all requests (except those filtered by Minimum Amount).</p>
              )}
              
              <div className="space-y-2">
                {(!workflowType || !WORKFLOW_FORM_SCHEMAS[workflowType]) && (
                  <datalist id="common-condition-fields">
                    <option value="amount" />
                    <option value="leave_type" />
                    <option value="duration_days" />
                    <option value="department" />
                    <option value="job_title" />
                    <option value="category" />
                    <option value="priority" />
                    <option value="status" />
                  </datalist>
                )}
                {step.conditions?.map((cond, cIdx) => (
                  <div key={cond.id} className="flex items-center gap-2">
                    {workflowType && WORKFLOW_FORM_SCHEMAS[workflowType] ? (
                      <SelectField
                        label=""
                        value={cond.field}
                        onChange={(e) => {
                          const newConds = [...step.conditions];
                          newConds[cIdx].field = e.target.value;
                          setStep(step.id, { conditions: newConds });
                        }}
                        className="flex-1"
                      >
                        <option value="">Select a field...</option>
                        {WORKFLOW_FORM_SCHEMAS[workflowType].map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.label} ({f.name})
                          </option>
                        ))}
                      </SelectField>
                    ) : (
                      <TextField 
                        label=""
                        placeholder="Field Name" 
                        list="common-condition-fields"
                        value={cond.field}
                        onChange={(e) => {
                          const newConds = [...step.conditions];
                          newConds[cIdx].field = e.target.value;
                          setStep(step.id, { conditions: newConds });
                        }}
                        className="flex-1"
                      />
                    )}
                    <SelectField
                      label=""
                      value={cond.operator}
                      onChange={(e) => {
                        const newConds = [...step.conditions];
                        newConds[cIdx].operator = e.target.value as any;
                        setStep(step.id, { conditions: newConds });
                      }}
                      className="w-32"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="greater_than">{'>'}</option>
                      <option value="less_than">{'<'}</option>
                      <option value="contains">Contains</option>
                    </SelectField>
                    <TextField 
                      label=""
                      placeholder="Value" 
                      value={cond.value}
                      onChange={(e) => {
                        const newConds = [...step.conditions];
                        newConds[cIdx].value = e.target.value;
                        setStep(step.id, { conditions: newConds });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newConds = step.conditions.filter(c => c.id !== cond.id);
                        setStep(step.id, { conditions: newConds });
                      }}
                      type="button"
                      className="text-danger hover:bg-danger/10 px-2 mt-6"
                    >
                      x
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-1">
        <Button variant="secondary" size="sm" onClick={addStep} type="button">
          Add Approval Step
        </Button>
      </div>
    </div>
  );
}
