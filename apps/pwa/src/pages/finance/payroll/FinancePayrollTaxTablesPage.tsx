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
  listPayrollTaxTables,
  createPayrollTaxTable,
  updatePayrollTaxTable,
  type PayrollTaxTable,
  type TaxBand,
  type UpsertTaxTablePayload,
} from "@/shared/api/payroll-api";

const EMPTY_FORM: UpsertTaxTablePayload = {
  name: "",
  worker_type: "employee",
  effective_date: new Date().toISOString().slice(0, 10),
  currency: "NGN",
  bands: [{ from: 0, to: undefined, rate: 0 }],
};

export default function FinancePayrollTaxTablesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [listKey, setListKey] = useState(0);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingTable, setEditingTable] = useState<PayrollTaxTable | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpsertTaxTablePayload>(EMPTY_FORM);

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: tablesResp, loading } = useCachedQuery(
    `finance:payroll:tax-tables:${listKey}`,
    () => listPayrollTaxTables(),
    { ttlMs: 0, storage: "memory" },
  );

  const tables = tablesResp?.items ?? [];

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance Staff";

  const openCreate = () => {
    setEditingTable(null);
    setForm(EMPTY_FORM);
    setShowSlideOver(true);
  };

  const openEdit = (t: PayrollTaxTable) => {
    setEditingTable(t);
    setForm({
      name: t.name,
      worker_type: t.worker_type ?? "employee",
      effective_date: t.effective_date,
      currency: t.currency ?? "NGN",
      bands: t.bands || [{ from: 0, to: undefined, rate: 0 }],
    });
    setShowSlideOver(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.bands.length) {
      showToast({ tone: "warning", title: "Required", message: "Name and bands required." });
      return;
    }
    setSaving(true);
    try {
      if (editingTable) {
        await updatePayrollTaxTable(editingTable.id, form);
        showToast({ tone: "success", title: "Updated", message: `${form.name} updated.` });
      } else {
        await createPayrollTaxTable(form);
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

  const setField = (key: keyof UpsertTaxTablePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="finance-payroll-tax-tables"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Finance Staff" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Financial", path: "/finance" },
          { label: "Payroll Setup" },
          { label: "Tax Tables" },
        ]}
        title="Tax Tables"
        description="Manage progressive tax bands by worker type."
        actions={<Button onClick={openCreate}><Icon name="add" className="text-[18px]" /> Add Table</Button>}
      />

      <SectionCard title="Tax Tables" description="Active tax tables for payroll calculations.">
        {loading ? <div className="text-sm text-slate-500">Loading...</div> : tables.length ? (
          <DataTable
            columns={[
              { header: "Name", cell: (t: any) => <p className="font-semibold">{t.name}</p> },
              { header: "Worker Type", cell: (t: any) => t.worker_type || "-" },
              { header: "Effective", cell: (t: any) => t.effective_date },
              { header: "Bands", cell: (t: any) => `${t.bands?.length || 0} bands` },
              { header: "Active", cell: (t: any) => <Chip variant={t.is_active ? "success" : "neutral"}>{t.is_active ? "Yes" : "No"}</Chip> },
              { header: "Actions", className: "text-right", cell: (t: any) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Icon name="edit" /></Button>
                </div>
              ) },
            ]}
            data={tables}
          />
        ) : <EmptyState title="No tax tables" description="Add tax tables for payroll." action={<Button onClick={openCreate}>Add Table</Button>} />}
      </SectionCard>

      <SlideOver open={showSlideOver} onClose={() => setShowSlideOver(false)} size="md">
        <SlideOverHeader title={editingTable ? "Edit Tax Table" : "Add Tax Table"} subtitle="Define progressive tax bands." onClose={() => setShowSlideOver(false)} />
        <SlideOverContent>
          <div className="grid gap-4">
            <TextField label="Name" value={form.name} onChange={setField("name")} placeholder="e.g. 2026 PAYE" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Worker Type" value={form.worker_type || ""} onChange={setField("worker_type")}>
                <option value="employee">Employee</option>
                <option value="consultant">Consultant</option>
              </SelectField>
              <TextField label="Effective Date" type="date" value={form.effective_date} onChange={setField("effective_date")} />
            </div>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="secondary" onClick={() => setShowSlideOver(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : editingTable ? "Update" : "Create"}</Button>
        </SlideOverFooter>
      </SlideOver>
    </AppShell>
  );
}
