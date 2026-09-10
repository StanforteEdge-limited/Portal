import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  Icon,
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
  TextField,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";

function asDate(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

export default function FinanceAssetDisposalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const query = useMemo(() => ({ q: search.trim() || undefined }), [search]);

  const { data: disposalsData, loading, error } = useCachedQuery(
    `finance:assets:disposals:${JSON.stringify(query)}`,
    () => financeApi.listAssetDisposals(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const rows = Array.isArray(disposalsData) ? disposalsData : [];

  const totalCurrentValue = rows.reduce(
    (sum, row: any) => sum + Number(row.current_value || 0),
    0,
  );
  const totalProceeds = rows.reduce(
    (sum, row: any) => sum + Number(row.disposal_proceeds || row.proceeds || 0),
    0,
  );

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-assets"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Assets", path: "/finance/assets" },
          { label: "Disposals" },
        ]}
        title="Asset Disposals"
        description="Track disposed assets for audit and reporting."
        actions={<Button variant="secondary" onClick={() => navigate("/finance/assets")}>Back to Assets</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Disposed Assets" value={String(rows.length)} tone="danger" />
        <StatCard label="Disposed Value" value={formatCurrency(totalCurrentValue)} tone="warning" />
        <StatCard label="Total Proceeds" value={formatCurrency(totalProceeds)} tone="success" />
      </div>

      <SectionCard title="Filter">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Search" placeholder="Asset ID, description, method" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Disposal Register" description="Chronological log of asset disposal events.">
        {loading ? <p className="text-sm text-slate-500">Loading disposals...</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {rows.length ? (
          <Table caption="Asset disposals">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Asset</TableHeaderCell>
                <TableHeaderCell>Disposed On</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell className="text-right">Book Value</TableHeaderCell>
                <TableHeaderCell className="text-right">Proceeds</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {rows.map((asset: any) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                      onClick={() => navigate(`/finance/assets/${asset.id}`)}
                    >
                      {asset.asset_description || asset.asset_name || asset.asset_id || asset.id.slice(0, 8)}
                    </button>
                  </TableCell>
                  <TableCell>{asDate(asset.disposed_at || asset.disposal_date)}</TableCell>
                  <TableCell>{asset.disposal_method || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(asset.current_value || 0), asset.currency || "NGN")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(asset.disposal_proceeds || asset.proceeds || 0), asset.currency || "NGN")}</TableCell>
                  <TableCell><Chip variant="danger">disposed</Chip></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : !loading ? (
          <EmptyState title="No disposals yet" description="Disposed assets will appear here." />
        ) : null}
      </SectionCard>
    </AppShell>
  );
}
