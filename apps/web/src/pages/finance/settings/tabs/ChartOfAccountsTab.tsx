import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { Chip, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableHeaderRow, TableRow } from "@/shared";

export default function ChartOfAccountsTab() {
  const { data, loading, error } = useCachedQuery(
    "finance:settings:chart-accounts",
    () => financeApi.listChartAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const accounts = Array.isArray((data as any)?.result)
    ? (data as any).result
    : [];

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-lg font-semibold text-slate-950">Chart of Accounts</h3>
      <p className="text-sm text-slate-500">Primary GL account structure.</p>

      {loading ? <p className="text-sm text-slate-500">Loading accounts...</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {accounts.length ? (
        <Table caption="Chart of accounts">
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {accounts.map((account: any) => (
              <TableRow key={account.id}>
                <TableCell className="font-mono">{account.code}</TableCell>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{String(account.type || "-")}</TableCell>
                <TableCell>{String(account.category || "-")}</TableCell>
                <TableCell>
                  <Chip variant={account.is_active ? "success" : "neutral"}>
                    {account.is_active ? "active" : "inactive"}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : !loading ? (
        <EmptyState title="No chart accounts" description="Chart accounts will appear here once configured." />
      ) : null}
    </div>
  );
}
