import { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  SelectField,
  SlideOver,
  SlideOverContent,
  SlideOverFooter,
  SlideOverHeader,
  StatCard,
  TextField,
  TextAreaField,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listLoans,
  createLoan,
  updateLoan,
  listPayrollWorkers,
  logManualRepayment,
  type PayrollLoan,
  type PayrollWorker,
  type UpsertLoanPayload,
} from "@/shared/api/payroll-api";
import { policyApi } from "@/shared/lib/core";
import { type PolicyRecord } from "@stanforte/shared";

const EMPTY_FORM: UpsertLoanPayload = {
  worker_id: "",
  loan_type: "loan",
  title: "",
  principal_amount: 0,
  issued_date: new Date().toISOString().slice(0, 10),
  start_recovery_date: new Date().toISOString().slice(0, 10),
  monthly_recovery_amount: 0,
  notes: "",
  status: "active",
};

export default function HrPayrollLoansPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [listKey, setListKey] = useState(0);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingLoan, setEditingLoan] = useState<PayrollLoan | null>(null);
  const [viewingLoan, setViewingLoan] = useState<PayrollLoan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpsertLoanPayload>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId, closeMenu]);

  const [repayingLoan, setRepayingLoan] = useState<PayrollLoan | null>(null);
  const [manualRepaymentAmount, setManualRepaymentAmount] = useState("");
  const [manualRepaymentNotes, setManualRepaymentNotes] = useState("");

  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [policyLoanMaxPrincipal, setPolicyLoanMaxPrincipal] = useState("");
  const [policyLoanMaxDuration, setPolicyLoanMaxDuration] = useState("");

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: loansResp, loading } = useCachedQuery(
    `hr:payroll:loans:${listKey}:${filterType}:${filterStatus}`,
    () =>
      listLoans({
        loan_type: filterType || undefined,
        status: filterStatus || undefined,
      }),
    { ttlMs: 0, storage: "memory" },
  );

  const { data: workersResp } = useCachedQuery(
    "hr:payroll:workers-for-loans",
    () => listPayrollWorkers({ per_page: 200 }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const loans = loansResp?.items ?? [];
  const workers = workersResp?.items ?? [];

  const totalPrincipal = loans.reduce((acc, l) => acc + (l.principal_amount ?? 0), 0);
  const totalOutstanding = loans.reduce((acc, l) => acc + (l.outstanding_amount ?? 0), 0);
  const activeLoansCount = loans.filter((l) => l.status === "active").length;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  const openCreate = () => {
    setEditingLoan(null);
    setForm({
      ...EMPTY_FORM,
      issued_date: new Date().toISOString().slice(0, 10),
      start_recovery_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toISOString()
        .slice(0, 10), // Default to 1st of next month
    });
    setShowSlideOver(true);
  };

  const openEdit = (l: PayrollLoan) => {
    setEditingLoan(l);
    setForm({
      worker_id: l.worker_id,
      loan_type: l.loan_type,
      title: l.title,
      principal_amount: l.principal_amount,
      issued_date: l.issued_date ? l.issued_date.slice(0, 10) : "",
      start_recovery_date: l.start_recovery_date ? l.start_recovery_date.slice(0, 10) : "",
      monthly_recovery_amount: l.monthly_recovery_amount ?? 0,
      recovery_rate: l.recovery_rate ?? undefined,
      notes: l.notes ?? "",
      status: l.status,
    });
    setShowSlideOver(true);
  };

  const handleSave = async () => {
    if (!form.worker_id) {
      showToast({ tone: "warning", title: "Worker required", message: "Please select a worker." });
      return;
    }
    if (!form.title.trim()) {
      showToast({ tone: "warning", title: "Title required", message: "Please enter a loan title." });
      return;
    }
    if (Number(form.principal_amount) <= 0) {
      showToast({ tone: "warning", title: "Invalid principal", message: "Principal amount must be greater than zero." });
      return;
    }
    if (Number(form.monthly_recovery_amount) <= 0) {
      showToast({ tone: "warning", title: "Invalid recovery", message: "Monthly recovery amount must be greater than zero." });
      return;
    }

    setSaving(true);
    try {
      const payload: UpsertLoanPayload = {
        ...form,
        principal_amount: Number(form.principal_amount),
        monthly_recovery_amount: Number(form.monthly_recovery_amount),
        recovery_rate: form.recovery_rate ? Number(form.recovery_rate) : undefined,
      };

      if (editingLoan) {
        await updateLoan(editingLoan.id, payload);
        showToast({ tone: "success", title: "Updated", message: "Loan updated successfully." });
      } else {
        await createLoan(payload);
        showToast({ tone: "success", title: "Created", message: "Loan created successfully." });
      }
      setShowSlideOver(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Unable to save loan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (loan: PayrollLoan, newStatus: "active" | "paused" | "closed") => {
    try {
      await updateLoan(loan.id, { status: newStatus } as any);
      showToast({ tone: "success", title: "Status Updated", message: `Loan status changed to ${newStatus}.` });
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Unable to update status.",
      });
    }
  };

  const handleLogRepayment = async () => {
    if (!repayingLoan) return;
    const amount = Number(manualRepaymentAmount);
    if (!amount || amount <= 0) {
      showToast({ tone: "warning", title: "Invalid amount", message: "Repayment amount must be greater than zero." });
      return;
    }
    if (amount > (repayingLoan.outstanding_amount ?? 0)) {
      showToast({ tone: "warning", title: "Invalid amount", message: "Repayment amount cannot exceed outstanding balance." });
      return;
    }
    
    setSaving(true);
    try {
      await logManualRepayment(repayingLoan.id, { amount, notes: manualRepaymentNotes });
      showToast({ tone: "success", title: "Repayment logged", message: "Manual repayment has been recorded." });
      setRepayingLoan(null);
      setListKey(k => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Repayment failed", message: err instanceof Error ? err.message : "Unable to log repayment." });
    } finally {
      setSaving(false);
    }
  };

  const loadPolicy = async () => {
    try {
      const records = await policyApi.listPolicies("payroll");
      const record = records.find((r: PolicyRecord) => r.policy_key === "loan_limits");
      if (record) {
        setPolicyId(record.id);
        const config = record.config_json || {};
        setPolicyLoanMaxPrincipal(String(config.max_principal_amount || ""));
        setPolicyLoanMaxDuration(String(config.max_repayment_months || ""));
      } else {
        setPolicyId("");
        setPolicyLoanMaxPrincipal("");
        setPolicyLoanMaxDuration("");
      }
      setShowPolicyEditor(true);
    } catch (err) {
      showToast({ tone: "danger", title: "Policy Load Failed", message: "Unable to load policy configuration." });
    }
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      const config_json = {
        max_principal_amount: Number(policyLoanMaxPrincipal) || null,
        max_repayment_months: Number(policyLoanMaxDuration) || null,
      };
      await policyApi.savePolicy({
        module: "payroll",
        policy_key: "loan_limits",
        config_json,
      }, policyId || undefined);
      showToast({ tone: "success", title: "Policy Updated", message: "Loan limits updated successfully." });
      setShowPolicyEditor(false);
    } catch (err) {
      showToast({ tone: "danger", title: "Policy Update Failed", message: err instanceof Error ? err.message : "Unable to save policy." });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
  };

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-payroll-loans"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title ?? "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "HR", path: "/hr" },
          { label: "Payroll", path: "/hr/payroll" },
          { label: "Loans" },
        ]}
        title="Loans & Salary Advances"
        description="Manage employee loans, salary advances, and monthly recovery deductions."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={loadPolicy}>
              <Icon name="policy" className="text-[18px]" />
              Policy Limits
            </Button>
            <Button onClick={openCreate}>
              <Icon name="add" className="text-[18px]" />
              New Loan
            </Button>
            <Button onClick={() => window.location.assign("/requests/new/form?category=loan")}>
              New Loan Request
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Active Loans" value={String(activeLoansCount)} tone="success" icon="payments" />
          <StatCard label="Total Disbursed" value={formatCurrency(totalPrincipal)} tone="neutral" icon="monetization_on" />
          <StatCard label="Outstanding Balance" value={formatCurrency(totalOutstanding)} tone="warning" icon="account_balance" />
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex-1 min-w-[200px]">
            <SelectField label="Loan Type" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="loan">Loans</option>
              <option value="salary_advance">Salary Advances</option>
            </SelectField>
          </div>
          <div className="flex-1 min-w-[200px]">
            <SelectField label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </SelectField>
          </div>
        </div>

        <SectionCard
          title="All Loans"
          description="Employee and consultant loan recovery ledger."
        >
          {loading ? (
            <div className="text-sm text-slate-500 py-4">Loading loans ledger...</div>
          ) : loans.length ? (
            <DataTable
              columns={[
                { header: "Worker", cell: (l: PayrollLoan) => <p className="font-semibold text-slate-900">{l.worker?.full_name || "Unknown Worker"}</p> },
                { header: "Request", cell: (l: PayrollLoan) => l.request_id ? (
                  <a href={`/requests/details?id=${l.request_id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <Icon name="link" className="text-[12px]" /> #{l.request_id}
                  </a>
                ) : <span className="text-xs text-slate-400">—</span> },
                { header: "Title", cell: (l: PayrollLoan) => <p className="font-medium text-slate-800">{l.title}</p> },
                { header: "Type", className: "capitalize", cell: (l: PayrollLoan) => (
                  <Chip variant={l.loan_type === "loan" ? "pending" : "neutral"}>
                    {l.loan_type === "loan" ? "Loan" : "Advance"}
                  </Chip>
                ) },
                { header: "Principal", cell: (l: PayrollLoan) => formatCurrency(l.principal_amount) },
                { header: "Outstanding", className: "font-semibold text-slate-900", cell: (l: PayrollLoan) => formatCurrency(l.outstanding_amount ?? 0) },
                { header: "Monthly Repayment", cell: (l: PayrollLoan) => formatCurrency(l.monthly_recovery_amount ?? 0) },
                { header: "Start Month", cell: (l: PayrollLoan) => l.start_recovery_date ? new Date(l.start_recovery_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "-" },
                { header: "Status", cell: (l: PayrollLoan) => (
                  <Chip variant={l.status === "active" ? "success" : l.status === "paused" ? "warning" : "neutral"}>
                    {l.status}
                  </Chip>
                ) },
                { header: "Actions", className: "text-right", cell: (l: PayrollLoan) => (
                  <div className="relative flex justify-end" ref={openMenuId === l.id ? menuRef : undefined}>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900/20"
                      onClick={() => setOpenMenuId(openMenuId === l.id ? null : l.id)}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === l.id}
                      aria-label="Loan actions"
                    >
                      <Icon name="more_vert" />
                    </button>

                    {openMenuId === l.id && (
                      <div
                        role="menu"
                        aria-label="Loan actions"
                        className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 rounded-2xl border border-slate-200 bg-white py-2 shadow-card"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => { closeMenu(); setViewingLoan(l); }}
                        >
                          <Icon name="history" className="text-[18px] text-slate-500" />
                          View Repayments
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => { closeMenu(); setRepayingLoan(l); setManualRepaymentAmount(""); setManualRepaymentNotes(""); }}
                        >
                          <Icon name="payments" className="text-[18px] text-slate-500" />
                          Log Repayment
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => { closeMenu(); openEdit(l); }}
                        >
                          <Icon name="edit" className="text-[18px] text-slate-500" />
                          Edit Loan
                        </button>
                        {l.status === "active" && (
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-orange-600 transition hover:bg-orange-50"
                            onClick={() => { closeMenu(); void handleStatusChange(l, "paused"); }}
                          >
                            <Icon name="pause" className="text-[18px]" />
                            Pause Recovery
                          </button>
                        )}
                        {l.status === "paused" && (
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-green-600 transition hover:bg-green-50"
                            onClick={() => { closeMenu(); void handleStatusChange(l, "active"); }}
                          >
                            <Icon name="play_arrow" className="text-[18px]" />
                            Resume Recovery
                          </button>
                        )}
                        {l.status !== "closed" && (
                          <>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                              onClick={() => { closeMenu(); void handleStatusChange(l, "closed"); }}
                            >
                              <Icon name="check_circle" className="text-[18px]" />
                              Close / Settle Loan
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) },
              ]}
              data={loans}
            />
          ) : (
            <EmptyState
              title="No loans registered"
              description="No loans or advances found matching filters."
              action={
                <Button onClick={openCreate}>
                  <Icon name="add" className="text-[18px]" />
                  New Loan
                </Button>
              }
            />
          )}
        </SectionCard>
      </div>

      {/* SlideOver for create / edit */}
      <SlideOver open={showSlideOver} onClose={() => setShowSlideOver(false)} size="md">
        <SlideOverHeader
          title={editingLoan ? "Edit Loan Details" : "New Loan Setup"}
          subtitle="Configure loan principal, recovery schedule, and notes."
          onClose={() => setShowSlideOver(false)}
        />
        <SlideOverContent>
          <div className="grid gap-4">
            <SelectField
              label="Worker Name"
              value={form.worker_id}
              onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
              disabled={!!editingLoan}
            >
              <option value="">Select worker</option>
              {workers.map((w: PayrollWorker) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.worker_type})
                </option>
              ))}
            </SelectField>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Type"
                value={form.loan_type}
                onChange={(e) => setForm({ ...form, loan_type: e.target.value as any })}
              >
                <option value="loan">Loan</option>
                <option value="salary_advance">Salary Advance</option>
              </SelectField>
              <TextField
                label="Loan Title / Code"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Car Loan 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Principal Amount"
                type="number"
                value={form.principal_amount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm({ ...form, principal_amount: val });
                }}
                placeholder="0.00"
              />
              <TextField
                label="Monthly Recovery Deduction"
                type="number"
                value={form.monthly_recovery_amount ?? 0}
                onChange={(e) => setForm({ ...form, monthly_recovery_amount: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Issue Date"
                type="date"
                value={form.issued_date}
                onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
              />
              <TextField
                label="Deductions Start Month"
                type="date"
                value={form.start_recovery_date}
                onChange={(e) => setForm({ ...form, start_recovery_date: e.target.value })}
              />
            </div>

            <TextField
              label="Notes / Explanation"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detailed reasons or specifications..."
            />

            {editingLoan && (
              <SelectField
                label="Status"
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </SelectField>
            )}
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowSlideOver(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Loan"}
            </Button>
          </div>
        </SlideOverFooter>
      </SlideOver>

      {/* SlideOver for view history */}
      <SlideOver open={!!viewingLoan} onClose={() => setViewingLoan(null)} size="md">
        <SlideOverHeader
          title="Loan Repayment Ledger"
          subtitle={`History of recoveries for: ${viewingLoan?.worker?.full_name || "Worker"}`}
          onClose={() => setViewingLoan(null)}
        />
        <SlideOverContent>
          {viewingLoan && (
            <div className="grid gap-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Loan Summary</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-500">Title:</p>
                  <p className="font-semibold text-slate-900 text-right">{viewingLoan.title}</p>
                  
                  <p className="font-medium text-slate-500">Principal Amount:</p>
                  <p className="font-semibold text-slate-900 text-right">{formatCurrency(viewingLoan.principal_amount)}</p>

                  <p className="font-medium text-slate-500">Outstanding Balance:</p>
                  <p className="font-semibold text-slate-900 text-right text-orange-600">{formatCurrency(viewingLoan.outstanding_amount)}</p>

                  <p className="font-medium text-slate-500">Monthly Deduction:</p>
                  <p className="font-semibold text-slate-900 text-right">{formatCurrency(viewingLoan.monthly_recovery_amount ?? 0)}</p>

                  <p className="font-medium text-slate-500">Recovery Start Date:</p>
                  <p className="font-semibold text-slate-900 text-right">
                    {new Date(viewingLoan.start_recovery_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Repayment History</h4>
                {viewingLoan.repayments && viewingLoan.repayments.length > 0 ? (
                  <DataTable
                    columns={[
                      { header: "Date", cell: (rep: any) => new Date(rep.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) },
                      { header: "Amount Recovered", className: "font-semibold text-slate-900", cell: (rep: any) => formatCurrency(rep.amount) },
                      { header: "Status", cell: (rep: any) => <Chip variant="success">{rep.status}</Chip> },
                    ]}
                    data={viewingLoan.repayments}
                  />
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center">
                    No recovery repayments recorded yet. Recovery will start in the first payroll run on or after the start month.
                  </p>
                )}
              </div>
            </div>
          )}
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex justify-end w-full">
            <Button onClick={() => setViewingLoan(null)}>Close</Button>
          </div>
        </SlideOverFooter>
      </SlideOver>

      {/* SlideOver for manual repayment */}
      <SlideOver open={!!repayingLoan} onClose={() => setRepayingLoan(null)} size="sm">
        <SlideOverHeader
          title="Log Manual Repayment"
          subtitle={`For: ${repayingLoan?.worker?.full_name || "Worker"} (Outstanding: ${formatCurrency(repayingLoan?.outstanding_amount ?? 0)})`}
          onClose={() => setRepayingLoan(null)}
        />
        <SlideOverContent>
          <div className="grid gap-4 mt-2">
            <TextField
              label="Repayment Amount"
              type="number"
              value={manualRepaymentAmount}
              onChange={(e) => setManualRepaymentAmount(e.target.value)}
              placeholder="0.00"
            />
            <TextAreaField
              label="Repayment Notes"
              value={manualRepaymentNotes}
              onChange={(e) => setManualRepaymentNotes(e.target.value)}
              placeholder="E.g., Bank transfer on 15th Jan..."
            />
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setRepayingLoan(null)}>Cancel</Button>
            <Button onClick={handleLogRepayment} disabled={saving}>
              {saving ? "Saving..." : "Log Repayment"}
            </Button>
          </div>
        </SlideOverFooter>
      </SlideOver>

      {/* SlideOver for policy configuration */}
      <SlideOver open={showPolicyEditor} onClose={() => setShowPolicyEditor(false)} size="sm">
        <SlideOverHeader
          title="Policy Limits"
          subtitle="Configure maximum loan limits and durations across the organization."
          onClose={() => setShowPolicyEditor(false)}
        />
        <SlideOverContent>
          <div className="grid gap-4 mt-2">
            <TextField
              label="Max Principal Amount (NGN)"
              type="number"
              value={policyLoanMaxPrincipal}
              onChange={(e) => setPolicyLoanMaxPrincipal(e.target.value)}
              placeholder="Leave blank for no limit"
            />
            <TextField
              label="Max Repayment Duration (Months)"
              type="number"
              value={policyLoanMaxDuration}
              onChange={(e) => setPolicyLoanMaxDuration(e.target.value)}
              placeholder="Leave blank for no limit"
            />
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowPolicyEditor(false)}>Cancel</Button>
            <Button onClick={handleSavePolicy} disabled={saving}>
              {saving ? "Saving..." : "Save Policy"}
            </Button>
          </div>
        </SlideOverFooter>
      </SlideOver>
    </AppShell>
  );
}
