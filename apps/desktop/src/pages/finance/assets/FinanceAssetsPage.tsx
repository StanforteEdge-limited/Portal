import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  SelectField,
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
import type { FinanceAssetRecord } from "@stanforte/shared";

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

export default function FinanceAssetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [queryText, setQueryText] = useState("");

  const query = useMemo(
    () => ({
      status: status !== "all" ? status : undefined,
      q: queryText.trim() || undefined,
    }),
    [status, queryText],
  );

  const { data: assetsData, loading, error } = useCachedQuery(
    `finance:assets:${JSON.stringify(query)}`,
    () => financeApi.listAssets(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const assets = Array.isArray(assetsData) ? assetsData : [];

  const { data: disposalsData } = useCachedQuery(
    "finance:assets:disposals",
    () => financeApi.listAssetDisposals(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const disposals = Array.isArray(disposalsData) ? disposalsData : [];

  const stats = useMemo(() => {
    const totalCost = assets.reduce((sum, asset) => sum + Number(asset.purchase_cost || 0), 0);
    const totalValue = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    return { totalCost, totalValue, disposalCount: disposals.length };
  }, [assets, disposals]);

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
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Assets" }]}
        title="Asset Register"
        description="Monitor assets, values, and disposal history from one operational view."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/finance/assets/disposals")}>Disposals</Button>
            <Button onClick={() => navigate("/finance/assets/new")}>New Asset</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Asset Cost" value={asMoney(stats.totalCost)} tone="neutral" />
        <StatCard label="Current Value" value={asMoney(stats.totalValue)} tone="success" />
        <StatCard label="Disposals" value={String(stats.disposalCount)} tone="warning" />
      </div>

      <SectionCard title="Filters">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disposed">Disposed</option>
            <option value="maintenance">Maintenance</option>
          </SelectField>
          <TextField label="Search" placeholder="Asset code, name, location" value={queryText} onChange={(e) => setQueryText(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Assets" description="Register of tracked finance assets.">
        {loading ? <p className="text-sm text-slate-500">Loading assets...</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {assets.length ? (
          <Table caption="Assets">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Asset</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Purchase Date</TableHeaderCell>
                <TableHeaderCell className="text-right">Purchase Cost</TableHeaderCell>
                <TableHeaderCell className="text-right">Current Value</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {assets.map((asset: FinanceAssetRecord) => {
                const statusKey = String(asset.status || "active").toLowerCase();
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                        onClick={() => navigate(`/finance/assets/${asset.id}`)}
                      >
                        {asset.asset_name || asset.asset_description || asset.asset_code || asset.id.slice(0, 8)}
                      </button>
                    </TableCell>
                    <TableCell>{asset.category || "-"}</TableCell>
                    <TableCell>
                      <Chip variant={statusKey === "active" ? "success" : statusKey === "disposed" ? "danger" : "pending"}>
                        {statusKey}
                      </Chip>
                    </TableCell>
                    <TableCell>{asDate(asset.purchase_date)}</TableCell>
                    <TableCell className="text-right">{asMoney(asset.purchase_cost, String(asset.currency || "NGN"))}</TableCell>
                    <TableCell className="text-right">{asMoney(asset.current_value, String(asset.currency || "NGN"))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : !loading ? (
          <EmptyState title="No assets" description="Assets will appear here once they are recorded." />
        ) : null}
      </SectionCard>

      <SectionCard title="Recent Disposals" description="Latest disposal activity for governance and audit.">
        {disposals.length ? (
          <Table caption="Asset disposals">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Asset</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Disposed On</TableHeaderCell>
                <TableHeaderCell className="text-right">Value</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {disposals.slice(0, 6).map((asset: FinanceAssetRecord) => (
                <TableRow key={`dispose-${asset.id}`}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                      onClick={() => navigate(`/finance/assets/${asset.id}`)}
                    >
                      {asset.asset_name || asset.asset_description || asset.asset_code || asset.id.slice(0, 8)}
                    </button>
                  </TableCell>
                  <TableCell><Chip variant="danger">disposed</Chip></TableCell>
                  <TableCell>{asDate((asset as Record<string, unknown>).disposed_at)}</TableCell>
                  <TableCell className="text-right">{asMoney(asset.current_value, String(asset.currency || "NGN"))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No disposals yet" description="Disposed assets will be listed here." />
        )}
      </SectionCard>
    </AppShell>
  );
}
