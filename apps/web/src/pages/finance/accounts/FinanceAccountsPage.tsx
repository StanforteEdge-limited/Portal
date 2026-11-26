import { SelectBox } from "@/components/ui/select";
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
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Link } from "@/shared/router-adapter";
import { ChevronRight, Plus, RefreshCw, Wallet, CheckCircle2, DollarSign, Building } from "lucide-react";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { resourceApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { useNavigate } from "react-router-dom";

type AccountType = "bank" | "cash" | "wallet" | "other";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
];

export default function FinanceAccountsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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
    name: "",
    code: "",
    account_type: "bank" as AccountType,
    bank_name: "",
    account_name: "",
    account_number: "",
    branch_name: "",
    currency: "NGN",
    opening_balance: "",
    is_active: true,
  });

  const { data: accountsData, loading, refetch } = useCachedQuery(
    `finance:accounts:${listKey}:${typeFilter}:${statusFilter}:${search}:${page}:${perPage}`,
    async () => {
      const result = await resourceApi.listFinanceAccounts({
        account_type: typeFilter || undefined,
        is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
        q: search || undefined,
        page,
        per_page: perPage,
      });
      return result;
    },
    { ttlMs: 0, storage: "memory" },
  );

  const accounts = Array.isArray(accountsData?.result) ? accountsData.result : [];
  const totalCount = Number(accountsData?.total ?? 0);
  const totalPages = Math.ceil(totalCount / perPage) || 1;

  const totalOpening = accounts.reduce((sum: number, a: any) => sum + (a.opening_balance || 0), 0);
  const totalCurrent = accounts.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance";

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      account_type: "bank",
      bank_name: "",
      account_name: "",
      account_number: "",
      branch_name: "",
      currency: "NGN",
      opening_balance: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (account: any) => {
    setEditingId(account.id);
    setForm({
      name: account.name,
      code: account.code || "",
      account_type: account.account_type,
      bank_name: account.bank_name || "",
      account_name: account.account_name || "",
      account_number: account.account_number || "",
      branch_name: account.branch_name || "",
      currency: account.currency || "NGN",
      opening_balance: String(account.opening_balance ?? 0),
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
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        account_type: form.account_type,
        bank_name: form.bank_name.trim() || undefined,
        account_name: form.account_name.trim() || undefined,
        account_number: form.account_number.trim() || undefined,
        branch_name: form.branch_name.trim() || undefined,
        currency: form.currency.toUpperCase(),
        opening_balance: form.opening_balance.trim() ? Number(form.opening_balance) : 0,
        is_active: form.is_active,
      };

      if (editingId) {
        await resourceApi.updateFinanceAccount(editingId, payload);
        showToast({ tone: "success", title: "Account updated", message: `"${form.name}" updated successfully.` });
      } else {
        await resourceApi.createFinanceAccount(payload);
        showToast({ tone: "success", title: "Account created", message: `"${form.name}" created successfully.` });
      }
      setShowModal(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save account." });
    }
  };

  const handleToggleStatus = async (account: any) => {
    try {
      await resourceApi.updateFinanceAccount(account.id, { is_active: !account.is_active });
      showToast({ tone: "success", title: account.is_active ? "Deactivated" : "Activated", message: `"${account.name}" ${account.is_active ? "deactivated" : "activated"}.` });
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to update account." });
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Name",
      cell: (account: any) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/finance/accounts/${account.id}`)}
            className="font-medium text-neutral-900 hover:text-brand-700 hover:underline text-left"
          >
            {account.name}
          </button>
          {account.code && <p className="text-xs text-neutral-400">{account.code}</p>}
        </div>
      )
    },
    {
      header: "Type",
      cell: (account: any) => <span className="capitalize">{account.account_type}</span>
    },
    {
      header: "Bank Details",
      cell: (account: any) => (
        account.bank_name || account.account_number ? (
          <>
            {account.bank_name && <div>{account.bank_name}</div>}
            {account.account_number && <div>{account.account_number}</div>}
          </>
        ) : "-"
      ),
      className: "text-xs text-neutral-600"
    },
    {
      header: "Currency",
      cell: (account: any) => account.currency
    },
    {
      header: "Opening",
      cell: (account: any) => formatCurrency(account.opening_balance),
      className: "text-right text-neutral-600"
    },
    {
      header: "Current",
      cell: (account: any) => formatCurrency(account.current_balance),
      className: "text-right font-medium text-neutral-900"
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
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/finance/accounts/${account.id}`)}>
            <Icon name="visibility" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(account)}>
            <Icon name="edit" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleToggleStatus(account)}>
            <Icon name={account.is_active ? "toggle_on" : "toggle_off"} />
          </Button>
        </div>
      ),
      className: "text-right"
    }
  ], [navigate, openEdit, handleToggleStatus]);

  return (
    <PortalLayout activeNav="Accounts & Ledger">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Bank & Ledger Accounts"
          description="Manage operating bank accounts, petty cash vaults, digital wallets, and general ledger balances."
          icon={Wallet}
          iconColor="bg-orange-50 text-[#C2410C]"
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-medium shadow-md transition transform"
            >
              <Plus className="h-4 w-4" />
              <span>Add Account</span>
            </button>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                Ledger
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Total Accounts</div>
              <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5 tracking-tight truncate">{accounts.length}</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                Active
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Active Accounts</div>
              <div className="text-lg sm:text-2xl font-semibold text-emerald-600 mt-0.5 tracking-tight truncate">
                {accounts.filter((a: any) => a.is_active).length}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                <Building className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                Starting
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Opening Balance</div>
              <div className="text-base sm:text-xl font-semibold text-neutral-800 mt-0.5 tracking-tight truncate">
                {formatCurrency(totalOpening)}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-[#C2410C] bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                Live
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Current Balance</div>
              <div className="text-base sm:text-xl font-semibold text-[#C2410C] mt-0.5 tracking-tight truncate">
                {formatCurrency(totalCurrent)}
              </div>
            </div>
          </div>
        </div>

        <section className="section-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField label="Type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="min-w-[140px]">
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </SelectField>
            <SelectField label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-w-[140px]">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
            <label className="grid gap-1.5 text-sm flex-1 min-w-[180px]">
              <span className="font-semibold text-neutral-700">Search</span>
              <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search accounts..." className="rounded-2xl border border-neutral-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}><Icon name="refresh" className="text-[16px]" />Refresh</Button>
            <Button onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Add Account
              </Button>
          </div>
        </section>

        <SectionCard
          title="Accounts"
          description="Track and manage finance accounts."
          action={
            totalCount > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(totalCount, (page - 1) * perPage + 1)}-
                {Math.min(totalCount, page * perPage)} of {totalCount} account
                {totalCount !== 1 ? "s" : ""}
              </Chip>
            ) : undefined
          }
        >
        <DataTable
          columns={columns}
          data={accounts}
          loading={loading}
          error={null}
          caption="Accounts"
          emptyTitle="No accounts found"
          emptyDescription="There are no finance accounts to display."
          onRowClick={(account) => navigate(`/finance/accounts/${account.id}`)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">{editingId ? "Edit Account" : "New Account"}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}><Icon name="close" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-neutral-700">Account Name <span className="text-red-500">*</span></span>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Main Operating Account" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-neutral-700">Code</span>
                  <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g., ACC-001" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-neutral-700">Type</span>
                  <SelectBox value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value as AccountType }))} className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10">
                    {ACCOUNT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </SelectBox>
                </label>
              </div>
              {form.account_type === "bank" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-neutral-700">Bank Name</span>
                      <input type="text" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g., GTBank" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-neutral-700">Account Name</span>
                      <input type="text" value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="Name on account" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-neutral-700">Account Number</span>
                      <input type="text" value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} placeholder="e.g., 0123456789" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-neutral-700">Branch</span>
                      <input type="text" value={form.branch_name} onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))} placeholder="Branch name" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                    </label>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-neutral-700">Currency</span>
                  <input type="text" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="NGN" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-neutral-700">Opening Balance</span>
                  <input type="number" value={form.opening_balance} onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))} placeholder="0.00" className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10" />
                </label>
              </div>
              {editingId && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-neutral-300" />
                  <span className="text-neutral-700">Active</span>
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? "Update Account" : "Create Account"}</Button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
