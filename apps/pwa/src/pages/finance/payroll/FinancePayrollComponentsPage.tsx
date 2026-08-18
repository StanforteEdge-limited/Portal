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
  TextField,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listPayrollComponents,
  createPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  type PayrollComponent,
  type UpsertComponentPayload,
} from "@/shared/api/payroll-api";

const EMPTY_FORM: UpsertComponentPayload = {
  code: "",
  name: "",
  component_type: "earning",
  calculation_type: "fixed",
  amount: undefined,
  rate: undefined,
  taxable: false,
  statutory: false,
};

const COMPONENT_TYPE_TONE: Record<string, "success" | "danger" | "neutral"> = {
  earning: "success",
  deduction: "danger",
  employer_cost: "neutral",
};

export default function FinancePayrollComponentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [listKey, setListKey] = useState(0);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingComponent, setEditingComponent] = useState<PayrollComponent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpsertComponentPayload>(EMPTY_FORM);

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: componentsResp, loading } = useCachedQuery(
    `finance:payroll:components:${listKey}`,
    () => listPayrollComponents(),
    { ttlMs: 0, storage: "memory" },
  );

  const components = componentsResp?.items ?? [];

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance Staff";

  const openCreate = () => {
    setEditingComponent(null);
    setForm(EMPTY_FORM);
    setShowSlideOver(true);
  };

  const openEdit = (c: PayrollComponent) => {
    setEditingComponent(c);
    setForm({
      code: c.code,
      name: c.name,
      component_type: c.component_type,
      calculation_type: c.calculation_type,
      amount: c.amount ?? undefined,
      rate: c.rate ?? undefined,
      taxable: c.taxable,
      statutory: c.statutory,
    });
    setShowSlideOver(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast({ tone: "warning", title: "Required fields", message: "Code and name are required." });
      return;
    }
    setSaving(true);
    try {
      if (editingComponent) {
        await updatePayrollComponent(editingComponent.id, form);
        showToast({ tone: "success", title: "Updated", message: `${form.name} updated.` });
      } else {
        await createPayrollComponent(form);
        showToast({ tone: "success", title: "Created", message: `${form.name} added.` });
      }
      setShowSlideOver(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: PayrollComponent) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await deletePayrollComponent(c.id);
      showToast({ tone: "success", title: "Deleted", message: `${c.name} removed.` });
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Delete failed", message: err instanceof Error ? err.message : "Unable to delete." });
    }
  };

  const setField = (key: keyof UpsertComponentPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="finance-payroll-components"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Finance Staff" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Financial", path: "/finance" },
          { label: "Payroll Setup" },
          { label: "Salary Components" },
        ]}
        title="Salary Components"
        description="Define earnings, deductions, and employer costs used in payroll runs."
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" className="text-[18px]" />
            Add Component
          </Button>
        }
      />

      <SectionCard
        title="Components"
        description="Active salary components available for payroll calculation."
        action={
          components.length > 0 ? (
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-[18px]" />
              Add
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : components.length ? (
          <DataTable
            columns={[
              { header: "Code", cell: (c: any) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">{c.code}</code> },
              { header: "Name", cell: (c: any) => <p className="font-semibold text-slate-900">{c.name}</p> },
              { header: "Type", cell: (c: any) => <Chip variant={COMPONENT_TYPE_TONE[c.component_type] ?? "neutral"}>{c.component_type.replace("_", " ")}</Chip> },
              { header: "Calculation", cell: (c: any) => <span className="capitalize">{c.calculation_type.replace("_", " ")}</span> },
              { header: "Amount / Rate", cell: (c: any) => c.calculation_type === "fixed" && c.amount != null ? c.amount.toLocaleString() : c.rate != null ? `${c.rate}%` : "-" },
              { header: "Taxable", cell: (c: any) => c.taxable ? "Yes" : "No" },
              { header: "Statutory", cell: (c: any) => c.statutory ? "Yes" : "No" },
              { header: "Actions", className: "text-right", cell: (c: any) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Icon name="edit" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleDelete(c)}>
                    <Icon name="delete" />
                  </Button>
                </div>
              ) },
            ]}
            data={components}
          />
        ) : (
          <EmptyState
            title="No components"
            description="Add salary components to use in payroll calculations."
            action={<Button onClick={openCreate}><Icon name="add" className="text-[18px]" />Add Component</Button>}
          />
        )}
      </SectionCard>

      <SlideOver open={showSlideOver} onClose={() => setShowSlideOver(false)} size="md">
        <SlideOverHeader
          title={editingComponent ? "Edit Component" : "Add Salary Component"}
          subtitle="Define how this component is calculated."
          onClose={() => setShowSlideOver(false)}
        />
        <SlideOverContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Code" value={form.code} onChange={setField("code")} placeholder="e.g. BASIC" />
              <TextField label="Name" value={form.name} onChange={setField("name")} placeholder="e.g. Basic Salary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Type" value={form.component_type} onChange={setField("component_type")}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
                <option value="employer_cost">Employer Cost</option>
              </SelectField>
              <SelectField label="Calculation" value={form.calculation_type} onChange={setField("calculation_type")}>
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
                <option value="formula">Formula</option>
                <option value="manual">Manual</option>
              </SelectField>
            </div>
            {form.calculation_type === "fixed" && (
              <TextField label="Fixed Amount" type="number" value={String(form.amount ?? "")} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) || undefined }))} placeholder="0.00" />
            )}
            {form.calculation_type === "percentage" && (
              <TextField label="Rate (%)" type="number" value={String(form.rate ?? "")} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) || undefined }))} placeholder="0.00" />
            )}
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Taxable" value={form.taxable ? "yes" : "no"} onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.value === "yes" }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectField>
              <SelectField label="Statutory" value={form.statutory ? "yes" : "no"} onChange={(e) => setForm((f) => ({ ...f, statutory: e.target.value === "yes" }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectField>
            </div>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="secondary" onClick={() => setShowSlideOver(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : editingComponent ? "Update" : "Add Component"}
          </Button>
        </SlideOverFooter>
      </SlideOver>
    </AppShell>
  );
}
