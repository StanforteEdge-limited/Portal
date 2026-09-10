import {
  AppShell,
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
import { Link } from "react-router-dom";

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

export default function FinanceReportsPage() {
  const { user } = useAuth();

  const { data: executiveData } = useCachedQuery(
    "finance:reports:executive",
    () => financeApi.getExecutiveSummary(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: profitLossData } = useCachedQuery(
    "finance:reports:profit-loss",
    () => financeApi.getProfitLoss(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: balancesData } = useCachedQuery(
    "finance:reports:balances",
    () => financeApi.getBalancesReport(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: receivablesData } = useCachedQuery(
    "finance:reports:receivables",
    () => financeApi.getReceivablesReport(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: payablesData } = useCachedQuery(
    "finance:reports:payables",
    () => financeApi.getPayablesReport(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: budgetVsActualData } = useCachedQuery(
    "finance:reports:budget-vs-actual",
    () => financeApi.getBudgetVsActualReport(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: grantUtilizationData } = useCachedQuery(
    "finance:reports:grant-utilization",
    () => financeApi.getGrantUtilizationReport(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const executive = executiveData ?? {};
  const profitLoss = profitLossData ?? {};
  const balances = balancesData ?? {};
  const receivables = receivablesData ?? {};
  const payables = payablesData ?? {};
  const budgetVsActual = budgetVsActualData ?? {};
  const grantUtilization = grantUtilizationData ?? {};

  const cards = [
    {
      label: "Net Position",
      value: pickNumber(profitLoss, ["net_surplus", "net_income", "net", "amount"]),
      tone: "success" as const,
    },
    {
      label: "Receivables",
      value: pickNumber(receivables, ["total_outstanding", "outstanding", "balance"]),
      tone: "warning" as const,
    },
    {
      label: "Payables",
      value: pickNumber(payables, ["total_outstanding", "outstanding", "balance"]),
      tone: "danger" as const,
    },
    {
      label: "Cash Balance",
      value: pickNumber(balances, ["cash", "cash_balance", "closing_balance"]),
      tone: "neutral" as const,
    },
  ];

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-reports"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Reports" }]}
        title="Reports"
        description="Financial snapshots and key metrics for informed decision-making."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(card.value)} tone={card.tone} />
        ))}
      </div>

      <SectionCard title="Report Snapshots" description="Current output from core finance reporting endpoints.">
        <Table caption="Report snapshots">
          <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Report</TableHeaderCell>
                <TableHeaderCell>Key Metric</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Activities</TableCell>
                <TableCell>{String(executive.summary_title || executive.title || "Ready")}</TableCell>
                <TableCell>/finance/reports/income-summary + /expense-summary</TableCell>
                <TableCell className="text-right">
                  <Link to="/finance/reports/activities" className="text-sm font-semibold text-brand-700 hover:underline">Open</Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Position</TableCell>
                <TableCell>{String(balances.period_label || balances.label || "Current position")}</TableCell>
                <TableCell>/finance/reports/balances</TableCell>
                <TableCell className="text-right">
                  <Link to="/finance/reports/position" className="text-sm font-semibold text-brand-700 hover:underline">Open</Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Budget vs Actual</TableCell>
                <TableCell>{String(budgetVsActual.period_label || budgetVsActual.label || "Current budget")}</TableCell>
                <TableCell>/finance/reports/budget-vs-actual</TableCell>
                <TableCell className="text-right">
                  <Link to="/finance/reports/budget-vs-actual" className="text-sm font-semibold text-brand-700 hover:underline">Open</Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Aged Receivables</TableCell>
                <TableCell>{String(receivables.bucket_label || receivables.label || "Aging view")}</TableCell>
                <TableCell>/finance/reports/receivables</TableCell>
                <TableCell className="text-right">
                  <Link to="/finance/reports/aged-receivables" className="text-sm font-semibold text-brand-700 hover:underline">Open</Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Grant Utilization</TableCell>
                <TableCell>{String(grantUtilization.bucket_label || grantUtilization.label || "Grant view")}</TableCell>
                <TableCell>/finance/reports/grant-utilization</TableCell>
                <TableCell className="text-right">
                  <Link to="/finance/reports/grant-utilization" className="text-sm font-semibold text-brand-700 hover:underline">Open</Link>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
      </SectionCard>

      {!Object.keys(executive).length ? (
        <SectionCard title="Report Status">
          <EmptyState title="Waiting for report data" description="Run or seed finance transactions so report cards show full data." />
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
