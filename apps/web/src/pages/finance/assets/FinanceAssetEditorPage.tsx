import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  useToast,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";

function asDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function FinanceAssetEditorPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

  const [saving, setSaving] = useState(false);
  const [disposing, setDisposing] = useState(false);

  const { data: assetData, loading: assetLoading, refetch } = useCachedQuery(
    `finance:asset:${id || "new"}`,
    () => (id ? financeApi.getAsset(id) : Promise.resolve(null as any)),
    { ttlMs: 30_000, storage: "memory" },
  );

  const asset = assetData as any;

  const [form, setForm] = useState({
    asset_id: "",
    organization_id: "",
    team_id: "",
    asset_description: "",
    category: "",
    serial_tag_no: "",
    location_project: "",
    assigned_to_user_id: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    supplier: "",
    purchase_cost: "",
    useful_life_years: "3",
    salvage_value: "0",
    condition: "good",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    if (!asset || isNew) return;
    setForm({
      asset_id: asset.asset_id || "",
      organization_id: asset.organization_id ? String(asset.organization_id) : "",
      team_id: asset.team_id ? String(asset.team_id) : "",
      asset_description: asset.asset_description || asset.asset_name || "",
      category: asset.category || "",
      serial_tag_no: asset.serial_tag_no || "",
      location_project: asset.location_project || asset.location || "",
      assigned_to_user_id: asset.assigned_to_user_id ? String(asset.assigned_to_user_id) : "",
      purchase_date: asDateInput(asset.purchase_date),
      supplier: asset.supplier || "",
      purchase_cost: String(asset.purchase_cost ?? ""),
      useful_life_years: String(asset.useful_life_years ?? 3),
      salvage_value: String(asset.salvage_value ?? 0),
      condition: asset.condition || "good",
      status: asset.status || "active",
      notes: asset.notes || "",
    });
  }, [asset, isNew]);

  const currentValue = Number(asset?.current_value ?? 0);

  const handleSave = async () => {
    if (!form.asset_description.trim() || !form.category.trim() || !form.purchase_date || !form.purchase_cost) {
      showToast({ tone: "warning", title: "Required fields missing", message: "Description, category, purchase date and purchase cost are required." });
      return;
    }

    const payload = {
      asset_id: form.asset_id || undefined,
      organization_id: form.organization_id || undefined,
      team_id: form.team_id || undefined,
      asset_description: form.asset_description.trim(),
      category: form.category.trim(),
      serial_tag_no: form.serial_tag_no || undefined,
      location_project: form.location_project || undefined,
      assigned_to_user_id: form.assigned_to_user_id || undefined,
      purchase_date: form.purchase_date,
      supplier: form.supplier || undefined,
      purchase_cost: Number(form.purchase_cost),
      useful_life_years: Number(form.useful_life_years || 3),
      salvage_value: Number(form.salvage_value || 0),
      condition: form.condition || undefined,
      status: form.status || undefined,
      notes: form.notes || undefined,
    };

    try {
      setSaving(true);
      if (isNew) {
        const created = await financeApi.createAsset(payload);
        showToast({ tone: "success", title: "Asset created", message: "Asset record created successfully." });
        navigate(`/finance/assets/${(created as any).id}`);
      } else {
        await financeApi.updateAsset(id!, payload);
        showToast({ tone: "success", title: "Asset updated", message: "Asset record updated successfully." });
        await refetch();
      }
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save asset." });
    } finally {
      setSaving(false);
    }
  };

  const handleDispose = async () => {
    if (!id) return;
    try {
      setDisposing(true);
      await financeApi.disposeAsset(id, {
        disposal_date: new Date().toISOString().slice(0, 10),
        disposal_method: "Retired",
        proceeds: 0,
        notes: "Disposed from asset editor",
      });
      showToast({ tone: "success", title: "Asset disposed", message: "Asset moved to disposed status." });
      await refetch();
    } catch (err) {
      showToast({ tone: "danger", title: "Dispose failed", message: err instanceof Error ? err.message : "Unable to dispose asset." });
    } finally {
      setDisposing(false);
    }
  };

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
          { label: isNew ? "New Asset" : "Asset Detail" },
        ]}
        title={isNew ? "New Asset" : (asset?.asset_description || "Asset Detail")}
        description={isNew ? "Create an asset register record." : "Update asset details, assignment and lifecycle status."}
        actions={<Button variant="secondary" onClick={() => navigate("/finance/assets")}>Back</Button>}
      />

      {!isNew && !asset && assetLoading ? <p className="text-sm text-slate-500">Loading asset...</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Purchase Cost" value={formatCurrency(Number(form.purchase_cost || 0), "NGN")} tone="neutral" />
        <StatCard label="Current Value" value={formatCurrency(currentValue, "NGN")} tone="success" />
        <StatCard
          label="Status"
          value={String(form.status || "active")}
          tone={form.status === "disposed" ? "danger" : form.status === "active" ? "success" : "pending"}
          hint={asset?.asset_id ? `Asset ID: ${asset.asset_id}` : "New record"}
        />
      </div>

      <SectionCard title="Asset Information">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Asset ID</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.asset_id} onChange={(e) => setForm((v) => ({ ...v, asset_id: e.target.value }))} placeholder="Auto if empty" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Category</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-semibold text-slate-700">Description</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.asset_description} onChange={(e) => setForm((v) => ({ ...v, asset_description: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Serial/Tag No</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.serial_tag_no} onChange={(e) => setForm((v) => ({ ...v, serial_tag_no: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Supplier</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.supplier} onChange={(e) => setForm((v) => ({ ...v, supplier: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Location / Project</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.location_project} onChange={(e) => setForm((v) => ({ ...v, location_project: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Assigned To User ID</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.assigned_to_user_id} onChange={(e) => setForm((v) => ({ ...v, assigned_to_user_id: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Purchase Date</span><input type="date" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.purchase_date} onChange={(e) => setForm((v) => ({ ...v, purchase_date: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Purchase Cost</span><input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.purchase_cost} onChange={(e) => setForm((v) => ({ ...v, purchase_cost: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Useful Life (Years)</span><input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.useful_life_years} onChange={(e) => setForm((v) => ({ ...v, useful_life_years: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Salvage Value</span><input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.salvage_value} onChange={(e) => setForm((v) => ({ ...v, salvage_value: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Condition</span><input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.condition} onChange={(e) => setForm((v) => ({ ...v, condition: e.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-slate-700">Status</span><select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}><option value="active">active</option><option value="maintenance">maintenance</option><option value="disposed">disposed</option></select></label>
          <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-semibold text-slate-700">Notes</span><textarea className="rounded-2xl border border-slate-200 px-4 py-2.5" rows={3} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {!isNew ? (
            <Button variant="danger" onClick={() => void handleDispose()} disabled={disposing || form.status === "disposed"}>
              {disposing ? "Disposing..." : "Dispose Asset"}
            </Button>
          ) : null}
          <Button onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : isNew ? "Create Asset" : "Save Changes"}</Button>
        </div>
      </SectionCard>

      {!isNew && asset?.disposal_method ? (
        <SectionCard title="Disposal Info">
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div><span className="font-semibold">Disposed At:</span> {asDateInput(asset.disposed_at)}</div>
            <div><span className="font-semibold">Method:</span> {asset.disposal_method || "-"}</div>
            <div><span className="font-semibold">Proceeds:</span> {formatCurrency(Number(asset.disposal_proceeds || 0), "NGN")}</div>
          </div>
          <div className="mt-3"><Chip variant="danger">disposed</Chip></div>
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
