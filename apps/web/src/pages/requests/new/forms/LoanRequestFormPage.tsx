import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { SectionCard, SelectField, TextAreaField, TextField } from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import type { RequestTypeOption, RequestCategoryOption, RequestRecord } from "@/pages/requests/requests-api";
import type { RequestFormHandle } from "./category-form-types";
import { useCachedQuery } from "@/shared/lib/core";

type LoanFormState = {
  loan_type: string;
  principal_amount: string;
  repayment_months: string;
  start_recovery_date: string;
  is_special_request: boolean;
  special_request_justification: string;
};

type Props = {
  selectedType: RequestTypeOption;
  selectedCategory: RequestCategoryOption | null;
  editRequest?: RequestRecord | null;
  loadingEdit: boolean;
  onSummary: (node: React.ReactNode) => void;
};

export const LoanRequestFormPage = forwardRef<RequestFormHandle, Props>(({
  selectedType,
  selectedCategory,
  editRequest,
  loadingEdit,
  onSummary,
}, ref) => {
  const getNextMonthFirstDay = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState<LoanFormState>({
    loan_type: "loan",
    principal_amount: "",
    repayment_months: "1",
    start_recovery_date: getNextMonthFirstDay(),
    is_special_request: false,
    special_request_justification: "",
  });

  useEffect(() => {
    if (!editRequest) return;
    const data = editRequest.data && typeof editRequest.data === "object" ? editRequest.data : {};
    setForm({
      loan_type: String(data.loan_type || "loan"),
      principal_amount: String(data.principal_amount || editRequest.total_amount || ""),
      repayment_months: String(data.repayment_months || "1"),
      start_recovery_date: String(data.start_recovery_date || getNextMonthFirstDay()),
      is_special_request: Boolean(data.is_special_request),
      special_request_justification: String(data.special_request_justification || ""),
    });
  }, [editRequest]);

  const principal = Number(form.principal_amount) || 0;
  const months = Number(form.repayment_months) || 1;
  const monthlyRepayment = principal / months;

  const { data: policyData } = useCachedQuery(
    `policies:resolve:payroll:loan_limits:${form.loan_type}`,
    () => import("@/shared/lib/core").then(m => m.policyApi.resolvePolicy("payroll", "loan_limits", { loan_type: form.loan_type })),
    { ttlMs: 1000 * 60 * 5, storage: "memory" }
  );

  const policyLimits = policyData?.data?.rules || {};
  const maxPrincipal = policyLimits.max_principal_amount ? Number(policyLimits.max_principal_amount) : Infinity;
  const maxRepaymentMonths = policyLimits.max_repayment_months ? Number(policyLimits.max_repayment_months) : Infinity;

  const principalHit = principal > maxPrincipal;
  const repaymentHit = months > maxRepaymentMonths;
  const policyHit = principalHit || repaymentHit;

  useEffect(() => {
    onSummary(
      <section className="section-card bg-brand-900 p-5 text-white">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
          {selectedCategory?.name || "Loan Request"}
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-tight">
          {formatCurrency(principal || 0)}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {selectedCategory?.description || "Request a loan or salary advance."}
        </p>
        <div className="mt-4 space-y-2">
          <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">Repayment Period</p>
            <p className="mt-2 text-lg font-semibold">{months} Month{months === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">Monthly Recovery</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrency(monthlyRepayment || 0)}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">Deduction Schedule</p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Deductions will begin automatically on the recovery date after disbursement.
            </p>
          </div>
        </div>
      </section>
    );
  }, [principal, months, monthlyRepayment, selectedCategory, onSummary]);

  useImperativeHandle(ref, () => ({
    validateAndBuild: () => {
      if (!form.loan_type) {
        return { error: "Loan type is required." };
      }
      const p = Number(form.principal_amount);
      if (!p || p <= 0) {
        return { error: "Please enter a valid principal amount." };
      }
      const m = Number(form.repayment_months);
      if (!m || m <= 0) {
        return { error: "Please select repayment months." };
      }
      if (!form.start_recovery_date) {
        return { error: "Start recovery date is required." };
      }
      if (policyHit && !form.is_special_request) {
        return { error: `Policy limits exceeded. Max principal: ${formatCurrency(maxPrincipal)}, Max duration: ${maxRepaymentMonths} months. Check "Special Request" to bypass with justification.` };
      }
      if (form.is_special_request && !form.special_request_justification.trim()) {
        return { error: "Justification is required for special requests." };
      }

      const title = `${form.loan_type === "salary_advance" ? "Salary Advance" : "Staff Loan"} Request - ${formatCurrency(p)}`;

      return {
        payload: {
          total_amount: p,
          data: {
            loan_type: form.loan_type,
            principal_amount: p,
            repayment_months: m,
            monthly_recovery_amount: Math.round((p / m) * 100) / 100,
            start_recovery_date: form.start_recovery_date,
            title: title,
            is_special_request: form.is_special_request,
            special_request_justification: form.is_special_request ? form.special_request_justification.trim() : undefined,
          },
        },
      };
    },
  }));

  const repaymentDurationOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} Month${i + 1 === 1 ? "" : "s"}`,
  }));

  return (
    <div className="space-y-6">
      <SectionCard
        title="Loan Details"
        description="Enter the details of your loan or salary advance request."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            label="Request Type"
            value={form.loan_type}
            onChange={(event) => setForm((prev) => ({ ...prev, loan_type: event.target.value }))}
          >
            <option value="loan">Staff Loan</option>
            <option value="salary_advance">Salary Advance</option>
          </SelectField>

          <TextField
            label="Principal Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.principal_amount}
            onChange={(event) => setForm((prev) => ({ ...prev, principal_amount: event.target.value }))}
            placeholder="0.00"
          />

          <SelectField
            label="Repayment Duration"
            value={form.repayment_months}
            onChange={(event) => setForm((prev) => ({ ...prev, repayment_months: event.target.value }))}
          >
            {repaymentDurationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectField>

          <TextField
            label="Start Recovery Date"
            type="date"
            value={form.start_recovery_date}
            onChange={(event) => setForm((prev) => ({ ...prev, start_recovery_date: event.target.value }))}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextField
            label="Estimated Monthly Recovery"
            value={formatCurrency(monthlyRepayment || 0)}
            disabled
          />
        </div>

        {policyHit && (
          <div className="mt-5 rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-amber-700">
              Warning: Your request exceeds standard policy limits.
              {principalHit && ` Max principal: ${formatCurrency(maxPrincipal)}.`}
              {repaymentHit && ` Max duration: ${maxRepaymentMonths} months.`}
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_special_request}
                onChange={(e) => setForm(prev => ({ ...prev, is_special_request: e.target.checked }))}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              Submit as a Special Request
            </label>
            {form.is_special_request && (
              <div className="mt-4">
                <TextAreaField
                  label="Special Request Justification"
                  value={form.special_request_justification}
                  onChange={(e) => setForm(prev => ({ ...prev, special_request_justification: e.target.value }))}
                  placeholder="Provide justification for why this loan should be approved despite exceeding limits."
                />
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
});

LoanRequestFormPage.displayName = "LoanRequestFormPage";
