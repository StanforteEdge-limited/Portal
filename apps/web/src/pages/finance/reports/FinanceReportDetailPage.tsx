import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppShell,
  Button,
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

const REPORT_MAP: Record<string, { title: string; description: string; fetcher: () => Promise<any> }> = {
  "activities": {
    title: "Activities Report",
    description: "Income and expense activity summary.",
    fetcher: async () => {
      const [income, expense] = await Promise.all([
        financeApi.getIncomeSummary(),
        financeApi.getExpenseSummary(),
      ]);
      return { income_summary: income, expense_summary: expense };
    },
  },
  "position": {
    title: "Financial Position",
    description: "Balance position across accounts and cash.",
    fetcher: () => financeApi.getBalancesReport(),
  },
  "budget-vs-actual": {
    title: "Budget vs Actual",
    description: "Budget execution and variance report.",
    fetcher: () => financeApi.getBudgetVsActualReport(),
  },
  "grant-utilization": {
    title: "Grant Utilization",
    description: "Grant spending and utilization metrics.",
    fetcher: () => financeApi.getGrantUtilizationReport(),
  },
  "aged-receivables": {
    title: "Aged Receivables",
    description: "Receivables aging buckets and outstanding balances.",
    fetcher: () => financeApi.getReceivablesReport(),
  },
};

function asNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function flattenObject(input: Record<string, unknown>, prefix = ""): Array<{ key: string; value: unknown }> {
  const rows: Array<{ key: string; value: unknown }> = [];
  Object.entries(input).forEach(([rawKey, rawValue]) => {
    const key = prefix ? `${prefix}.${rawKey}` : rawKey;
    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      rows.push(...flattenObject(rawValue as Record<string, unknown>, key));
      return;
    }
    rows.push({ key, value: rawValue });
  });
  return rows;
}

export default function FinanceReportDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reportKey = "" } = useParams<{ reportKey: string }>();

  const report = REPORT_MAP[reportKey];

  const { data, loading, error } = useCachedQuery(
    `finance:report:${reportKey}`,
    () => (report ? report.fetcher() : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" },
  );

  const rows = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return flattenObject(data as Record<string, unknown>);
  }, [data]);

  const moneyRows = rows.filter((row) => /amount|balance|total|variance|cash|outstanding/i.test(row.key));

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  if (!report) {
    return (
      <AppShell
        navigation={buildRequestsNavigation()}
        activeLabel="finance-reports"
        user={{ name: userName, role: "Finance" }}
        mobileNav={buildAppMobileNav("Finance")}
      >
        <PageHeader
          eyebrow="Finance"
          breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Reports", path: "/finance/reports" }, { label: "Not Found" }]}
          title="Report not found"
          actions={<Button variant="secondary" onClick={() => navigate("/finance/reports")}>Back</Button>}
        />
        <SectionCard title="Unavailable">
          <EmptyState title="Unknown report" description="Use one of the available finance report routes." />
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-reports"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Reports", path: "/finance/reports" }, { label: report.title }]}
        title={report.title}
        description={report.description}
        actions={<Button variant="secondary" onClick={() => navigate("/finance/reports")}>Back</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Metrics" value={String(rows.length)} tone="neutral" />
        <StatCard label="Monetary Fields" value={String(moneyRows.length)} tone="neutral" />
        <StatCard label="Report Key" value={reportKey} tone="success" />
      </div>

      <SectionCard title="Snapshot" description="Flattened output from finance report endpoint.">
        {loading ? <p className="text-sm text-slate-500">Loading report...</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {rows.length ? (
          <Table caption="Report data">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Field</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const num = asNumber(row.value);
                const looksMonetary = /amount|balance|total|variance|cash|outstanding/i.test(row.key);
                const value = num != null
                  ? looksMonetary
                    ? formatCurrency(num)
                    : num.toLocaleString()
                  : String(row.value ?? "-");
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-slate-700">{row.key}</TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : !loading ? (
          <EmptyState title="No report data" description="This report returned an empty payload." />
        ) : null}
      </SectionCard>
    </AppShell>
  );
}
