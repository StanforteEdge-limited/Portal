import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";

function money(value: unknown, currency = "NGN") {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

function dateText(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

export default function FinanceAccountDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: account, loading: accountLoading, error: accountError } = useCachedQuery(
    `finance:account:${id}`,
    () => financeApi.getAccount(id!),
    { ttlMs: 30_000, storage: "memory" },
  );

  const { data: ledgerData, loading: ledgerLoading, error: ledgerError } = useCachedQuery(
    `finance:account:${id}:ledger`,
    () => financeApi.listLedger({ account_id: id, limit: 200 }),
    { ttlMs: 30_000, storage: "memory" },
  );

  const rows = Array.isArray(ledgerData) ? ledgerData : [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row: any) => {
        const direction = String(row.direction || "").toLowerCase();
        const amount = Number(row.amount || 0);
        if (direction === "in") acc.inflow += amount;
        if (direction === "out") acc.outflow += amount;
        acc.net += direction === "out" ? -amount : amount;
        return acc;
      },
      { inflow: 0, outflow: 0, net: 0 },
    );
  }, [rows]);

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";
  const accountCurrency = String((account as any)?.currency || "NGN");

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-accounts"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Accounts", path: "/finance/accounts" },
          { label: String((account as any)?.name || "Account") },
        ]}
        title={String((account as any)?.name || "Account Ledger")}
        description="Account details and transaction movements."
        actions={
          <Button variant="secondary" onClick={() => navigate("/finance/accounts")}>Back</Button>
        }
      />

      {accountLoading ? <p className="text-sm text-slate-500">Loading account...</p> : null}
      {accountError ? <p className="text-sm text-danger">{accountError}</p> : null}

      {account ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Opening Balance" value={money((account as any).opening_balance, accountCurrency)} tone="neutral" />
            <StatCard label="Current Balance" value={money((account as any).current_balance, accountCurrency)} tone="success" />
            <StatCard label="Inflow" value={money(totals.inflow, accountCurrency)} tone="success" />
            <StatCard label="Outflow" value={money(totals.outflow, accountCurrency)} tone="warning" />
          </div>

          <SectionCard title="Account Info">
            <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-700">
              <div><span className="font-semibold">Code:</span> {(account as any).code || "-"}</div>
              <div><span className="font-semibold">Type:</span> {(account as any).account_type || "-"}</div>
              <div><span className="font-semibold">Bank:</span> {(account as any).bank_name || "-"}</div>
              <div><span className="font-semibold">Account Number:</span> {(account as any).account_number || "-"}</div>
              <div><span className="font-semibold">Currency:</span> {accountCurrency}</div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                <Chip variant={(account as any).is_active ? "success" : "neutral"}>
                  {(account as any).is_active ? "Active" : "Inactive"}
                </Chip>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ledger Activity" description="Recent account transactions.">
            {ledgerLoading ? <p className="text-sm text-slate-500">Loading ledger...</p> : null}
            {ledgerError ? <p className="text-sm text-danger">{ledgerError}</p> : null}

            {rows.length ? (
              <Table caption="Account ledger entries">
                <TableHead>
                  <TableHeaderRow>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Reference</TableHeaderCell>
                    <TableHeaderCell>Source</TableHeaderCell>
                    <TableHeaderCell>Direction</TableHeaderCell>
                    <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                  </TableHeaderRow>
                </TableHead>
                <TableBody>
                  {rows.map((row: any) => {
                    const direction = String(row.direction || "-").toLowerCase();
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{dateText(row.entry_date || row.date)}</TableCell>
                        <TableCell>{String(row.reference || row.id).slice(0, 40)}</TableCell>
                        <TableCell>{String(row.source_type || "-")}</TableCell>
                        <TableCell>
                          <Chip variant={direction === "in" ? "success" : direction === "out" ? "warning" : "neutral"}>
                            {direction}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-right">{money(row.amount, accountCurrency)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : !ledgerLoading ? (
              <EmptyState title="No ledger entries" description="Transactions for this account will appear here." />
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </AppShell>
  );
}
