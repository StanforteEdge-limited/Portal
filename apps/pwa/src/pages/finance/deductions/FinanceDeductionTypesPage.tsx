import { useState } from "react";
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  TextField,
  SelectField,
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
  DataTable,
  useToast,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";

export default function FinanceDeductionTypesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [listKey, setListKey] = useState(0);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    rate: "",
    applies_to: "vendor",
    gl_account_id: "",
    is_active: true,
  });

  const { data: deductionTypes, loading, refetch } = useCachedQuery(
    `finance:deduction-types:${listKey}`,
    () => financeApi.listDeductionTypes(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const { data: glAccountsData } = useCachedQuery(
    "finance:chart-accounts:active",
    () => financeApi.listChartAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );

  const types = Array.isArray(deductionTypes) ? deductionTypes : [];
  const glAccounts = Array.isArray(glAccountsData?.result) ? glAccountsData.result : Array.isArray(glAccountsData) ? glAccountsData : [];

  const activeCount = types.filter((t: any) => t.is_active).length;
  const highestRate = types.length > 0
    ? Math.max(...types.map((t: any) => t.rate ?? 0))
    : 0;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance";

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      rate: "",
      applies_to: "vendor",
      gl_account_id: "",
      is_active: true,
    });
    setShowSlideOver(true);
  };

  const openEdit = (dt: any) => {
    setEditingId(dt.id);
    setForm({
      name: dt.name || "",
      code: dt.code || "",
      rate: dt.rate != null ? String(Math.round(dt.rate * 100 * 100) / 100) : "",
      applies_to: dt.applies_to || "vendor",
      gl_account_id: dt.gl_account_id || "",
      is_active: dt.is_active,
    });
    setShowSlideOver(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter a deduction type name." });
      return;
    }
    if (!form.rate.trim() || isNaN(Number(form.rate))) {
      showToast({ tone: "warning", title: "Rate required", message: "Please enter a valid rate." });
      return;
    }

    try {
      const payload: any = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || undefined,
        rate: Number(form.rate) / 100,
        applies_to: form.applies_to,
        gl_account_id: form.gl_account_id || undefined,
        is_active: form.is_active,
      };

      if (editingId) {
        await financeApi.updateDeductionType(editingId, payload);
        showToast({ tone: "success", title: "Updated", message: `"${form.name}" updated successfully.` });
      } else {
        await financeApi.createDeductionType(payload);
        showToast({ tone: "success", title: "Created", message: `"${form.name}" created successfully.` });
      }
      setShowSlideOver(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save deduction type." });
    }
  };

  const handleToggleActive = async (dt: any) => {
    try {
      await financeApi.updateDeductionType(dt.id, { is_active: !dt.is_active });
      showToast({
        tone: "success",
        title: dt.is_active ? "Deactivated" : "Activated",
        message: `"${dt.name}" ${dt.is_active ? "deactivated" : "activated"}.`,
      });
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to update." });
    }
  };

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="finance-settings"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Deduction Types" },
        ]}
        title="Deduction Types"
        description="Configure statutory deduction rates for WHT, VAT, and other withholdings."
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Active Types" value={String(activeCount)} tone="success" />
          <StatCard label="Highest Rate" value={`${highestRate * 100}%`} tone="neutral" />
        </div>

        <SectionCard
          title="Deduction Types"
          description="Manage deduction rates applied to transactions."
          action={
            <div className="flex items-center gap-2">
              <Chip variant="neutral">{types.length} type{types.length !== 1 ? "s" : ""}</Chip>
              <Button size="sm" onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Add Type
              </Button>
            </div>
          }
        >
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading deduction types...
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-10">
              <Icon name="percent" className="text-4xl text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No deduction types found.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Name", cell: (dt: any) => (
                    <>
                      <p className="font-medium text-slate-900">{dt.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{dt.applies_to || "-"}</p>
                    </>
                  )
                },
                {
                  header: "Code", cell: (dt: any) => (
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {dt.code || "-"}
                    </code>
                  )
                },
                {
                  header: "Rate", cell: (dt: any) => (
                    <span className="font-medium text-slate-900">
                      {dt.rate != null ? `${(dt.rate * 100).toFixed(2)}%` : "-"}
                    </span>
                  )
                },
                {
                  header: "GL Account", cell: (dt: any) => {
                    const glAccount = glAccounts.find((a: any) => a.id === dt.gl_account_id);
                    return <span className="text-slate-600">{glAccount ? glAccount.name : "-"}</span>;
                  }
                },
                {
                  header: "Status", cell: (dt: any) => (
                    <Chip variant={dt.is_active ? "success" : "neutral"}>
                      {dt.is_active ? "Active" : "Inactive"}
                    </Chip>
                  )
                },
                {
                  header: "Actions", className: "text-right", cell: (dt: any) => (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(dt)}>
                        <Icon name="edit" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void handleToggleActive(dt)}>
                        <Icon name={dt.is_active ? "toggle_on" : "toggle_off"} />
                      </Button>
                    </div>
                  )
                },
              ]}
              data={types}
            />
          )}
        </SectionCard>
      </div>

      <SlideOver open={showSlideOver} onClose={() => setShowSlideOver(false)} size="md">
        <SlideOverHeader
          title={editingId ? "Edit Deduction Type" : "New Deduction Type"}
          subtitle={editingId ? "Update deduction rate and settings." : "Add a new statutory deduction type."}
          onClose={() => setShowSlideOver(false)}
        />
        <SlideOverContent>
          <div className="grid gap-4">
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Withholding Tax"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g., WHT"
              />
              <TextField
                label="Rate (%)"
                type="number"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="e.g., 5"
              />
            </div>
            <SelectField
              label="Applies To"
              value={form.applies_to}
              onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
            >
              <option value="vendor">Vendor</option>
              <option value="all">All</option>
            </SelectField>
            <SelectField
              label="GL Account"
              value={form.gl_account_id}
              onChange={(e) => setForm((f) => ({ ...f, gl_account_id: e.target.value }))}
            >
              <option value="">— None —</option>
              {glAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.code ? `${a.code} — ` : ""}{a.name}
                </option>
              ))}
            </SelectField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-slate-700 font-medium">Active</span>
            </label>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="secondary" onClick={() => setShowSlideOver(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingId ? "Update" : "Create"}
          </Button>
        </SlideOverFooter>
      </SlideOver>
    </AppShell>
  );
}