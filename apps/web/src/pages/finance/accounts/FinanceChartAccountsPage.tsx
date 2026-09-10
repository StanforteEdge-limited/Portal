import { useState, useMemo } from "react";
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  SelectField,
  PaginationControls,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { resourceApi } from "@/shared/lib/core";

type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export default function FinanceChartAccountsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [listKey, setListKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "asset" as AccountType,
    category: "",
    normal_balance: "debit",
    is_control_account: false,
    is_active: true,
  });

  const { data: accountsData, loading, refetch } = useCachedQuery(
    `finance:chart-accounts:${listKey}:${typeFilter}:${statusFilter}:${search}:${page}:${perPage}`,
    async () => {
      const result = await resourceApi.listChartAccounts({
        type: typeFilter || undefined,
        is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
        q: search || undefined,
        page,
        per_page: perPage,
      });
      return result;
    },
    { ttlMs: 0, storage: "memory" },
  );

  const accounts = (accountsData as any)?.data?.items ?? [];
  const totalCount = (accountsData as any)?.data?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalCount / perPage) || 1;

  const stats = {
    total: accounts.length,
    assets: accounts.filter((a: any) => a.type === "asset").length,
    liabilities: accounts.filter((a: any) => a.type === "liability").length,
    equity: accounts.filter((a: any) => a.type === "equity").length,
    income: accounts.filter((a: any) => a.type === "income").length,
    expenses: accounts.filter((a: any) => a.type === "expense").length,
  };

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance";

  const openCreate = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      type: "asset",
      category: "",
      normal_balance: "debit",
      is_control_account: false,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (account: any) => {
    setEditingId(account.id);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category || "",
      normal_balance: account.normal_balance || "debit",
      is_control_account: account.is_control_account || false,
      is_active: account.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter an account name." });
      return;
    }

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        category: form.category.trim().toLowerCase() || undefined,
        normal_balance: form.normal_balance,
        is_control_account: form.is_control_account,
        is_active: form.is_active,
      };

      if (editingId) {
        await resourceApi.updateChartAccount(editingId, payload);
        showToast({ tone: "success", title: "Account updated", message: `"${form.name}" updated successfully.` });
      } else {
        await resourceApi.createChartAccount(payload);
        showToast({ tone: "success", title: "Account created", message: `"${form.name}" created successfully.` });
      }
      setShowModal(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save account." });
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Code",
      cell: (account: any) => (
        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
          {account.code || "-"}
        </code>
      )
    },
    {
      header: "Name",
      cell: (account: any) => (
        <div>
          <p className="font-medium text-slate-900">{account.name}</p>
          {account.is_control_account && (
            <span className="text-xs text-brand-600">Control account</span>
          )}
        </div>
      )
    },
    {
      header: "Type",
      cell: (account: any) => (
        <Chip variant="neutral" className="capitalize">
          {account.type}
        </Chip>
      )
    },
    {
      header: "Category",
      cell: (account: any) => account.category || "-"
    },
    {
      header: "Normal",
      cell: (account: any) => <span className="capitalize">{account.normal_balance}</span>
    },
    {
      header: "Status",
      cell: (account: any) => (
        <Chip variant={account.is_active ? "success" : "neutral"}>
          {account.is_active ? "Active" : "Inactive"}
        </Chip>
      )
    },
    {
      header: "Actions",
      cell: (account: any) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(account); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right"
    }
  ], [openEdit]);

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="finance-chart-accounts"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Finance",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Chart of Accounts" },
        ]}
        title="Chart of Accounts"
        description="Accounting classification system for financial tracking."
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Total" value={String(stats.total)} tone="neutral" />
          <StatCard label="Assets" value={String(stats.assets)} tone="neutral" />
          <StatCard label="Liabilities" value={String(stats.liabilities)} tone="neutral" />
          <StatCard label="Equity" value={String(stats.equity)} tone="neutral" />
          <StatCard label="Income/Expense" value={`${stats.income}/${stats.expenses}`} tone="neutral" />
        </div>

        {/* Filters */}
        <section className="section-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="min-w-[140px]"
            >
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </SelectField>

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="min-w-[140px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>

            <label className="grid gap-1.5 text-sm flex-1 min-w-[180px]">
              <span className="font-semibold text-slate-700">Search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search accounts..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
              />
            </label>

            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              <Icon name="refresh" className="text-[16px]" />
              Refresh
            </Button>
          </div>
        </section>

        {/* Table */}
<SectionCard
          title="Accounts"
          description="Chart of accounts for finance tracking."
          action={
            totalCount > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(totalCount, (page - 1) * perPage + 1)}-
                {Math.min(totalCount, page * perPage)} of {totalCount} account
                {totalCount !== 1 ? "s" : ""}
              </Chip>
            ) : (
              <Button onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Add Account
              </Button>
            )
          }
        >
        <DataTable
          columns={columns}
          data={accounts}
          loading={loading}
          error={null}
          caption="Chart of Accounts"
          emptyTitle="No accounts found"
          emptyDescription="There are no chart of accounts records to display."
          onRowClick={(account) => openEdit(account)}
          pagination={{
            page,
            totalPages,
            totalCount,
            perPage,
            onPageChange: setPage,
            onPerPageChange: setPerPage,
          }}
        />
        </SectionCard>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Account" : "New Account"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <Icon name="close" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-slate-700">Code</span>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="e.g., 1001"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-slate-700">Type <span className="text-red-500">*</span></span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Name <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Cash at Bank"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-slate-700">Category</span>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g., bank"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-slate-700">Normal Balance</span>
                  <select
                    value={form.normal_balance}
                    onChange={(e) => setForm((f) => ({ ...f, normal_balance: e.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_control_account}
                    onChange={(e) => setForm((f) => ({ ...f, is_control_account: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-slate-700">Control account</span>
                </label>

                {editingId && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-slate-700">Active</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingId ? "Update Account" : "Create Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
