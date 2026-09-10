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

export default function FinanceSalesInvoicesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    currency: "NGN",
    notes: "",
    lines: [{ description: "", quantity: 1, unit_price: 0 }],
  });

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const { data: invoicesData, loading, refetch } = useCachedQuery(
    `finance:sales-invoices:${listKey}:${search}:${statusFilter}:${page}:${perPage}`,
    () =>
      resourceApi.listSalesInvoices({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        per_page: perPage,
      }),
    { ttlMs: 0, storage: "memory" },
  );

  const { data: contacts } = useCachedQuery(
    "finance:contacts:customers:all",
    () => financeApi.listContacts({ contact_type: "customer", is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );

  const customerOptions = Array.isArray(contacts?.result) ? contacts.result : [];

  const invoices = Array.isArray(invoicesData?.result) ? invoicesData.result : [];
  const totalInvoices = Number(invoicesData?.total ?? 0);
  const pagination = {
    page: invoicesData?.page ?? page,
    pages: invoicesData?.pages ?? 1,
    total_result: invoicesData?.total ?? 0,
  };

  const totalAmount = invoices.reduce(
    (sum: number, inv: any) => sum + Number(inv.totalAmount ?? inv.total_amount ?? 0),
    0,
  );

  const draftCount = invoices.filter(
    (inv: any) => (inv.status || "draft") === "draft",
  ).length;

  const openCreate = () => {
    setForm({
      contact_id: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      status: "draft",
      currency: "NGN",
      notes: "",
      lines: [{ description: "", quantity: 1, unit_price: 0 }],
    });
    setShowModal(true);
  };

  const addLine = () => {
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { description: "", quantity: 1, unit_price: 0 }],
    }));
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line,
      ),
    }));
  };

  const removeLine = (index: number) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.filter((_, i) => i !== index),
    }));
  };

  const saveInvoice = async () => {
    if (!form.contact_id) {
      showToast({
        tone: "warning",
        title: "Missing customer",
        message: "Please select a customer.",
      });
      return;
    }
    setSaving(true);
    try {
      const subtotal = form.lines.reduce(
        (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
        0,
      );
      await resourceApi.createSalesInvoice({
        customer_id: form.contact_id,
        invoice_date: form.invoice_date,
        due_date: form.due_date || undefined,
        status: form.status,
        currency: form.currency.toUpperCase(),
        subtotal,
        total_amount: subtotal,
        notes: form.notes || undefined,
        lines: form.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          line_total: Number(line.quantity) * Number(line.unit_price),
        })),
      });
      setShowModal(false);
      setListKey((k) => k + 1);
      showToast({
        tone: "success",
        title: "Saved",
        message: "Invoice created successfully.",
      });
    } catch (error) {
      showToast({
        tone: "danger",
        title: "Save failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save invoice.",
      });
    } finally {
      setSaving(false);
    }
  };

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Finance";

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Date",
      cell: (inv: any) => formatDate(inv.invoiceDate ?? inv.invoice_date)
    },
    {
      header: "Invoice Number",
      cell: (inv: any) => inv.invoiceNumber ?? inv.invoice_number ?? "-"
    },
    {
      header: "Customer",
      cell: (inv: any) => inv.customer?.name ?? "-"
    },
    {
      header: "Status",
      cell: (inv: any) => (
        <Chip
          variant={
            inv.status === "paid"
              ? "success"
              : inv.status === "draft"
                ? "neutral"
                : "warning"
          }
        >
          {inv.status || "draft"}
        </Chip>
      )
    },
    {
      header: "Amount",
      cell: (inv: any) => formatCurrency(
        Number(inv.totalAmount ?? inv.total_amount ?? 0),
        inv.currency || "NGN"
      ),
      className: "text-right font-medium text-slate-900"
    },
    {
      header: "Due Date",
      cell: (inv: any) => formatDate(inv.dueDate ?? inv.due_date) || "-"
    }
  ], []);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-sales-invoices"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Finance",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Sales Invoices" },
        ]}
        title="Sales Invoices"
        description="Manage customer invoices and receivables."
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Invoices"
            value={String(invoices.length)}
            tone="neutral"
          />
          <StatCard
            label="Total Amount"
            value={formatCurrency(totalAmount)}
            tone="neutral"
          />
          <StatCard
            label="Draft"
            value={String(draftCount)}
            tone="neutral"
          />
        </div>

        <section className="section-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-sm flex-1 min-w-[180px]">
              <span className="font-semibold text-slate-700">Search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoices"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
              />
            </label>
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </SelectField>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              <Icon name="refresh" className="text-[16px]" />
              Refresh
            </Button>
          </div>
        </section>

        <SectionCard
          title="All Invoices"
          description="Manage sales invoices and track payments."
          action={
            totalInvoices > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(totalInvoices, (page - 1) * perPage + 1)}-
                {Math.min(totalInvoices, page * perPage)} of {totalInvoices} invoice
                {totalInvoices === 1 ? "" : "s"}
              </Chip>
            ) : (
              <Button onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                New Invoice
              </Button>
            )
          }
        >
        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          error={null}
          caption="Invoices"
          emptyTitle="No invoices found"
          emptyDescription="There are no sales invoices to display."
          pagination={{
            page: Number(pagination.page || page),
            totalPages: Number(pagination.pages || 1),
            totalCount: Number(pagination.total_result || 0),
            perPage,
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
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                New Sales Invoice
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                <Icon name="close" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <SelectField
                label="Customer"
                value={form.contact_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_id: e.target.value }))
                }
              >
                <option value="">Select customer</option>
                {customerOptions.map(
                  (customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ),
                )}
              </SelectField>
              <SelectField
                label="Status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </SelectField>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Invoice Date</span>
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-4 py-2.5"
                  value={form.invoice_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoice_date: e.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Due Date</span>
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-4 py-2.5"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Currency</span>
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-2.5"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currency: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
            </div>

            {/* Invoice Lines */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-700 text-sm">
                  Invoice Lines
                </h4>
                <Button variant="secondary" size="sm" onClick={addLine}>
                  <Icon name="add" className="text-sm" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <label className="grid gap-1.5 text-sm flex-1">
                      <span className="font-semibold text-slate-700">
                        Description
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 px-4 py-2.5"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm w-24">
                      <span className="font-semibold text-slate-700">Qty</span>
                      <input
                        type="number"
                        className="rounded-2xl border border-slate-200 px-4 py-2.5"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, "quantity", Number(e.target.value))
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm w-28">
                      <span className="font-semibold text-slate-700">
                        Unit Price
                      </span>
                      <input
                        type="number"
                        className="rounded-2xl border border-slate-200 px-4 py-2.5"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(index, "unit_price", Number(e.target.value))
                        }
                      />
                    </label>
                    {form.lines.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeLine(index)}
                      >
                        <Icon name="delete" className="text-sm" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="grid gap-1.5 text-sm px-6 pb-6">
              <span className="font-semibold text-slate-700">Notes</span>
              <textarea
                className="rounded-2xl border border-slate-200 px-4 py-2.5"
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 sticky bottom-0 bg-white">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveInvoice()} disabled={saving}>
                {saving ? "Saving..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
