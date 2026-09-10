import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { Chip, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableHeaderRow, TableRow } from "@/shared";

export default function ReportingPeriodsTab() {
  const { data, loading, error } = useCachedQuery(
    "finance:settings:reporting-periods",
    () => financeApi.listReportingPeriods(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const periods = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-lg font-semibold text-slate-950">Reporting Periods</h3>
      <p className="text-sm text-slate-500">Period governance and close/reopen readiness.</p>

      {loading ? <p className="text-sm text-slate-500">Loading periods...</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {periods.length ? (
        <Table caption="Reporting periods">
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Year</TableHeaderCell>
              <TableHeaderCell>Month</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell>{period.label || `${period.year}-${period.month ?? ""}`}</TableCell>
                <TableCell>{period.year}</TableCell>
                <TableCell>{period.month ?? "-"}</TableCell>
                <TableCell>
                  <Chip variant={String(period.status || "").toLowerCase() === "closed" ? "danger" : "success"}>
                    {String(period.status || "open")}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : !loading ? (
        <EmptyState title="No reporting periods" description="Set up periods for reporting and close cycles." />
      ) : null}
    </div>
  );
}
