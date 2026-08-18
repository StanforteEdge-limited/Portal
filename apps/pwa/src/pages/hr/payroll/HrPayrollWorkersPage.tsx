import { useState } from "react";
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
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { hrApi } from "@/shared/lib/core";
import { resourceApi, financeApi } from "@/shared/lib/core";
import {
  listPayrollWorkers,
  createPayrollWorker,
  updatePayrollWorker,
  deletePayrollWorker,
  listPayrollComponents,
  listPayrollTaxTables,
  type PayrollWorker,
  type PayrollComponent,
  type UpsertWorkerPayload,
} from "@/shared/api/payroll-api";

let _profileComponentKey = 0;
function nextPcKey() {
  return ++_profileComponentKey;
}

function formatPayBasis(value?: string | null) {
  switch (value) {
    case "monthly_fixed":
      return "Monthly Fixed";
    case "hourly_timesheet":
      return "Hourly / Timesheet";
    case "daily_rate":
      return "Daily Rate";
    case "retainer":
      return "Retainer";
    case "manual":
      return "Manual";
    default:
      return value ?? "-";
  }
}

function readableWorkerError(message: string) {
  if (message.includes("profile.base_amount")) {
    return "Base amount must be a valid number greater than or equal to 0.";
  }
  return message;
}

function isWithholdingComponent(component?: PayrollComponent | null) {
  if (!component) return false;
  const code = String(component.code ?? "").toLowerCase();
  const name = String(component.name ?? "").toLowerCase();
  return code === "withholding_tax" || name.includes("withholding");
}

const EMPTY_FORM: UpsertWorkerPayload = {
  full_name: "",
  worker_type: "employee",
  email: "",
  staff_code: "",
  currency: "NGN",
  status: "active",
  pay_basis: "monthly_fixed",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  tax_identifier: "",
  pension_identifier: "",
  start_date: "",
};

export default function HrPayrollWorkersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [listKey, setListKey] = useState(0);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingWorker, setEditingWorker] = useState<PayrollWorker | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpsertWorkerPayload>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editorStep, setEditorStep] = useState<"identity" | "pay" | "allocation" | "compliance">("identity");
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [baseAmount, setBaseAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [standardHours, setStandardHours] = useState("8");
  const [profileComponents, setProfileComponents] = useState<
    Array<{ component_id: string; amount: string; rate: string; formula: string; _key: number }>
  >([]);
  const [allocationMode, setAllocationMode] = useState("fixed");
  const [hybridFixedPercent, setHybridFixedPercent] = useState("0");
  const [defaultFundId, setDefaultFundId] = useState("");
  const [defaultGrantId, setDefaultGrantId] = useState("");
  const [allocations, setAllocations] = useState<Array<{ _key: number; org_id: string; team_id: string; project_id: string; fund_id: string; grant_id: string; percent: string }>>([
    { _key: nextPcKey(), org_id: "", team_id: "", project_id: "", fund_id: "", grant_id: "", percent: "100" },
  ]);
  const [applyTax, setApplyTax] = useState(true);
  const [applyPension, setApplyPension] = useState(true);
  const [employerCoversPaye, setEmployerCoversPaye] = useState(false);
  const [taxTableId, setTaxTableId] = useState("");
  const [taxTables, setTaxTables] = useState<any[]>([]);
  const [pensionRate, setPensionRate] = useState("");
  const [withholdingRate, setWithholdingRate] = useState("");
  const [consultantPensionRate, setConsultantPensionRate] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: workersResp, loading } = useCachedQuery(
    `hr:payroll:workers:${listKey}`,
    () => listPayrollWorkers({ per_page: 200 }),
    { ttlMs: 0, storage: "memory" },
  );

  const workers = workersResp?.items ?? [];
  const activeWorkers = workers.filter((w: any) => (w.status ?? "active") === "active").length;
  const employees = workers.filter((w: any) => w.worker_type === "employee").length;
  const consultants = workers.filter((w: any) => w.worker_type === "consultant").length;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  const openCreate = () => {
    setEditingWorker(null);
    setForm(EMPTY_FORM);
    setSearchQuery("");
    setSearchResults([]);
    setEditorStep("identity");
    setBaseAmount("");
    setEffectiveFrom("");
    setEffectiveTo("");
    setPaymentMode("bank_transfer");
    setStandardHours("8");
    setProfileComponents([]);
    setAllocationMode("fixed");
    setHybridFixedPercent("0");
    setDefaultFundId("");
    setDefaultGrantId("");
    setAllocations([{ _key: nextPcKey(), org_id: "", team_id: "", project_id: "", fund_id: "", grant_id: "", percent: "100" }]);
    setApplyTax(true);
    setApplyPension(true);
    setEmployerCoversPaye(false);
    setTaxTableId("");
    setPensionRate("");
    setWithholdingRate("");
    setConsultantPensionRate("");
    setShowSlideOver(true);
    listPayrollComponents().then((r) => setComponents(r.items)).catch(() => showToast({ tone: "danger", title: "Error", message: "Failed to load payroll components." }));
    listPayrollTaxTables().then((r) => setTaxTables(r.items)).catch(() => {});
    Promise.allSettled([
      resourceApi.listOrganizations(),
      resourceApi.listGroups({ active_only: true }),
      resourceApi.listProjects({ active_only: true }),
      financeApi.listFunds(),
      financeApi.listGrants(),
    ]).then(([orgs, tms, projs, fds, grnts]) => {
      if (orgs.status === "fulfilled") setOrganizations(orgs.value);
      if (tms.status === "fulfilled") setTeams(tms.value);
      if (projs.status === "fulfilled") setProjects(projs.value);
      if (fds.status === "fulfilled") setFunds(fds.value);
      if (grnts.status === "fulfilled") setGrants(grnts.value);
    });
  };

  const handleEmployeeSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await hrApi.listEmployees({ search: query, status: "active", per_page: 10 });
      setSearchResults(result.result ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectEmployee = (emp: any) => {
    setForm((f) => ({
      ...f,
      full_name: emp.full_name ?? emp.name ?? emp.first_name + " " + emp.last_name,
      email: emp.email ?? "",
      staff_code: emp.staff_code ?? emp.code ?? "",
    }));
    setSearchQuery("");
    setSearchResults([]);
  };

  const openEdit = (w: any) => {
    setEditingWorker(w);
    setForm({
      full_name: w.full_name ?? w.name ?? "",
      worker_type: w.worker_type ?? "employee",
      email: w.email ?? "",
      staff_code: w.staff_code ?? "",
      currency: w.currency ?? "NGN",
      status: w.status ?? "active",
      pay_basis: w.pay_basis ?? "monthly_fixed",
      bank_name: w.bank_name ?? "",
      bank_account_name: w.bank_account_name ?? "",
      bank_account_number: w.bank_account_number ?? "",
      tax_identifier: w.tax_identifier ?? "",
      pension_identifier: w.pension_identifier ?? "",
      start_date: w.start_date ?? "",
      end_date: w.end_date ?? "",
    });
    // Populate pay profile from first active profile
    const profile = w.profiles?.[0] || null;
    setBaseAmount(profile?.base_amount != null ? String(profile.base_amount) : "");
    setEffectiveFrom(profile?.effective_from ? String(profile.effective_from).slice(0, 10) : "");
    setEffectiveTo(profile?.effective_to ? String(profile.effective_to).slice(0, 10) : "");
    setPaymentMode(profile?.payment_mode || "bank_transfer");
    setStandardHours(w.standard_hours_per_day != null ? String(w.standard_hours_per_day) : "8");
    setProfileComponents(
      profile?.components?.map((c: any, i: number) => ({
        component_id: c.component_id,
        amount: String(c.amount ?? ""),
        rate: c.rate != null ? String(c.rate) : "",
        formula: c.formula || "",
        _key: nextPcKey(),
      })) || [],
    );
    setAllocationMode(w.allocation_mode || "fixed");
    setHybridFixedPercent(w.hybrid_fixed_percent != null ? String(w.hybrid_fixed_percent) : "0");
    setDefaultFundId(w.default_fund_id || "");
    setDefaultGrantId(w.default_grant_id || "");
    setAllocations(
      w.allocations?.length > 0
        ? w.allocations.map((a: any) => ({
            _key: nextPcKey(),
            org_id: a.organization_id || "",
            team_id: a.team_id || "",
            project_id: a.project_id || "",
            fund_id: a.fund_id || "",
            grant_id: a.grant_id || "",
            percent: String(a.allocation_percent ?? "0"),
          }))
        : [{ _key: nextPcKey(), org_id: "", team_id: "", project_id: "", fund_id: "", grant_id: "", percent: "100" }],
    );
    setApplyTax(w.metadata?.apply_tax !== false);
    setApplyPension(w.metadata?.apply_pension !== false);
    setEmployerCoversPaye(w.metadata?.employer_covers_paye === true);
    setTaxTableId(w.tax_table_id || "");
    setPensionRate(w.metadata?.pension_rate != null ? String(w.metadata.pension_rate) : "");
    setWithholdingRate(w.metadata?.withholding_rate != null ? String(w.metadata.withholding_rate) : "");
    setConsultantPensionRate(w.metadata?.consultant_pension_rate != null ? String(w.metadata.consultant_pension_rate) : "");
    setEditorStep("identity");
    setShowSlideOver(true);
    listPayrollComponents().then((r) => setComponents(r.items)).catch(() => showToast({ tone: "danger", title: "Error", message: "Failed to load payroll components." }));
    listPayrollTaxTables().then((r) => setTaxTables(r.items)).catch(() => {});
    Promise.allSettled([
      resourceApi.listOrganizations(),
      resourceApi.listGroups({ active_only: true }),
      resourceApi.listProjects({ active_only: true }),
      financeApi.listFunds(),
      financeApi.listGrants(),
    ]).then(([orgs, tms, projs, fds, grnts]) => {
      if (orgs.status === "fulfilled") setOrganizations(orgs.value);
      if (tms.status === "fulfilled") setTeams(tms.value);
      if (projs.status === "fulfilled") setProjects(projs.value);
      if (fds.status === "fulfilled") setFunds(fds.value);
      if (grnts.status === "fulfilled") setGrants(grnts.value);
    });
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter the worker's full name." });
      return;
    }
    setSaving(true);
    try {
      const componentRows = profileComponents
        .filter((pc) => pc.component_id)
        .map((pc) => {
          const c = components.find((x) => x.id === pc.component_id);
          const calcType = c?.calculation_type ?? "fixed";
          return {
            component_id: pc.component_id,
            amount: calcType === "fixed" && pc.amount !== "" ? Number(pc.amount) : undefined,
            rate: calcType === "percentage" && pc.rate !== "" ? Number(pc.rate) : undefined,
            formula: calcType === "formula" && pc.formula?.trim() ? pc.formula.trim() : undefined,
          };
        })
        .filter((pc) => pc.amount !== undefined || pc.rate !== undefined || pc.formula);

      const hasWithholdingComponent = profileComponents.some((pc) => {
        const component = components.find((x) => x.id === pc.component_id);
        return isWithholdingComponent(component);
      });

      if ((form.worker_type ?? "employee") === "consultant" && withholdingRate && hasWithholdingComponent) {
        showToast({
          tone: "danger",
          title: "Choose one WHT method",
          message: "Use either Withholding Rate Override or a recurring Withholding Tax component for this consultant, not both.",
        });
        setSaving(false);
        return;
      }

      const hasProfileFields = baseAmount || effectiveFrom || componentRows.length > 0;

      const payload: UpsertWorkerPayload = {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email?.trim() || undefined,
        staff_code: form.staff_code?.trim() || undefined,
        bank_name: form.bank_name?.trim() || undefined,
        bank_account_name: form.bank_account_name?.trim() || undefined,
        bank_account_number: form.bank_account_number?.trim() || undefined,
        tax_identifier: form.tax_identifier?.trim() || undefined,
        pension_identifier: form.pension_identifier?.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        standard_hours_per_day: standardHours ? Number(standardHours) : undefined,
        ...(hasProfileFields
          ? {
              profile: {
                effective_from: effectiveFrom || new Date().toISOString().slice(0, 10),
                ...(effectiveTo ? { effective_to: effectiveTo } : {}),
                ...(baseAmount ? { base_amount: Number(baseAmount) } : {}),
                payment_mode: paymentMode,
                pay_frequency: "monthly",
                ...(componentRows.length > 0 ? { components: componentRows } : {}),
              },
            }
          : {}),
        allocation_mode: allocationMode,
        ...(allocationMode === "hybrid" ? { hybrid_fixed_percent: Number(hybridFixedPercent || 0) } : {}),
        ...(defaultFundId ? { default_fund_id: defaultFundId } : {}),
        ...(defaultGrantId ? { default_grant_id: defaultGrantId } : {}),
        allocations: allocations
          .filter((a) => (a.org_id || a.team_id || a.project_id || a.fund_id || a.grant_id) && Number(a.percent || 0) > 0)
          .map((a) => ({
            ...(a.org_id ? { organization_id: a.org_id } : {}),
            ...(a.team_id ? { team_id: a.team_id } : {}),
            ...(a.project_id ? { project_id: a.project_id } : {}),
            ...(a.fund_id ? { fund_id: a.fund_id } : {}),
            ...(a.grant_id ? { grant_id: a.grant_id } : {}),
            allocation_percent: Number(a.percent || 0),
          })),
        tax_table_id: taxTableId || undefined,
        metadata: {
          apply_tax: applyTax,
          apply_pension: applyPension,
          employer_covers_paye: employerCoversPaye,
          ...(pensionRate ? { pension_rate: Number(pensionRate) } : {}),
          ...(withholdingRate ? { withholding_rate: Number(withholdingRate) } : {}),
          ...(consultantPensionRate ? { consultant_pension_rate: Number(consultantPensionRate) } : {}),
        },
      };
      if (editingWorker) {
        await updatePayrollWorker(String((editingWorker as any).id), payload);
        showToast({ tone: "success", title: "Updated", message: `${form.full_name} updated successfully.` });
      } else {
        await createPayrollWorker(payload);
        showToast({ tone: "success", title: "Created", message: `${form.full_name} added as a payroll worker.` });
      }
      setShowSlideOver(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? readableWorkerError(err.message) : "Unable to save worker." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete payroll worker "${name}"? This can only be done if they have no active run history.`)) return;
    setDeletingId(id);
    try {
      await deletePayrollWorker(id);
      showToast({ tone: "success", title: "Deleted", message: `${name} removed.` });
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Delete failed", message: err instanceof Error ? err.message : "Unable to delete worker." });
    } finally {
      setDeletingId(null);
    }
  };

  const setField = (key: keyof UpsertWorkerPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-payroll-workers"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "HR", path: "/hr" },
          { label: "Payroll", path: "/hr/payroll" },
          { label: "Workers" },
        ]}
        title="Payroll Workers"
        description="Employee and consultant payroll profiles — salary basis, bank details, and tax identifiers."
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" className="text-[18px]" />
            Add Worker
          </Button>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Active Workers" value={String(activeWorkers)} tone="success" icon="group" />
          <StatCard label="Employees" value={String(employees)} tone="neutral" icon="badge" />
          <StatCard label="Consultants" value={String(consultants)} tone="neutral" icon="work" />
        </div>

        <SectionCard
          title="All Workers"
          description="All registered payroll profiles."
          action={
            workers.length > 0 ? (
              <Button size="sm" onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Add Worker
              </Button>
            ) : undefined
          }
        >
          {loading ? (
            <div className="text-sm text-slate-500">Loading workers...</div>
          ) : workers.length ? (
            <DataTable
              columns={[
                { header: "Name", cell: (w: any) => (
                  <>
                    <p className="font-semibold text-slate-900">{w.full_name ?? w.name}</p>
                    {w.staff_code ? <p className="text-xs text-slate-500">{w.staff_code}</p> : null}
                  </>
                ) },
                { header: "Email", cell: (w: any) => w.email ?? "-" },
                { header: "Type", className: "capitalize", cell: (w: any) => w.worker_type },
                { header: "Pay Basis", className: "text-slate-600", cell: (w: any) => formatPayBasis(w.pay_basis) },
                { header: "Currency", cell: (w: any) => w.currency ?? "NGN" },
                { header: "Bank", cell: (w: any) => w.bank_name ? `${w.bank_name}${w.bank_account_number ? ` ···${String(w.bank_account_number).slice(-4)}` : ""}` : "-" },
                { header: "Status", cell: (w: any) => (
                  <Chip variant={(w.status ?? "active") === "active" ? "success" : "neutral"}>
                    {w.status ?? "active"}
                  </Chip>
                ) },
                { header: "Actions", className: "text-right", cell: (w: any) => (
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                      <Icon name="edit" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(w.id, w.full_name ?? w.name)}
                      disabled={deletingId === w.id}
                    >
                      <Icon name={deletingId === w.id ? "hourglass_top" : "delete"} />
                    </Button>
                  </div>
                ) },
              ]}
              data={workers}
            />
          ) : (
            <EmptyState
              title="No workers registered"
              description="Add workers to include them in payroll runs."
              action={<Button onClick={openCreate}><Icon name="add" className="text-[18px]" />Add Worker</Button>}
            />
          )}
        </SectionCard>
      </div>

      <SlideOver open={showSlideOver} onClose={() => setShowSlideOver(false)} size="xxl">
        <SlideOverHeader
          title={editingWorker ? "Edit Worker" : "Add Payroll Worker"}
          subtitle="Set up the worker's payroll profile, bank details, and identifiers."
          onClose={() => setShowSlideOver(false)}
        />
        <SlideOverContent>
          <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
            {[
              { id: "identity" as const, label: "Identity" },
              { id: "pay" as const, label: "Pay Profile" },
              { id: "allocation" as const, label: "Allocation" },
              { id: "compliance" as const, label: "Compliance" },
            ].map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setEditorStep(s.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  editorStep === s.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    editorStep === s.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {i + 1}
                </span>
                {s.label}
              </button>
            ))}
          </div>

          {editorStep === "identity" ? (
            <div className="grid gap-4">
              {!editingWorker && (
                <div className="relative">
                  <TextField
                    label="Search Employee"
                    value={searchQuery}
                    onChange={(e) => void handleEmployeeSearch(e.target.value)}
                    placeholder="Type to search employees..."
                    helpText={searching ? "Searching..." : ""}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                      {searchResults.map((emp: any) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                          onClick={() => selectEmployee(emp)}
                        >
                          <span className="text-sm font-medium text-slate-900">
                            {emp.full_name ?? emp.name ?? `${emp.first_name} ${emp.last_name}`}
                          </span>
                          <span className="text-xs text-slate-500">{emp.email} {emp.staff_code ? `· ${emp.staff_code}` : ""}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <TextField label="Full Name" value={form.full_name} onChange={setField("full_name")} placeholder="e.g. Jane Doe" />
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Worker Type" value={form.worker_type} onChange={setField("worker_type")}>
                  <option value="employee">Employee</option>
                  <option value="consultant">Consultant</option>
                </SelectField>
                <SelectField label="Status" value={form.status ?? "active"} onChange={setField("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </SelectField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Email" type="email" value={form.email ?? ""} onChange={setField("email")} placeholder="jane@company.com" />
                <TextField label="Staff Code" value={form.staff_code ?? ""} onChange={setField("staff_code")} placeholder="EMP-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Pay Basis" value={form.pay_basis ?? "monthly_fixed"} onChange={setField("pay_basis")}>
                  <option value="monthly_fixed">Monthly Fixed</option>
                  <option value="hourly_timesheet">Hourly / Timesheet</option>
                  <option value="daily_rate">Daily Rate</option>
                  <option value="retainer">Retainer</option>
                  <option value="manual">Manual</option>
                </SelectField>
                <TextField label="Currency" value={form.currency ?? "NGN"} onChange={setField("currency")} placeholder="NGN" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Start Date" type="date" value={form.start_date ?? ""} onChange={setField("start_date")} />
                <TextField label="End Date" type="date" value={form.end_date ?? ""} onChange={setField("end_date")} />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 pt-2">Bank Details</p>
              <TextField label="Bank Name" value={form.bank_name ?? ""} onChange={setField("bank_name")} placeholder="e.g. First Bank" />
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Account Name" value={form.bank_account_name ?? ""} onChange={setField("bank_account_name")} />
                <TextField label="Account Number" value={form.bank_account_number ?? ""} onChange={setField("bank_account_number")} />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 pt-2">Tax & Pension</p>
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Tax ID (TIN)" value={form.tax_identifier ?? ""} onChange={setField("tax_identifier")} />
                <TextField label="Pension ID (PFA)" value={form.pension_identifier ?? ""} onChange={setField("pension_identifier")} />
              </div>
            </div>
          ) : null}

          {editorStep === "pay" ? (
            <div className="grid gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pay Profile</p>
              <div className="rounded-lg border border-slate-200 p-4 grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label={
                      form.pay_basis === "hourly_timesheet"
                        ? "Hourly Rate"
                        : form.pay_basis === "daily_rate"
                        ? "Daily Rate"
                        : "Base Amount"
                    }
                    type="number"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <SelectField label="Payment Mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="mobile_money">Mobile Money</option>
                  </SelectField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Effective From" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                  <TextField label="Effective To" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} helpText="Optional — leave blank if ongoing" />
                </div>
                {["hourly_timesheet", "daily_rate"].includes(form.pay_basis ?? "") ? (
                  <TextField
                    label="Standard Hours Per Day"
                    type="number"
                    value={standardHours}
                    onChange={(e) => setStandardHours(e.target.value)}
                    helpText="Used to calculate workdays from timesheet hours"
                  />
                ) : null}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 pt-2">Recurring Components</p>
              <div className="rounded-lg border border-slate-200 p-4 grid gap-3">
                {profileComponents.length === 0 ? (
                  <p className="text-sm text-slate-500">No recurring components yet.</p>
                ) : (
                  profileComponents.map((pc, idx) => (
                    <div key={pc._key} className="grid grid-cols-12 gap-3 rounded border border-slate-100 bg-slate-50 p-3">
                      <div className="col-span-12 md:col-span-5">
                        <SelectField
                          label="Component"
                          value={pc.component_id}
                          onChange={(e) => {
                            const updated = [...profileComponents];
                            updated[idx] = { ...updated[idx], component_id: e.target.value };
                            setProfileComponents(updated);
                          }}
                        >
                          <option value="">Select component</option>
                          {components.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </SelectField>
                        {pc.component_id ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {(() => {
                              const c = components.find((x) => x.id === pc.component_id);
                              if (!c) return "";
                              return `${c.component_type.replace("_", " ")} · ${c.calculation_type.replace("_", " ")}`;
                            })()}
                          </p>
                        ) : null}
                      </div>
                      <div className="col-span-8 md:col-span-6">
                        {(() => {
                          const c = components.find((x) => x.id === pc.component_id);
                          const calcType = c?.calculation_type ?? "fixed";
                          if (calcType === "fixed") {
                            return (
                              <TextField
                                label="Amount"
                                type="number"
                                value={pc.amount}
                                onChange={(e) => {
                                  const updated = [...profileComponents];
                                  updated[idx] = { ...updated[idx], amount: e.target.value };
                                  setProfileComponents(updated);
                                }}
                                placeholder="0.00"
                              />
                            );
                          }
                          if (calcType === "percentage") {
                            return (
                              <TextField
                                label="Rate (%)"
                                type="number"
                                value={pc.rate}
                                onChange={(e) => {
                                  const updated = [...profileComponents];
                                  updated[idx] = { ...updated[idx], rate: e.target.value };
                                  setProfileComponents(updated);
                                }}
                                placeholder="e.g. 10"
                              />
                            );
                          }
                          return (
                            <TextField
                              label="Formula"
                              value={pc.formula}
                              onChange={(e) => {
                                const updated = [...profileComponents];
                                updated[idx] = { ...updated[idx], formula: e.target.value };
                                setProfileComponents(updated);
                              }}
                              placeholder="Optional formula expression"
                            />
                          );
                        })()}
                      </div>
                      <div className="col-span-4 md:col-span-1 flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProfileComponents(profileComponents.filter((_, i) => i !== idx))}
                        >
                          <Icon name="delete" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setProfileComponents([...profileComponents, { component_id: "", amount: "", rate: "", formula: "", _key: nextPcKey() }])
                  }
                >
                  <Icon name="add" className="text-[18px]" />
                  Add Component
                </Button>
              </div>
            </div>
          ) : null}
          {/* Step 3: Allocation */}
          {editorStep === "allocation" ? (
            <div className="grid gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost Allocation</p>
              <div className="rounded-lg border border-slate-200 p-4 grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <SelectField label="Allocation Mode" value={allocationMode} onChange={(e) => setAllocationMode(e.target.value)}>
                      <option value="fixed">Fixed Allocation</option>
                      <option value="timesheet">Timesheet Driven</option>
                      <option value="hybrid">Hybrid Fixed + Timesheet</option>
                    </SelectField>
                    <p className="mt-1 text-xs text-slate-500">
                      {allocationMode === "fixed"
                        ? "Uses the worker allocation rows directly."
                        : allocationMode === "timesheet"
                        ? "Reads approved project/fund/grant time splits from the payroll run."
                        : "Blends fixed allocation with timesheet splits using the fixed share percentage."}
                    </p>
                  </div>
                  {allocationMode === "hybrid" ? (
                    <TextField
                      label="Fixed Allocation Share %"
                      type="number"
                      value={hybridFixedPercent}
                      onChange={(e) => setHybridFixedPercent(e.target.value)}
                    />
                  ) : null}
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Default Fund & Grant</p>
              <div className="rounded-lg border border-slate-200 p-4 grid grid-cols-2 gap-4">
                <SelectField label="Default Fund" value={defaultFundId} onChange={(e) => setDefaultFundId(e.target.value)}>
                  <option value="">No default fund</option>
                  {funds.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </SelectField>
                <SelectField label="Default Grant" value={defaultGrantId} onChange={(e) => setDefaultGrantId(e.target.value)}>
                  <option value="">No default grant</option>
                  {grants.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </SelectField>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allocation Breakdown</p>
              <div className="rounded-lg border border-slate-200 p-4 grid gap-3">
                {allocations.map((row) => (
                  <div key={row._key} className="grid grid-cols-12 gap-3 rounded border border-slate-100 bg-slate-50 p-3">
                    <div className="col-span-12 md:col-span-2">
                      <SelectField label="Organization" value={row.org_id} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], org_id: e.target.value };
                        setAllocations(updated);
                      }}>
                        <option value="">Select</option>
                        {organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </SelectField>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <SelectField label="Team" value={row.team_id} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], team_id: e.target.value };
                        setAllocations(updated);
                      }}>
                        <option value="">Select</option>
                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </SelectField>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <SelectField label="Project" value={row.project_id} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], project_id: e.target.value };
                        setAllocations(updated);
                      }}>
                        <option value="">Select</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </SelectField>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <SelectField label="Fund" value={row.fund_id} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], fund_id: e.target.value };
                        setAllocations(updated);
                      }}>
                        <option value="">Select</option>
                        {funds.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </SelectField>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <SelectField label="Grant" value={row.grant_id} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], grant_id: e.target.value };
                        setAllocations(updated);
                      }}>
                        <option value="">Select</option>
                        {grants.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </SelectField>
                    </div>
                    <div className="col-span-10 md:col-span-1">
                      <TextField label="%" type="number" value={row.percent} onChange={(e) => {
                        const updated = [...allocations];
                        const idx = allocations.findIndex((r) => r._key === row._key);
                        updated[idx] = { ...updated[idx], percent: e.target.value };
                        setAllocations(updated);
                      }} />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setAllocations(allocations.filter((r) => r._key !== row._key))}>
                        <Icon name="delete" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Total: {allocations.reduce((sum, r) => sum + Number(r.percent || 0), 0)}%
                  </span>
                  <Button variant="secondary" size="sm" onClick={() =>
                    setAllocations([...allocations, { _key: nextPcKey(), org_id: "", team_id: "", project_id: "", fund_id: "", grant_id: "", percent: "0" }])
                  }>
                    <Icon name="add" className="text-[18px]" />
                    Add Row
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {/* Step 4: Compliance */}
          {editorStep === "compliance" ? (
            <div className="grid gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Statutory Overrides</p>
              <p className="text-xs text-slate-500">Only change these when a worker should not use the global payroll settings.</p>
              <div className="rounded-lg border border-slate-200 p-4 grid gap-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} />
                    Apply Tax
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={applyPension} onChange={(e) => setApplyPension(e.target.checked)} />
                    Apply Pension
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={employerCoversPaye} onChange={(e) => setEmployerCoversPaye(e.target.checked)} />
                    Employer Covers PAYE
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="PAYE Tax Table Override" value={taxTableId} onChange={(e) => setTaxTableId(e.target.value)}>
                    <option value="">Use payroll default</option>
                    {taxTables.filter((t: any) => ["employee", "all"].includes(t.worker_type ?? "employee")).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </SelectField>
                  <TextField label="Pension Rate Override" type="number" value={pensionRate} onChange={(e) => setPensionRate(e.target.value)} placeholder="e.g. 0.08" />
                </div>
                {(form.worker_type ?? "employee") === "consultant" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <TextField label="Withholding Rate Override" type="number" value={withholdingRate} onChange={(e) => setWithholdingRate(e.target.value)} placeholder="e.g. 0.05" helpText="Use this only if you are not adding a recurring Withholding Tax component in Pay Profile." />
                    <TextField label="Consultant Pension Override" type="number" value={consultantPensionRate} onChange={(e) => setConsultantPensionRate(e.target.value)} placeholder="e.g. 0.00" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex w-full items-center justify-between">
            <Button variant="secondary" onClick={() => setShowSlideOver(false)}>Cancel</Button>
            <div className="flex gap-2">
              {editorStep !== "identity" ? (
                <Button variant="secondary" onClick={() => setEditorStep(
                  editorStep === "pay" ? "identity" : editorStep === "allocation" ? "pay" : "allocation"
                )}>Previous</Button>
              ) : null}
              {editorStep !== "compliance" ? (
                <Button onClick={() => setEditorStep(
                  editorStep === "identity" ? "pay" : editorStep === "pay" ? "allocation" : "compliance"
                )}>Next</Button>
              ) : null}
              {editorStep === "compliance" ? (
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving..." : editingWorker ? "Update" : "Add Worker"}
                </Button>
              ) : null}
            </div>
          </div>
        </SlideOverFooter>
      </SlideOver>
    </AppShell>
  );
}
