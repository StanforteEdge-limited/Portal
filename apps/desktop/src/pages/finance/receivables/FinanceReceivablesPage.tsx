import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  DataTable,
  TextField,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import type { FinanceInvoiceRecord } from "@stanforte/shared";

function asMoney(value: unknown, currency = "NGN") {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

function asDate(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

export default function FinanceReceivablesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeInvoiceId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceId = routeInvoiceId || searchParams.get("id");

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const query = useMemo(
    () => ({
      status: status !== "all" ? status : undefined,
      q: search.trim() || undefined,
    }),
    [status, search],
  );

  const { data: rowsData, loading, error } = useCachedQuery(
    `finance:receivables:${JSON.stringify(query)}`,
    () => financeApi.listSalesInvoices(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const rows = Array.isArray(rowsData) ? rowsData : [];

  const { data: invoiceData } = useCachedQuery(
    `finance:receivable:${invoiceId}`,
    () => financeApi.getSalesInvoice(invoiceId!),
    { ttlMs: 60_000, storage: "memory" },
  );
  const invoice = invoiceData as FinanceInvoiceRecord | undefined;

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.invoiced += Number(row.total_amount || 0);
        acc.paid += Number(row.paid_amount || 0);
        acc.outstanding += Number(row.outstanding_amount || 0);
        return acc;
      },
      { invoiced: 0, paid: 0, outstanding: 0 },
    );
  }, [rows]);

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  if (invoiceId && invoice) {
    return (
      <AppShell
        navigation={buildRequestsNavigation()}
        activeLabel="finance-receivables"
        user={{ name: userName, role: "Finance" }}
        mobileNav={buildAppMobileNav("Finance")}
      >
        <PageHeader
          eyebrow="Finance"
          breadcrumbs={[
            { label: "Finance", path: "/finance" },
            { label: "Receivables", path: "/finance/receivables" },
            { label: invoice.invoice_number || invoiceId.slice(0, 8) },
          ]}
          title="Invoice Details"
          actions={<Button variant="secondary" onClick={() => navigate("/finance/receivables")}>Back to List</Button>}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Amount" value={asMoney(invoice.total_amount)} tone="neutral" />
          <StatCard label="Paid" value={asMoney(invoice.paid_amount)} tone="success" />
          <StatCard label="Outstanding" value={asMoney(invoice.outstanding_amount)} tone="warning" />
          <StatCard
            label="Status"
            value={String(invoice.status || "draft")}
            tone={invoice.status === "paid" ? "success" : invoice.status === "overdue" ? "danger" : "pending"}
          />
        </div>

        <SectionCard title="Invoice Information">
          <DataTable
            columns={[
              { header: "Field", className: "w-40 font-medium text-slate-500", cell: (r) => r.field },
              { header: "Value", cell: (r) => r.value },
            ]}
            data={[
              { field: "Invoice Number", value: <span className="font-semibold">{invoice.invoice_number || "-"}</span> },
              { field: "Customer", value: <span className="font-semibold">{invoice.customer_name || "-"}</span> },
              { field: "Issue Date", value: asDate(invoice.issue_date) },
              { field: "Due Date", value: asDate(invoice.due_date) },
              { field: "Currency", value: invoice.currency || "NGN" },
              {
                field: "Status", value: (
                  <Chip
                    variant={
                      invoice.status === "paid"
                        ? "success"
                        : invoice.status === "overdue"
                          ? "danger"
                          : invoice.status === "sent"
                            ? "pending"
                            : "neutral"
                    }
                  >
                    {invoice.status || "draft"}
                  </Chip>
                )
              },
            ]}
          />
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-receivables"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Receivables" }]}
        title="Receivables"
        description="Track invoices, collection progress, and outstanding balances."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Invoiced" value={asMoney(stats.invoiced)} tone="neutral" />
        <StatCard label="Collected" value={asMoney(stats.paid)} tone="success" />
        <StatCard label="Outstanding" value={asMoney(stats.outstanding)} tone="warning" />
      </div>

      <SectionCard title="Filters">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </SelectField>
          <TextField
            label="Search"
            placeholder="Invoice number or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Customer Invoices" description="Aging and follow-up ready list.">
        {loading ? <p className="text-sm text-slate-500">Loading invoices...</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {rows.length ? (
          <DataTable
            columns={[
              { header: "Invoice", cell: (row) => row.invoice_number || row.id.slice(0, 8) },
              { header: "Customer", cell: (row) => row.customer_name || "-" },
              { header: "Issue Date", cell: (row) => asDate(row.issue_date) },
              { header: "Due Date", cell: (row) => asDate(row.due_date) },
              {
                header: "Status", cell: (row) => {
                  const statusKey = String(row.status || "draft").toLowerCase();
                  return (
                    <Chip variant={statusKey === "paid" ? "success" : statusKey === "overdue" ? "danger" : "pending"}>
                      {statusKey}
                    </Chip>
                  );
                }
              },
              { header: "Outstanding", className: "text-right", cell: (row) => asMoney(row.outstanding_amount, String(row.currency || "NGN")) },
            ]}
            data={rows}
            onRowClick={(row) => navigate(`/finance/receivables/${row.id}`)}
          />
        ) : !loading ? (
          <EmptyState title="No receivables" description="Customer invoices will appear here once created." />
        ) : null}
      </SectionCard>
    </AppShell>
  );
}
