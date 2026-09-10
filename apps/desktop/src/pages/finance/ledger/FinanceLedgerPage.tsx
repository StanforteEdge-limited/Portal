import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  PaginationControls,
  SectionCard,
  SelectField,
  StatCard,
  TextField,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { downloadBase64File } from "@/shared/lib/download";
import { formatCurrency } from "@stanforte/shared";
import type { FinanceLedgerEntry } from "@stanforte/shared";

function dateText(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

function money(value: unknown, currency = "NGN") {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

export default function FinanceLedgerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [from, to, accountId, search, perPage]);

  const query = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      account_id: accountId !== "all" ? accountId : undefined,
      q: search.trim() || undefined,
      page,
      per_page: perPage,
    }),
    [from, to, accountId, search, page, perPage],
  );

  const { data: ledgerPayload, loading, error } = useCachedQuery(
    `finance:ledger:${JSON.stringify(query)}`,
    () => financeApi.listLedgerPaged(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const rows = Array.isArray(ledgerPayload?.result) ? ledgerPayload.result : [];
  const ledgerPage = Number(ledgerPayload?.page || page);
  const ledgerPerPage = Number(ledgerPayload?.per_page || perPage);
  const ledgerTotal = Number(ledgerPayload?.total || 0);
  const ledgerPages = Number(ledgerPayload?.pages || 1);
  const ledgerRangeStart = ledgerTotal > 0 ? (ledgerPage - 1) * ledgerPerPage + 1 : 0;
  const ledgerRangeEnd = ledgerTotal > 0 ? ledgerRangeStart + rows.length - 1 : 0;

  const { data: accountsData } = useCachedQuery(
    "finance:ledger:accounts",
    () => financeApi.listAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const accounts = Array.isArray(accountsData) ? accountsData : [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc: any, row: any) => {
        const direction = String(row.direction || "").toLowerCase();
        const amount = Number(row.amount || 0);
        if (direction === "in") acc.inflow += amount;
        else if (direction === "out") acc.outflow += amount;
        acc.net += direction === "out" ? -amount : amount;
        return acc;
      },
      { inflow: 0, outflow: 0, net: 0 },
    );
  }, [rows]);

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  async function handleExportLedger() {
    try {
      setExporting(true);
      const file = await financeApi.exportLedger({
        from: from || undefined,
        to: to || undefined,
        account_id: accountId !== "all" ? accountId : undefined,
        q: search.trim() || undefined,
      });
      downloadBase64File(file.file_name, file.mime_type, file.content_base64);
      showToast({ tone: "success", title: "Ledger exported", message: "Your ledger CSV has been downloaded." });
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Export failed",
        message: err instanceof Error ? err.message : "Unable to export ledger right now.",
      });
    } finally {
      setExporting(false);
    }
  }

  const columns: ColumnDef<FinanceLedgerEntry>[] = useMemo(() => [
    {
      header: "Date",
      cell: (row) => dateText(row.entry_date || row.date)
    },
    {
      header: "Reference",
      cell: (row) => String(row.reference || row.id).slice(0, 36)
    },
    {
      header: "Account",
      cell: (row) => String(row.account_name || "-")
    },
    {
      header: "Source",
      cell: (row) => String(row.source_type || "-")
    },
    {
      header: "Direction",
      cell: (row) => {
        const direction = String(row.direction || "-").toLowerCase();
        return (
          <Chip variant={direction === "in" ? "success" : direction === "out" ? "warning" : "neutral"}>
            {direction === "in" ? "Inflow" : direction === "out" ? "Outflow" : direction}
          </Chip>
        );
      }
    },
    {
      header: "Amount",
      cell: (row) => formatCurrency(Number(row.amount || 0), row.currency || "NGN"),
      className: "text-right font-medium text-slate-900"
    }
  ], []);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-ledger"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Ledger" }]}
        title="General Ledger"
        description="Review transaction movements and account activity with audit-ready clarity."
        actions={
          <Button variant="secondary" disabled={exporting} onClick={() => void handleExportLedger()}>
            {exporting ? "Exporting..." : "Export Ledger"}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Inflow" value={money(totals.inflow)} tone="success" />
        <StatCard label="Outflow" value={money(totals.outflow)} tone="warning" />
        <StatCard label="Net Movement" value={money(totals.net)} tone={totals.net >= 0 ? "success" : "danger"} />
      </div>

      <SectionCard title="Filters" description="Narrow entries by date, account, and reference.">
        <div className="grid gap-4 md:grid-cols-4">
          <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <SelectField label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code ? `${account.code} - ${account.name}` : account.name}
              </option>
            ))}
          </SelectField>
          <TextField label="Search" placeholder="Ref, memo, source" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard
          title="Ledger Entries"
          description="Chronological transaction view for finance operations."
          action={
            ledgerTotal > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(ledgerTotal, (ledgerPage - 1) * ledgerPerPage + 1)}-
                {Math.min(ledgerTotal, ledgerPage * ledgerPerPage)} of {ledgerTotal} entr
                {ledgerTotal === 1 ? "y" : "ies"}
              </Chip>
            ) : undefined
          }
        >
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          caption="Finance Ledger"
          emptyTitle="No ledger entries"
          emptyDescription="Transactions will appear here once finance entries are posted."
          pagination={{
            page: ledgerPage,
            totalPages: ledgerPages,
            totalCount: ledgerTotal,
            perPage: ledgerPerPage,
            onPageChange: setPage,
            onPerPageChange: (value) => {
              setPerPage(value);
              setPage(1);
            },
          }}
        />
      </SectionCard>
    </AppShell>
  );
}
