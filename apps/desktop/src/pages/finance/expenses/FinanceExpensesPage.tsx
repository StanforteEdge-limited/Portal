import { useState, useMemo } from "react";
import {
  AppShell,
  Button,
  Chip,
  Icon,
  PageHeader,
  PaginationControls,
  SectionCard,
  SelectField,
  StatCard,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { buildAppMobileNav, buildAppNavigation } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { formatCurrency, formatDate } from "@stanforte/shared";

export default function FinanceExpensesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    contact_id: "",
    account_id: "",
    chart_account_id: "",
    expense_date: "",
    category: "",
    description: "",
    amount: "",
    tax_amount: "",
    currency: "NGN",
    reference: "",
    notes: "",
    status: "draft",
  });

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const { data: expensesPayload, loading, refetch } = useCachedQuery(
    `finance:expenses:${listKey}:${search}:${status}:${category}:${page}:${perPage}`,
    () =>
      resourceApi.listFinanceExpenses({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
        page,
        per_page: perPage,
      }),
    { ttlMs: 0, storage: "memory" },
  );

  const { data: contacts } = useCachedQuery(
    "finance:contacts:vendors:all",
    () => financeApi.listContacts({ contact_type: "vendor", is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const vendorOptions = Array.isArray(contacts?.result) ? contacts.result : [];
  const { data: accounts } = useCachedQuery(
    "finance:accounts:all",
    () => resourceApi.listFinanceAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const accountOptions = Array.isArray((accounts as any)?.result)
    ? (accounts as any).result
    : [];
  const { data: chartAccounts } = useCachedQuery(
    "finance:chart-accounts:all",
    () => resourceApi.listChartAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );

  const expenses = Array.isArray(expensesPayload?.result) ? expensesPayload.result : [];
  const totalExpenses = Number(expensesPayload?.total ?? 0);
  const pagination = {
    page: expensesPayload?.page ?? page,
    pages: expensesPayload?.pages ?? 1,
    total_result: expensesPayload?.total ?? 0,
    per_page: expensesPayload?.per_page ?? perPage,
  };

  const totalAmount = expenses.reduce((sum: number, entry: any) => sum + Number(entry.totalAmount ?? entry.total_amount ?? entry.amount ?? 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({
      contact_id: "",
      account_id: "",
      chart_account_id: "",
      expense_date: new Date().toISOString().slice(0, 10),
      category: "",
      description: "",
      amount: "",
      tax_amount: "",
      currency: "NGN",
      reference: "",
      notes: "",
      status: "draft",
    });
    setShowModal(true);
  };

  const openEdit = (expense: any) => {
    setEditing(expense);
    setForm({
      contact_id: expense.vendorId ?? expense.vendor_id ?? expense.contactId ?? expense.contact_id ?? "",
      account_id: expense.accountId ?? expense.account_id ?? "",
      chart_account_id: expense.chartAccountId ?? expense.chart_account_id ?? "",
      expense_date: String(expense.expenseDate ?? expense.expense_date ?? "").slice(0, 10),
      category: expense.category ?? "",
      description: expense.description ?? "",
      amount: String(expense.amount ?? ""),
      tax_amount: String(expense.taxAmount ?? expense.tax_amount ?? ""),
      currency: expense.currency ?? "NGN",
      reference: expense.reference ?? "",
      notes: expense.notes ?? "",
      status: expense.status ?? "draft",
    });
    setShowModal(true);
  };

  const saveExpense = async () => {
    if (!form.account_id) {
      showToast({ tone: "warning", title: "Account required", message: "Please select a finance account." });
      return;
    }
    if (!form.expense_date || !form.amount) {
      showToast({ tone: "warning", title: "Missing fields", message: "Expense date and amount are required." });
      return;
    }

    try {
      const payload = {
        vendor_id: form.contact_id || undefined,
        account_id: form.account_id,
        chart_account_id: form.chart_account_id || undefined,
        expense_date: form.expense_date,
        category: form.category || undefined,
        description: form.description || undefined,
        amount: Number(form.amount),
        tax_amount: form.tax_amount ? Number(form.tax_amount) : undefined,
        currency: form.currency.toUpperCase(),
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        status: form.status,
      };

      if (editing?.id) {
        await resourceApi.updateFinanceExpense(String(editing.id), payload);
      } else {
        await resourceApi.createFinanceExpense(payload);
      }
      setShowModal(false);
      setListKey((k) => k + 1);
      showToast({ tone: "success", title: "Saved", message: "Expense saved successfully." });
    } catch (error) {
      showToast({ tone: "danger", title: "Save failed", message: error instanceof Error ? error.message : "Unable to save expense." });
    }
  };

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Date",
      cell: (entry: any) => formatDate(entry.expenseDate ?? entry.expense_date)
    },
    {
      header: "Reference",
      cell: (entry: any) => (
        <div>
          <p className="font-medium text-slate-900">{entry.expenseNumber ?? entry.expense_number ?? "-"}</p>
          <p className="text-xs text-slate-500">{entry.reference ?? "-"}</p>
        </div>
      )
    },
    {
      header: "Vendor",
      cell: (entry: any) => entry.vendor?.name ?? "-"
    },
    {
      header: "Account",
      cell: (entry: any) => entry.account?.name ?? "-"
    },
    {
      header: "Amount",
      cell: (entry: any) => formatCurrency(Number(entry.totalAmount ?? entry.total_amount ?? entry.amount ?? 0), entry.currency || "NGN"),
      className: "text-right text-slate-900"
    },
    {
      header: "Status",
      cell: (entry: any) => (
        <Chip
          variant={
            entry.status === "approved" || entry.status === "paid"
              ? "success"
              : entry.status === "draft"
                ? "neutral"
                : "warning"
          }
        >
          {entry.status || "draft"}
        </Chip>
      )
    },
    {
      header: "Actions",
      cell: (entry: any) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(entry); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right"
    }
  ], [openEdit]);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-expenses"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Finance" }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Expenses" }]}
        title="Expenses"
        description="Track operating and project expenses."
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Expenses" value={String(pagination.total_result || 0)} tone="neutral" />
          <StatCard label="Total Amount" value={formatCurrency(totalAmount)} tone="neutral" />
          <StatCard label="Approved" value={String(expenses.filter((entry: any) => entry.status === "approved").length)} tone="success" />
        </div>

        <section className="section-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-sm flex-1 min-w-[180px]">
              <span className="font-semibold text-slate-700">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search expenses"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
              />
            </label>
            <SelectField label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </SelectField>
            <label className="grid gap-1.5 text-sm min-w-[180px]">
              <span className="font-semibold text-slate-700">Category</span>
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} placeholder="e.g. transport" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              <Icon name="refresh" className="text-[16px]" />
              Refresh
            </Button>
          </div>
        </section>

        <SectionCard
          title="All Expenses"
          description="Track and manage expenses."
          action={
            totalExpenses > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(totalExpenses, (page - 1) * perPage + 1)}-
                {Math.min(totalExpenses, page * perPage)} of {totalExpenses} expense
                {totalExpenses === 1 ? "" : "s"}
              </Chip>
            ) : (
              <Button onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                New Expense
              </Button>
            )
          }
        >
        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          error={null}
          caption="Expenses"
          emptyTitle="No expenses found"
          emptyDescription="There are no expenses to display."
          onRowClick={(entry) => openEdit(entry)}
          pagination={{
            page: Number(pagination.page || page),
            totalPages: Number(pagination.pages || 1),
            totalCount: Number(pagination.total_result || 0),
            perPage: Number(pagination.per_page || perPage),
            onPageChange: setPage,
            onPerPageChange: (value) => {
              setPerPage(value);
              setPage(1);
            },
          }}
        />
        </SectionCard>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? "Edit Expense" : "New Expense"}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <Icon name="close" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Expense Date</span>
                <input type="date" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.expense_date} onChange={(event) => setForm((prev) => ({ ...prev, expense_date: event.target.value }))} />
              </label>
              <SelectField label="Status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </SelectField>
              <SelectField label="Vendor" value={form.contact_id} onChange={(event) => setForm((prev) => ({ ...prev, contact_id: event.target.value }))}>
                <option value="">Select vendor</option>
                {vendorOptions.map((vendor: any) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </SelectField>
              <SelectField label="Paid From Account" value={form.account_id} onChange={(event) => setForm((prev) => ({ ...prev, account_id: event.target.value }))}>
                <option value="">Select account</option>
                {accountOptions.map((account: any) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </SelectField>
              <SelectField label="Chart Account" value={form.chart_account_id} onChange={(event) => setForm((prev) => ({ ...prev, chart_account_id: event.target.value }))}>
                <option value="">Select chart account</option>
                {(Array.isArray(chartAccounts) ? chartAccounts : []).map((account: any) => (
                  <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                ))}
              </SelectField>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Category</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="e.g. transport" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Amount</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Tax Amount</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.tax_amount} onChange={(event) => setForm((prev) => ({ ...prev, tax_amount: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Currency</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Reference</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.reference} onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Description</span>
                <textarea className="rounded-2xl border border-slate-200 px-4 py-2.5" rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Notes</span>
                <textarea className="rounded-2xl border border-slate-200 px-4 py-2.5" rows={2} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={() => void saveExpense()}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
